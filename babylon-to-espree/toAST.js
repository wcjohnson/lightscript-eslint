var source;
var t = require("babel-types");
var cloneDeep = require("lodash/cloneDeep");
var getLoc = require("ast-loc-utils/lib/getLoc").default;
var getSurroundingLoc = require("ast-loc-utils/lib/getSurroundingLoc").default;
var buildAtLoc = require("ast-loc-utils/lib/buildAtLoc").default;

module.exports = function (ast, traverse, code) {
  source = code;
  ast.range = [ast.start, ast.end];
  traverse(ast, astTransformVisitor);
};

function changeToLiteral(node) {
  node.type = "Literal";
  if (!node.raw) {
    if (node.extra && node.extra.raw) {
      node.raw = node.extra.raw;
    } else {
      node.raw = source.slice(node.start, node.end);
    }
  }
}

function changeComments(nodeComments) {
  for (var i = 0; i < nodeComments.length; i++) {
    var comment = nodeComments[i];
    if (comment.type === "CommentLine") {
      comment.type = "Line";
    } else if (comment.type === "CommentBlock") {
      comment.type = "Block";
    }
    comment.range = [comment.start, comment.end];
  }
}

function toPattern(identifiers) {
  if (!identifiers.length) return null;
  // Filter omitted identifiers
  const extantIdentifiers = [];
  for (const identifier of identifiers) {
    if (identifier) extantIdentifiers.push(identifier);
  }
  if (!extantIdentifiers.length) return null;

  const loc = getSurroundingLoc(extantIdentifiers);

  // XXX: This hack bypasses Babel's validation, which doesn't allow nested
  // patterns. Nested patterns are allowed in JS, so it is unclear why the
  // validation works this way...
  const arrayPattern = buildAtLoc(loc, t.arrayPattern, []);
  arrayPattern.elements = extantIdentifiers;

  return buildAtLoc(loc, t.variableDeclaration, "const", [
    buildAtLoc(loc, t.variableDeclarator, arrayPattern)
  ]);
}

var lscNodesToBabelNodes = {
  ForInArrayStatement: function(node) {
    node.type = "ForOfStatement";
    node.left = toPattern([node.idx, node.elem]);
    node.right = node.array;
  },
  ForInObjectStatement: function(node) {
    node.type = "ForOfStatement";
    node.left = toPattern([node.key, node.val]);
    node.right = node.object;
  },
  ArrayComprehension: function(node) {
    node.type = "ArrayExpression";
    node.elements = [
      node.loop,
    ];
  },
  ObjectComprehension: function(node) {
    node.type = "ObjectExpression";
    const prop = cloneDeep(node);
    prop.type = "ObjectProperty";
    prop.key =
      node.loop.idx ||
      node.loop.key ||
      node.loop.elem ||
      node.loop.val ||
      node.loop.left && (
        node.loop.left.type === "Identifier"
          ? node.loop.left
          : node.loop.left.declarations[0].id
      ) ||
      node.loop.init && node.loop.init.declarations[0].id ||
      null;
    prop.value = node.loop;

    node.properties = [
      prop,
    ];
  },
  TildeCallExpression: function(node) {
    node.type = "CallExpression";
    node.callee = node.right;
    node.arguments = [node.left].concat(node.arguments);
  },
  NamedArrowDeclaration: function(node) {
    node.type = "FunctionDeclaration";
  },
  NamedArrowExpression: function(node) {
    node.type = "FunctionExpression";
  },
  NamedArrowMemberExpression: function(node) {
    node.type = "AssignmentExpression";

    node.left = node;
    node.left.type = "MemberExpression";
    node.left.object = node.object;
    node.left.property = node.id;

    node.right = node;
    node.right.type = "FunctionExpression";
  },
  IfExpression: function(node) {
    node.type = "ConditionalExpression";
  },
  SafeAwaitExpression: function(node) {
    node.type = "AwaitExpression";
  },
  SafeMemberExpression: function(node) {
    node.type = "MemberExpression";
  },
  ExistentialExpression: function(node) {
    const arg = node.argument;
    delete node.argument;
    Object.assign(node, arg);
  },
  MatchExpression: function(node) {
    const loc = getLoc(node);
    buildAtLoc(loc, t.conditionalExpression,
      buildAtLoc(loc, t.booleanLiteral, true),
      buildAtLoc(loc, t.booleanLiteral, true),
      buildAtLoc(loc, t.booleanLiteral, true)
    );
  }
};

function isLightscriptNode(node) {
  return !!lscNodesToBabelNodes[node.type];
}

function transformLightscriptNode(node) {
  return lscNodesToBabelNodes[node.type](node);
}

function isForInOfShorthand(node) {
  return (
    (node.type === "ForOfStatement" || node.type === "ForInStatement") &&
    node.left.type === "Identifier"
  );
}

function transformAutoConstFor(node) {
  var id = cloneDeep(node.left);
  var decl = cloneDeep(node.left);
  decl.type = "VariableDeclarator";
  decl.id = id;
  decl.init = null;

  node.left.declarations = [decl];
  node.left.type = "VariableDeclaration";
  node.left.kind = "const";
  delete node.left.name;
}

