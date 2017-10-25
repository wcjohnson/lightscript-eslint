var babylonToEspree = require("./babylon-to-espree");
var Module          = require("module");
var path            = require("path");
var jsParse         = require("babylon").parse;
var babel           = require("babel-core");
var t               = require("babel-types");
var tt              = require("babylon").tokTypes;
var traverse        = require("babel-traverse").default;
var codeFrame       = require("babel-code-frame");

var lscPlugin       = require("@oigroup/babel-plugin-lightscript");
var lscTooling      = require("@oigroup/babel-plugin-lightscript/lib/tooling");

var lightScriptDisabledRulesTable = {
  "no-unexpected-multiline": true,
  "no-else-return": true
};

var hasPatched = false;
var eslintOptions = {};

function getModules() {
  try {
    // avoid importing a local copy of eslint, try to find a peer dependency
    var eslintLoc = Module._resolveFilename("eslint", module.parent);
  } catch (err) {
    try {
      // avoids breaking in jest where module.parent is undefined
      eslintLoc = require.resolve("eslint");
    } catch (err) {
      throw new ReferenceError("couldn't resolve eslint");
    }
  }

  // get modules relative to what eslint will load
  var eslintMod = new Module(eslintLoc);
  eslintMod.filename = eslintLoc;
  eslintMod.paths = Module._nodeModulePaths(path.dirname(eslintLoc));

  try {
    var escope = eslintMod.require("eslint-scope");
    var Definition = eslintMod.require("eslint-scope/lib/definition").Definition;
    var referencer = eslintMod.require("eslint-scope/lib/referencer");
  } catch (err) {
    escope  = eslintMod.require("escope");
    Definition = eslintMod.require("escope/lib/definition").Definition;
    referencer = eslintMod.require("escope/lib/referencer");
  }

  var estraverse = eslintMod.require("estraverse");

  if (referencer.__esModule) referencer = referencer.default;

  return {
    eslintMod,
    Definition,
    escope,
    estraverse,
    referencer,
  };
}

