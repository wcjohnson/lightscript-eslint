"use strict";
var api = require("@lightscript/babel-preset").api;
var isa = api.isa;
var convertComments = require("./convertComments");
var recurse = require("../helpers").recurse;

module.exports = function(ast, traverse, code) {
  recurse(ast, astTransformVisitor, null);
};

var astTransformVisitor = {
  enter(node) {
    // private var to track original node type
    node._babelType = node.type;

    if (node.innerComments) {
      node.trailingComments = node.innerComments;
      delete node.innerComments;
    }

    if (node.trailingComments) {
      convertComments(node.trailingComments);
    }

    if (node.leadingComments) {
      convertComments(node.leadingComments);
    }
  },
  exit(node, parent) {
    if (isa(node, "JSXText")) {
      node.type = "Literal";
    }

    if (
      isa(node, "RestElement") &&
      isa(parent, "ObjectPattern")
    ) {
      node.type = "ExperimentalRestProperty";
    }

    if (
      isa(node, "SpreadElement") &&
      isa(parent, "ObjectExpression")
    ) {
      node.type = "ExperimentalSpreadProperty";
    }

    if (isa(node, "TypeParameter")) {
      node.type = "Identifier";
      node.typeAnnotation = node.bound;
      delete node.bound;
    }

    // flow: prevent "no-undef"
    // for "Component" in: "let x: React.Component"
    if (isa(node, "QualifiedTypeIdentifier")) {
      delete node.id;
    }
    // for "b" in: "var a: { b: Foo }"
    if (isa(node, "ObjectTypeProperty")) {
      delete node.key;
    }
    // for "indexer" in: "var a: {[indexer: string]: number}"
    if (isa(node, "ObjectTypeIndexer")) {
      delete node.id;
    }
    // for "param" in: "var a: { func(param: Foo): Bar };"
    if (isa(node, "FunctionTypeParam")) {
      delete node.name;
    }

    // modules

    if (isa(node, "ImportDeclaration")) {
      delete node.isType;
    }

    // template string range fixes
    if (isa(node, "TemplateLiteral")) {
      for (var j = 0; j < node.quasis.length; j++) {
        var q = node.quasis[j];
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
      }
    }
  },
};
