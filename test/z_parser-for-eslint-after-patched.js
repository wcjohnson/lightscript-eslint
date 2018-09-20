"use strict";

const eslint = require("eslint");
const assert = require("assert");
const babelEslint = require("..");
const espree = require("espree");
var assertImplementsAST = require("./fixtures/assert-implements-ast");

describe("https://github.com/babel/babel-eslint/issues/558", () => {
  it("don't crash with eslint-plugin-import", () => {
    const engine = new eslint.CLIEngine({ ignore: false });
    engine.executeOnFiles([
      "test/fixtures/eslint-plugin-import/a.js",
      "test/fixtures/eslint-plugin-import/b.js",
      "test/fixtures/eslint-plugin-import/c.js",
    ]);
  });

});
