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
    it("skinny", () => {
      verifyAndAssertMessages(
        `
        f() -> 1
        f()
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });
    it("skinny args", () => {
      verifyAndAssertMessages(
        `
        f(x) -> x
        f(1)
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });
    it("skinny args complex", () => {
      verifyAndAssertMessages(
        `
        f([x, y], ...z) -> x + y + z
        f([1, 2], 3)
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });
    it("skinny args complex unused", () => {
      verifyAndAssertMessages(
        `
        f([x, y], ...z) -> x + y
        f([1, 2], 3)
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["1:14 'z' is defined but never used. no-unused-vars"]
      );
    });
    it("skinny args complex undef", () => {
      verifyAndAssertMessages(
        `
        f([x, y], ...z) -> x + y + z + w
        f([1, 2], 3)
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["1:32 'w' is not defined. no-undef"]
      );
    });
    it("fat", () => {
      verifyAndAssertMessages(
        `
        f() => 1
        f()
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });
    it("fat unused", () => {
      verifyAndAssertMessages(
        `
        f() => 1
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["1:1 'f' is defined but never used. no-unused-vars"]
      );
    });
    it("fat args complex", () => {
      verifyAndAssertMessages(
        `
        f([x, y], ...z) => x + y + z
        f([1, 2], 3)
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });
    it("fat args complex unused", () => {
      verifyAndAssertMessages(
        `
        f([x, y], ...z) => x + y
        f([1, 2], 3)
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["1:14 'z' is defined but never used. no-unused-vars"]
      );
    });
    it("fat args complex undef", () => {
      verifyAndAssertMessages(
        `
        f([x, y], ...z) => x + y + z + w
        f([1, 2], 3)
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["1:32 'w' is not defined. no-undef"]
      );
    });
  });

  describe("tilde calls", () => {
    it("basic", () => {
      verifyAndAssertMessages(
        `
        f(x) -> x
        a = 1
        a~f()
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });
    it("undef left", () => {
      verifyAndAssertMessages(
        `
        f(x) -> x
        a~f()
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["2:1 'a' is not defined. no-undef"]
      );
    });
    it("undef right", () => {
      verifyAndAssertMessages(
        `
        a = 1
        a~f()
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["2:3 'f' is not defined. no-undef"]
      );
    });
  });

  describe("optional tilde calls", () => {
    it("basic", () => {
      verifyAndAssertMessages(
        `
        f(x) -> x
        a = 1
        a~f?()
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });
    it("undef left", () => {
      verifyAndAssertMessages(
        `
        f(x) -> x
        a?~f()
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["2:1 'a' is not defined. no-undef"]
      );
    });
    it("undef right", () => {
      verifyAndAssertMessages(
        `
        a = 1
        a~f?()
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["2:3 'f' is not defined. no-undef"]
      );
    });
  });

  describe("for-in-array", () => {
    it("basic", () => {
      verifyAndAssertMessages(
        `
        for idx i, elem e in []: (i, e)
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });
    it("unused idx", () => {
      verifyAndAssertMessages(
        `
        for idx i, elem e in []: e
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["1:9 'i' is assigned a value but never used. no-unused-vars"]
      );
    });
    it("unused elem", () => {
      verifyAndAssertMessages(
        `
        for idx i, elem e in []: i
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["1:17 'e' is assigned a value but never used. no-unused-vars"]
      );
    });
    it("undef iteratee", () => {
      verifyAndAssertMessages(
        `
        for idx i, elem e in x: (i, e)
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["1:22 'x' is not defined. no-undef"]
      );
    });
  });
});