function monkeypatch(modules) {
  var eslintMod = modules.eslintMod;
  var Definition = modules.Definition;
  var escope = modules.escope;
  var estraverse = modules.estraverse;
  var referencer = modules.referencer;

  Object.assign(estraverse.VisitorKeys, t.VISITOR_KEYS);
  estraverse.VisitorKeys.MethodDefinition.push("decorators");
  estraverse.VisitorKeys.Property.push("decorators");

  var analyze = escope.analyze;
  escope.analyze = function (ast, opts) {
    opts.ecmaVersion = eslintOptions.ecmaVersion;
    opts.sourceType = eslintOptions.sourceType;
    if (eslintOptions.globalReturn !== undefined) {
      opts.nodejsScope = eslintOptions.globalReturn;
    }

    var results = analyze.call(this, ast, opts);
    return results;
  };

  // if there are decorators, then visit each
  function visitDecorators(node) {
    if (!node.decorators) {
      return;
    }
    for (var i = 0; i < node.decorators.length; i++) {
      if (node.decorators[i].expression) {
        this.visit(node.decorators[i]);
      }
    }
  }

  // iterate through part of t.VISITOR_KEYS
  var flowFlippedAliasKeys = t.FLIPPED_ALIAS_KEYS.Flow.concat([
    "ArrayPattern",
    "ClassDeclaration",
    "ClassExpression",
    "FunctionDeclaration",
    "FunctionExpression",
    "Identifier",
    "ObjectPattern",
    "RestElement"
  ]);
  var visitorKeysMap = Object.keys(t.VISITOR_KEYS).reduce(function(acc, key) {
    var value = t.VISITOR_KEYS[key];
    if (flowFlippedAliasKeys.indexOf(value) === -1) {
      acc[key] = value;
    }
    return acc;
  }, {});

  var propertyTypes = {
    // loops
    callProperties: { type: "loop", values: ["value"] },
    indexers: { type: "loop", values: ["key", "value"] },
    properties: { type: "loop", values: ["argument", "value"] },
    types: { type: "loop" },
    params: { type: "loop" },
    // single property
    argument: { type: "single" },
    elementType: { type: "single" },
    qualification: { type: "single" },
    rest: { type: "single" },
    returnType: { type: "single" },
    // others
    typeAnnotation: { type: "typeAnnotation" },
    typeParameters: { type: "typeParameters" },
    id: { type: "id" }
  };

  function visitTypeAnnotation(node) {
    // get property to check (params, id, etc...)
    var visitorValues = visitorKeysMap[node.type];
    if (!visitorValues) {
      return;
    }

    // can have multiple properties
    for (var i = 0; i < visitorValues.length; i++) {
      var visitorValue = visitorValues[i];
      var propertyType = propertyTypes[visitorValue];
      var nodeProperty = node[visitorValue];
      // check if property or type is defined
      if (propertyType == null || nodeProperty == null) {
        continue;
      }
      if (propertyType.type === "loop") {
        for (var j = 0; j < nodeProperty.length; j++) {
          if (Array.isArray(propertyType.values)) {
            for (var k = 0; k < propertyType.values.length; k++) {
              var loopPropertyNode = nodeProperty[j][propertyType.values[k]];
              if (loopPropertyNode) {
                checkIdentifierOrVisit.call(this, loopPropertyNode);
              }
            }
          } else {
            checkIdentifierOrVisit.call(this, nodeProperty[j]);
          }
        }
      } else if (propertyType.type === "single") {
        checkIdentifierOrVisit.call(this, nodeProperty);
      } else if (propertyType.type === "typeAnnotation") {
        visitTypeAnnotation.call(this, node.typeAnnotation);
      } else if (propertyType.type === "typeParameters") {
        for (var l = 0; l < node.typeParameters.params.length; l++) {
          checkIdentifierOrVisit.call(this, node.typeParameters.params[l]);
        }
      } else if (propertyType.type === "id") {
        if (node.id.type === "Identifier") {
          checkIdentifierOrVisit.call(this, node.id);
        } else {
          visitTypeAnnotation.call(this, node.id);
        }
      }
    }
  }

  function checkIdentifierOrVisit(node) {
    if (node.typeAnnotation) {
      visitTypeAnnotation.call(this, node.typeAnnotation);
    } else if (node.type === "Identifier") {
      this.visit(node);
    } else {
      visitTypeAnnotation.call(this, node);
    }
  }

  function nestTypeParamScope(manager, node) {
    var parentScope = manager.__currentScope;
    var scope = new escope.Scope(manager, "type-parameters", parentScope, node, false);
    manager.__nestScope(scope);
    for (var j = 0; j < node.typeParameters.params.length; j++) {
      var name = node.typeParameters.params[j];
      scope.__define(name, new Definition("TypeParameter", name, name));
      if (name.typeAnnotation) {
        checkIdentifierOrVisit.call(this, name);
      }
    }
    scope.__define = function() {
      return parentScope.__define.apply(parentScope, arguments);
    };
    return scope;
  }

  // visit decorators that are in: ClassDeclaration / ClassExpression
  var visitClass = referencer.prototype.visitClass;
  referencer.prototype.visitClass = function(node) {
    visitDecorators.call(this, node);
    var typeParamScope;
    if (node.typeParameters) {
      typeParamScope = nestTypeParamScope.call(this, this.scopeManager, node);
    }
    // visit flow type: ClassImplements
    if (node.implements) {
      for (var i = 0; i < node.implements.length; i++) {
        checkIdentifierOrVisit.call(this, node.implements[i]);
      }
    }
    if (node.superTypeParameters) {
      for (var k = 0; k < node.superTypeParameters.params.length; k++) {
        checkIdentifierOrVisit.call(this, node.superTypeParameters.params[k]);
      }
    }
    visitClass.call(this, node);
    if (typeParamScope) {
      this.close(node);
    }
  };

  // visit decorators that are in: Property / MethodDefinition
  var visitProperty = referencer.prototype.visitProperty;
  referencer.prototype.visitProperty = function(node) {
    if (node.value && node.value.type === "TypeCastExpression") {
      visitTypeAnnotation.call(this, node.value);
    }
    visitDecorators.call(this, node);
    visitProperty.call(this, node);
  };

  // visit ClassProperty as a Property.
  referencer.prototype.ClassProperty = function(node) {
    if (node.typeAnnotation) {
      visitTypeAnnotation.call(this, node.typeAnnotation);
    }
    this.visitProperty(node);
  };

  // visit flow type in FunctionDeclaration, FunctionExpression, ArrowFunctionExpression
  var visitFunction = referencer.prototype.visitFunction;
  referencer.prototype.visitFunction = function(node) {
    var typeParamScope;
    if (node.typeParameters) {
      typeParamScope = nestTypeParamScope.call(this, this.scopeManager, node);
    }
    if (node.returnType) {
      checkIdentifierOrVisit.call(this, node.returnType);
    }
    // only visit if function parameters have types
    if (node.params) {
      for (var i = 0; i < node.params.length; i++) {
        var param = node.params[i];
        if (param.typeAnnotation) {
          checkIdentifierOrVisit.call(this, param);
        } else if (t.isAssignmentPattern(param)) {
          if (param.left.typeAnnotation) {
            checkIdentifierOrVisit.call(this, param.left);
          }
        }
      }
    }
    // set ArrayPattern/ObjectPattern visitor keys back to their original. otherwise
    // escope will traverse into them and include the identifiers within as declarations
    estraverse.VisitorKeys.ObjectPattern = ["properties"];
    estraverse.VisitorKeys.ArrayPattern = ["elements"];
    visitFunction.call(this, node);
    // set them back to normal...
    estraverse.VisitorKeys.ObjectPattern = t.VISITOR_KEYS.ObjectPattern;
    estraverse.VisitorKeys.ArrayPattern = t.VISITOR_KEYS.ArrayPattern;
    if (typeParamScope) {
      this.close(node);
    }
  };

  // visit flow type in VariableDeclaration
  var variableDeclaration = referencer.prototype.VariableDeclaration;
  referencer.prototype.VariableDeclaration = function(node) {
    if (node.declarations) {
      for (var i = 0; i < node.declarations.length; i++) {
        var id = node.declarations[i].id;
        var typeAnnotation = id.typeAnnotation;
        if (typeAnnotation) {
          checkIdentifierOrVisit.call(this, typeAnnotation);
        }
      }
    }
    variableDeclaration.call(this, node);
  };

  function createScopeVariable (node, name) {
    this.currentScope().variableScope.__define(name,
      new Definition(
        "Variable",
        name,
        node,
        null,
        null,
        null
      )
    );
  }

  referencer.prototype.InterfaceDeclaration = function(node) {
    createScopeVariable.call(this, node, node.id);
    var typeParamScope;
    if (node.typeParameters) {
      typeParamScope = nestTypeParamScope.call(this, this.scopeManager, node);
    }
    // TODO: Handle mixins
    for (var i = 0; i < node.extends.length; i++) {
      visitTypeAnnotation.call(this, node.extends[i]);
    }
    visitTypeAnnotation.call(this, node.body);
    if (typeParamScope) {
      this.close(node);
    }
  };

  referencer.prototype.TypeAlias = function(node) {
    createScopeVariable.call(this, node, node.id);
    var typeParamScope;
    if (node.typeParameters) {
      typeParamScope = nestTypeParamScope.call(this, this.scopeManager, node);
    }
    if (node.right) {
      visitTypeAnnotation.call(this, node.right);
    }
    if (typeParamScope) {
      this.close(node);
    }
  };

  referencer.prototype.DeclareModule =
  referencer.prototype.DeclareFunction =
  referencer.prototype.DeclareVariable =
  referencer.prototype.DeclareClass = function(node) {
    if (node.id) {
      createScopeVariable.call(this, node, node.id);
    }

    var typeParamScope;
    if (node.typeParameters) {
      typeParamScope = nestTypeParamScope.call(this, this.scopeManager, node);
    }
    if (typeParamScope) {
      this.close(node);
    }
  };

  // monkeypatch eslint/tokenstore
  var ts = getModule(eslintMod, "./token-store");
  ts.prototype.getTokenAfter = returnNonceTokenPatch(ts.prototype.getTokenAfter);
  ts.prototype.getTokenBefore = returnNonceTokenPatch(ts.prototype.getTokenBefore);
  ts.prototype.getFirstToken = returnNonceTokenPatch(ts.prototype.getFirstToken);
  ts.prototype.getLastToken = returnNonceTokenPatch(ts.prototype.getLastToken);
  var origGetFirstTokens = ts.prototype.getFirstTokens;
  ts.prototype.getFirstTokens = function() {
    if (!arguments[0] || arguments[0].type === "Nonce") return [createNonceToken()];
    var toks = origGetFirstTokens.apply(this, arguments);
    if (toks == null || toks[0] == null) return [createNonceToken()]; else return toks;
  };

  // monkeypatch rules
  // in eslint 4, rule getter is a class whereas it was an object in 3...
  var emptyRule = function() { return {}; };
  emptyRule.create = function() { return {}; };
  var rules = getModule(eslintMod, "./rules");
  var _get = rules.get || rules.prototype.get;
  var nextGet = function get(ruleId) {
    // disable invalid or broken rules
    if (ruleId && lightScriptDisabledRulesTable[ruleId]) {
      return emptyRule;
    } else {
      return _get.call(this || rules, ruleId);
    }
  };

  if (rules.get) rules.get = nextGet; else rules.prototype.get = nextGet;
}

