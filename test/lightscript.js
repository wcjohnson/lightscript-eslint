/*eslint-env mocha*/
"use strict";
var eslint = require("eslint");
var unpad = require("dedent");

function verifyAndAssertMessagesWithSpecificESLint(
  code,
  rules,
  expectedMessages,
  sourceType,
  overrideConfig,
  linter
) {
  var config = {
    parser: require.resolve(".."),
    rules,
    env: {
      node: true,
      es6: true,
    },
    parserOptions: {
      ecmaVersion: 2018,
      ecmaFeatures: {
        jsx: true,
        experimentalObjectRestSpread: true,
        globalReturn: true,
      },
      sourceType,
    },
  };

  if (overrideConfig) {
    for (var key in overrideConfig) {
      config[key] = overrideConfig[key];
    }
  }

  var messages = linter.verify(code, config);

  if (messages.length !== expectedMessages.length) {
    throw new Error(
      `Expected ${expectedMessages.length} message(s), got ${
        messages.length
      }\n${JSON.stringify(messages, null, 2)}`
    );
  }

  messages.forEach((message, i) => {
    var formatedMessage = `${message.line}:${message.column} ${
      message.message
    }${message.ruleId ? ` ${message.ruleId}` : ""}`;
    if (formatedMessage !== expectedMessages[i]) {
      throw new Error(
        `
          Message ${i} does not match:
          Expected: ${expectedMessages[i]}
          Actual:   ${formatedMessage}
        `
      );
    }
  });
}

function verifyAndAssertMessages(
  code,
  rules,
  expectedMessages,
  sourceType,
  overrideConfig
) {
  verifyAndAssertMessagesWithSpecificESLint(
    unpad(`${code}`),
    rules || {},
    expectedMessages || [],
    sourceType,
    overrideConfig,
    new eslint.Linter()
  );
}

describe("lightscript", () => {
  describe("named arrow functions", () => {
    it("check regular function", () => {
      verifyAndAssertMessages(
        `
        f() -> 1
        f()
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });
  });
});