var astTransformVisitor = {
  noScope: true,
  enter (path) {
    var node = path.node;

    node.range = [node.start, node.end];

    if (isLightscriptNode(node)) {
      transformLightscriptNode(node);
    }

    // auto-const for for-in/for-of
    if (isForInOfShorthand(node)) {
      transformAutoConstFor(node);
    }

    // private var to track original node type
    node._babelType = node.type;

    if (node.innerComments) {
      node.trailingComments = node.innerComments;
      delete node.innerComments;
    }

    if (node.trailingComments) {
      changeComments(node.trailingComments);
    }

    if (node.leadingComments) {
      changeComments(node.leadingComments);
    }

    // make '_paths' non-enumerable (babel-eslint #200)
    Object.defineProperty(node, "_paths", { value: node._paths, writable: true });
  },
  exit (path) {
    var node = path.node;

    [
      fixDirectives,
    ].forEach((fixer) => {
      fixer(path);
    });

    if (path.isJSXText()) {
      node.type = "Literal";
      node.raw = node.value;
    }

    if (path.isNumericLiteral() ||
        path.isStringLiteral()) {
      changeToLiteral(node);
    }

    if (path.isBooleanLiteral()) {
      node.type = "Literal";
      node.raw = String(node.value);
    }

    if (path.isNullLiteral()) {
      node.type = "Literal";
      node.raw = "null";
      node.value = null;
    }

    if (path.isRegExpLiteral()) {
      node.type = "Literal";
      node.raw = node.extra.raw;
      node.value = {};
      node.regex = {
        pattern: node.pattern,
        flags: node.flags
      };
      delete node.extra;
      delete node.pattern;
      delete node.flags;
    }

    if (path.isObjectProperty()) {
      node.type = "Property";
      node.kind = "init";
    }

    if (path.isClassMethod() || path.isObjectMethod()) {
      var code = source.slice(node.key.end, node.body.start);
      var offset = code.indexOf("(");

      node.value = {
        type: "FunctionExpression",
        id: node.id,
        params: node.params,
        body: node.body,
        async: node.async,
        generator: node.generator,
        expression: node.expression,
        defaults: [], // basic support - TODO: remove (old esprima)
        loc: {
          start: {
            line: node.key.loc.start.line,
            column: node.key.loc.end.column + offset // a[() {]
          },
          end: node.body.loc.end
        }
      };
      // [asdf]() {
      node.value.range = [node.key.end + offset, node.body.end];

      node.value.start = node.value.range && node.value.range[0] || node.value.loc.start.column;
      node.value.end = node.value.range && node.value.range[1] || node.value.loc.end.column;

      if (node.returnType) {
        node.value.returnType = node.returnType;
      }

      if (node.typeParameters) {
        node.value.typeParameters = node.typeParameters;
      }

      if (path.isClassMethod()) {
        node.type = "MethodDefinition";
      }

      if (path.isObjectMethod()) {
        node.type = "Property";
        if (node.kind === "method") {
          node.kind = "init";
        }
      }

      delete node.body;
      delete node.id;
      delete node.async;
      delete node.generator;
      delete node.expression;
      delete node.params;
      delete node.returnType;
      delete node.typeParameters;
    }

    if (path.isRestProperty() || path.isSpreadProperty()) {
      node.type = `Experimental${node.type}`;
    }

    if (path.isTypeParameter && path.isTypeParameter()) {
      node.type = "Identifier";
      node.typeAnnotation = node.bound;
      delete node.bound;
    }

    // flow: prevent "no-undef"
    // for "Component" in: "let x: React.Component"
    if (path.isQualifiedTypeIdentifier()) {
      delete node.id;
    }
    // for "b" in: "var a: { b: Foo }"
    if (path.isObjectTypeProperty()) {
      delete node.key;
    }
    // for "indexer" in: "var a: {[indexer: string]: number}"
    if (path.isObjectTypeIndexer()) {
      delete node.id;
    }
    // for "param" in: "var a: { func(param: Foo): Bar };"
    if (path.isFunctionTypeParam()) {
      delete node.name;
    }

    // modules

    if (path.isImportDeclaration()) {
      delete node.isType;
    }

    if (path.isExportDeclaration()) {
      var declar = path.get("declaration");
      if (declar.isClassExpression()) {
        node.declaration.type = "ClassDeclaration";
      } else if (declar.isFunctionExpression()) {
        node.declaration.type = "FunctionDeclaration";
      }
    }

    // TODO: remove (old esprima)
    if (path.isFunction()) {
      if (!node.defaults) {
        node.defaults = [];
      }
    }

    // template string range fixes
    if (path.isTemplateLiteral()) {
      node.quasis.forEach((q) => {
        q.range[0] -= 1;
        if (q.tail) {
          q.range[1] += 1;
        } else {
          q.range[1] += 2;
        }
        q.loc.start.column -= 1;
        if (q.tail) {
          q.loc.end.column += 1;
        } else {
          q.loc.end.column += 2;
        }
      });
    }
  }
};


function fixDirectives (path) {
  if (!(path.isProgram() || path.isFunction())) return;

  var node = path.node;
  var directivesContainer = node;
  var body = node.body;

  if (node.type !== "Program") {
    directivesContainer = body;
    body = body.body;
  }

  if (!directivesContainer.directives) return;

  directivesContainer.directives.reverse().forEach((directive) => {
    directive.type = "ExpressionStatement";
    directive.expression = directive.value;
    delete directive.value;
    directive.expression.type = "Literal";
    changeToLiteral(directive.expression);
    body.unshift(directive);
  });
  delete directivesContainer.directives;
}
// fixDirectives