function createNonceToken() {
  return {
    type: "Nonce",
    start: 0,
    end: 1,
    range: [0, 1],
    loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } }
  };
}

function returnNonceTokenPatch(orig) {
  return function(node, options) {
    if (!node || node.type === "Nonce") return createNonceToken();
    var tok = orig.call(this, node, options);
    if (tok === null) return createNonceToken(); else return tok;
  };
}

function getModule(baseMod, path) {
  var loc;
  try {
    loc = Module._resolveFilename(path, baseMod);
  } catch (err) {
    throw new ReferenceError("couldn't resolve " + path);
  }
  var mod = require(loc);
  if (mod.__esModule) {
    mod = mod.default;
  }
  return mod;
}

exports.parse = function (code, options) {
  options = options || {};
  eslintOptions.ecmaVersion = options.ecmaVersion = options.ecmaVersion || 6;
  eslintOptions.sourceType = options.sourceType = options.sourceType || "module";
  eslintOptions.allowImportExportEverywhere = options.allowImportExportEverywhere = options.allowImportExportEverywhere || false;
  if (options.sourceType === "module") {
    eslintOptions.globalReturn = false;
  } else {
    delete eslintOptions.globalReturn;
  }

  if (!hasPatched) {
    hasPatched = true;
    try {
      monkeypatch(getModules());
    } catch (err) {
      console.error(err.stack);
      process.exit(1);
    }
  }

  return exports.parseNoPatch(code, options);
};

