'use strict';

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _resolve = require('resolve');

var _resolve2 = _interopRequireDefault(_resolve);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _TestRunner = require('./TestRunner');

var _TestFilter = require('./TestFilter');

var _jestDiff = require('jest-diff');

var _jestDiff2 = _interopRequireDefault(_jestDiff);

var _eslint = require('eslint');

var _ = require('../..');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Patch the version of eslint that jest has inside of its VM...
beforeAll(function () {
  const rulesModule = require('eslint/lib/rules');
  return (0, _._monkeypatchRules)(rulesModule);
});let LinterTestOptions = class LinterTestOptions extends _TestRunner.TestOptions {
  inherits(other) {
    super.inherits(other);
  }assign(other) {
    const nextParserOpts = Object.assign({}, this.parserOptions, other.parserOptions);
    Object.assign(this, other, { parserOptions: nextParserOpts });
  }
};
let LinterTestable = class LinterTestable extends _TestRunner.Testable {
  loadTest() {
    this.loadTestData();
    this.enqueueTest();
  }readTestOptions() {
    const optionsData = this.readLocalArtifact("options.json", false);
    const options = optionsData ? JSON.parse(optionsData) : {};
    // Allow test options to be overridden
    const overrideData = this.readLocalArtifact("options.override.json", false);
    if (overrideData) {
      Object.assign(options, JSON.parse(overrideData));
    }return options;
  }loadTestData() {
    if (this.name && this.name[0] === '.') {
      this.disabled = true;
      return;
    }const options = this.readTestOptions();
    if (options) this.options.assign(options);
    //console.log("Test options:", this.title, this.options)

    this.actual = this.readLocalArtifact("input", ['.js', '.lsc']);
    this.expected = this.readLocalArtifact("output", ['.json']);
    if (this.expected) this.expected = JSON.parse(this.expected);

    // Use parent input if no child input.
    if (!this.actual && this.parent && this.parent.actual) {
      if (!this.expected) this.expected = this.parent.expected;
      this.actual = this.parent.actual;
    }
  }enqueueTest() {
    if (this.disabled) {
      if (typeof it !== 'undefined') {
        it.skip(this.title, () => this.runTest());
      } else {
        console.log("Skipped test:", this.title);
      }
    } else if (this.actual) {
      if (typeof it !== 'undefined') {
        it(this.title, () => this.runTest());
      } else {
        console.log("Ran test:", this.title);
      }
    } else {
      // console.log("skipping (no input)", this.title)
      return;
    }
  }throwAnnotatedError(err) {
    // Unnecessary because jest is good
    // err.message = this.title + ": " + err.message
    throw err;
  }runTest() {
    let messages, realOpts;
    try {
      realOpts = Object.assign({}, this.options);
      realOpts.parser = '@lightscript/eslint-plugin';
      realOpts.plugins = ['@lightscript/eslint-plugin'];
      // console.log("realOpts", realOpts)

      const cliEngineOpts = {
        baseConfig: realOpts,
        ignore: false,
        useEslintrc: false
      };

      const engine = new _eslint.CLIEngine(cliEngineOpts);
      // console.log("rules", engine.getRules())
      const results = engine.executeOnText(this.actual);
      // console.log("results", results)

      messages = results.results[0].messages.map(function (message) {
        return `${message.line}:${message.column} ${message.message}${message.ruleId ? ` ${message.ruleId}` : ""}`;
      });
    } catch (err) {
      if (this.options.throws) {
        if (err.message.indexOf(this.options.throws) > -1) {
          return;
        } else if (process.env.SAVE_THROWS) {
          this.saveThrows(err);
          this.throwAnnotatedError(err);
        } else {
          err.message = `Expected error message: '${this.options.throws}'. Got error message: '${err.message}'`;
          this.throwAnnotatedError(err);
        }
      } else if (!this.expected && process.env.SAVE_THROWS) {
        this.saveThrows(err);
      }this.throwAnnotatedError(err);
    }

    if (this.options.throws) {
      this.throwAnnotatedError(new Error(`Expected error message '${this.options.throws}' but no error was thrown.`));
    }if ((!this.expected || process.env.FORCE_SAVE) && !this.options.throws && process.env.SAVE_EXPECTED) {
      this.saveExpected(messages, "output.json");
      return;
    }if (this.options.throws) {
      this.throwAnnotatedError(new Error("Expected error message: " + this.options.throws + ". But test succeeded."));
    } else {
      if (this.expected) {
        this.mismatchExpected(this.expected, messages);
      } else {
        this.throwAnnotatedError(new Error("Empty expected output -- use SAVE_EXPECTED=1 to create expected output."));
      }
    }
  }mismatchExpected(expected, messages) {
    let mismatch;
    if (expected.length !== messages.length) {
      mismatch = `Expected ${expected.length} message(s), got ${messages.length}\n${JSON.stringify(messages, null, 2)}`;
    } else {
      messages.forEach((message, i) => {
        if (message !== expected[i]) {
          return mismatch = `
            Message ${i} does not match:
            Expected: ${expected[i]}
            Actual:   ${message}
          `;
        }
      });
    }if (mismatch) {
      if (process.env.UPDATE_EXPECTED) {
        return this.saveExpected(messages, "output.json");
      } else {
        return this.throwAnnotatedError(new Error(mismatch));
      }
    }
  }saveExpected(expected, filename) {
    this.saveLocalArtifact(filename, JSON.stringify(expected, null, 2));
  }saveErrorOverride(throws) {
    return this.saveLocalArtifact("options.override.json", JSON.stringify({ throws }));
  }saveThrows(err) {
    const opts = this.readTestOptions() || {};
    opts.throws = err.message;
    this.saveLocalArtifact("options.json", JSON.stringify(opts, null, "  "));
  }
};
const run = new _TestRunner.TestRun();
run.getTestableConstructor = function getTestableConstructor() {
  return LinterTestable;
};run.getOptionsConstructor = function getOptionsConstructor() {
  return LinterTestOptions;
};const filter = new _TestFilter.TestFilter();
if (process.env.ONLY) {
  filter.only(process.env.ONLY);
}const rootTestable = new LinterTestable(run, null, filter);
rootTestable.setTestPath(_path2.default.join(__dirname, '../fixtures'));
rootTestable.readTestDirectory();