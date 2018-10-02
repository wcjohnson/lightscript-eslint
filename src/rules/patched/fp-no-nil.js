'use strict';

function isComparison(node) {
  return node.parent &&
    node.parent.type === 'BinaryExpression' &&
    (['==', '!=', '===', '!=='].indexOf(node.parent.operator) > -1)
}

function reportUseOutsideOfComparison(context, node) {
  if (!isComparison(node)) {
    context.report({
      node,
      message: 'Unallowed use of `null` or `undefined`'
    });
  }
}

function endsWithReturnStatement(body) {
  return (
    body.length > 0 &&
    body[body.length - 1].type === 'ReturnStatement'
  )
}

const create = function (context) {
  function reportFunctions(node) {
    // LSC: if function has an implicit return, good enough for me
    if( context.parserServices.getImplicitlyReturnedNodes(node) ) {
      return;
    }

    if (node.body.type === 'BlockStatement' &&
      !endsWithReturnStatement(node.body.body)
    ) {
      context.report({
        node,
        message: 'Function must end with a return statement, so that it doesn\'t return `undefined`'
      });
    }
  }

  const visitor = {
    Literal(node) {
      if (node.value === null) {
        reportUseOutsideOfComparison(context, node);
      }
    },
    Identifier(node) {
      if (node.name === 'undefined') {
        reportUseOutsideOfComparison(context, node);
      }
    },
    VariableDeclarator(node) {
      if (node.init === null) {
        context.report({
          node,
          message: 'Variable must be initialized, so that it doesn\'t evaluate to `undefined`'
        });
      }
    },
    ReturnStatement(node) {
      if (node.argument === null) {
        context.report({
          node,
          message: 'Return statement must return an explicit value, so that it doesn\'t evaluate to `undefined`'
        });
      }
    },
    ArrowFunctionExpression: reportFunctions,
    FunctionDeclaration: reportFunctions,
    FunctionExpression: reportFunctions
  };

  for(const k of context.parserServices.aliasesFor("Function")) {
    visitor[k] = reportFunctions;
  }

  return visitor;
};

module.exports = {
  create,
  meta: {
    docs: {
      description: 'Forbid the use of `null` and `undefined`.',
      recommended: 'error',
      url: 'https://github.com/jfmengels/eslint-plugin-fp/tree/master/docs/rules/no-nil.md'
    }
  }
};