exports.parseNoPatch = function (code, options) {
  var opts = {
    codeFrame: options.hasOwnProperty("codeFrame") ? options.codeFrame : true,
    sourceType: options.sourceType,
    allowImportExportEverywhere: options.allowImportExportEverywhere, // consistent with espree
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    plugins: [
      "flow",
      "jsx",
      "asyncFunctions",
      "asyncGenerators",
      "classConstructorCall",
      "classProperties",
      "decorators",
      "doExpressions",
      "exponentiationOperator",
      "exportExtensions",
      "functionBind",
      "functionSent",
      "objectRestSpread",
      "trailingFunctionCommas",
      "dynamicImport"
    ]
  };

  // TODO: centralize this in plugin-lightscript
  // Should be exported methods to analyze file path, directives, shebangs etc
  // and come up with all this stuff.
  // (This setup step should also read .babelrc)
  var filePath = options.filePath;
  var compilerConfig = lscTooling.getCompilerConfiguration(filePath, code, { __linter: true });
  var useLsc = compilerConfig.isLightScript;

  var ast;
  try {
    if (useLsc) {
      tt = lscTooling.babylon.tokTypes;

      ast = lscTooling.parse(compilerConfig, code, {
        sourceType: options.sourceType,
        allowImportExportEverywhere: options.allowImportExportEverywhere,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true
      });

      // run it through babel-plugin-lightscript to throw errors
      const { ast: nextAst } = babel.transformFromAst(ast, code, {
        code: false,
        plugins: [[lscPlugin, compilerConfig]],
      });
      nextAst.tokens = ast.tokens;
      ast = nextAst;
    } else {
      ast = jsParse(code, opts);
    }
  } catch (err) {
    if (err.loc) {
      err.lineNumber = err.loc.line;
      err.column = err.loc.column;

      if (opts.codeFrame) {
        err.lineNumber = err.loc.line;
        err.column = err.loc.column + 1;

        // remove trailing "(LINE:COLUMN)" acorn message and add in esprima syntax error message start
        err.message = "Line " + err.lineNumber + ": " + err.message.replace(/ \((\d+):(\d+)\)$/, "") +
        // add codeframe
        "\n\n" +
        codeFrame(code, err.lineNumber, err.column, { highlightCode: true });
      }
    }

    throw err;
  }

  babylonToEspree(ast, traverse, tt, code);

  return ast;
};
