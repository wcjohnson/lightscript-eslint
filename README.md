# @lightscript/eslint-plugin

A first-class linter for LightScript built on ESLint 5.

Issues: https://github.com/wcjohnson/lightscript/issues

## TLDR

1. Install stuff:
    ```sh
    $ npm install --save-dev eslint
    $ npm install --save-dev @lightscript/eslint-plugin
    $ npm install --save-dev @lightscript/babel-preset
    ```

2. Create or update `.eslintrc` at your package root:

    ```json
    {
      "parser": "@lightscript/eslint-plugin",
      "plugins": ["@lightscript/eslint-plugin"],
      "extends": [
        "plugin:@lightscript/recommended"
      ]
    }
    ```

1. Lint your source code:
    ```sh
    $ (npm bin)/eslint --ext .js,.lsc src/
    ```

`@lightscript/eslint-plugin` is compatible with most other ESLint plugins and can lint JavaScript as well as LightScript code.

## The Details

`@lightscript/eslint-plugin` is an extension for ESLint `(>= 5.0.0)` that parses and statically analyzes LightScript code.
It is based on the `babel-eslint` plugin and has been modified to support LightScript AST.

Any file that includes `.lsc` or `.lsx` in the filename (including, eg, `.lsc.js`)
will be processed as LightScript; all others will be processed exactly as in `babel-eslint`.

`@lightscript/babel-preset` is a peerDependency and must be installed alongside the linter plugin. If you have a working LightScript build chain, this should already be the case.

## Usage

`@lightscript/eslint-plugin` is both a parser and plugin for ESLint 5 `(>= 5.0.0)`. In order to use it, it must be added
to your ESLint configuration as both a parser and a plugin:

```json
{
  "parser": "@lightscript/eslint-plugin",
  "plugins": ["@lightscript/eslint-plugin"]
}
```

No further configuration is specifically required in order to use the plugin, but to get the most out of it, we recommend enabling
our `recommended` ruleset. Our `recommended` ruleset includes the basic ESLint recommended ruleset, along with disabling some broken rules and adding LightScript-specific rules. Enable it by adding the following to your config:

```json
{
  "extends": [
    "plugin:@lightscript/recommended"
  ]
}
```

When running `eslint` from the CLI, you must tell it to process LightScript file extensions:

```
$ eslint --ext .js,.lsc src/
```

## Live Linting

### Visual Studio Code

- Set up eslint for your project as above. Verify that eslint lints correctly from the CLI.
- Install the `LightScript` extension for VSCode: https://marketplace.visualstudio.com/items?itemName=lightscript.lsc
- Install the `ESLint` extension for VSCode: https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint
- Tell VSCode to live-lint LightScript files by adding the following entry to your VSCode options (workspace or global):
  ```json
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "lightscript"
  ]
  ```

## Rules

`@lightscript/eslint-plugin` provides a number of linting rules designed specifically for LightScript code. Rules are configured using the standard ESLint mechanisms, e.g. by adding the rule to your `.eslintrc`:

```json
{
  "rules": {
    "@lightscript/unnecessary-const": 1
  }
}
```

Some rules contain automated fixes. You can apply these autofixes to a file using the ESLint CLI:

```
$ eslint --fix src/fileToFix.lsc
```

### `@lightscript/variables`

Warns about erroneous use of variables and assignment in LightScript, including missing `now` keywords and illegal variable shadowing. As these errors will prevent your code from compiling, this rule should always be enabled when linting LightScript code.

- Included in `recommended` preset.
- Contains automatic fixes for missing `now`.

### `@lightscript/no-illegal-in-iife`

Warns about the use of language constructs that are illegal because the compiler will generate an IIFE around them. These notices should be treated as fatal, as the compiler will throw an error in such cases. This rule should always be enabled when linting LightScript code.

- Included in `recommended` preset.

### `@lightscript/no-implicit-imports`

Warn whenever the use of an identifier would trigger an implicit import by the compiler. Such instances are not necessarily errors, but can be handy so that you don't accidentally implicitly import something.

### `@lightscript/match-requires-else`

Warn when a `match` is missing an `else` case. Can be used to ensure all pattern matches are exhaustive.

### `@lightscript/no-unnecessary-const`

Warn when a `const` keyword is unnecessary because of LightScript implicit `const`.

- Included in `recommended` preset.

### `@lightscript/no-unnecessary-semi`

Warn when a `;` is unnecessary according to LightScript ASI rules.

- Included in `recommended` preset.

### `@lightscript/no-unnecessary-comma`

Warn when a `,` is unnecessary according to LightScript list separator rules.

- Included in `recommended` preset.

## Known Issues

- Issues with hoisting ESLint outside of package root (e.g. Lerna, Yarn workspaces)
If ESLint is hoisted outside of the root `node_modules` folder of your package, it will not be able to find the plugin and you will encounter "can't find plugin" errors. To fix this, use the `nohoist` option of your monorepo tool to ensure ESLint is not hoisted out of your package.

- `no-extra-semi` rule:
When linting LightScript files, this rule is automatically disabled. We recommend the `@lightscript/unnecessary-semi` rule instead.

- `array-callback-return` rule:
When linting LightScript files, this rule is automatically disabled. This rule
is broken pending changes to ESLint's code path analysis; see
[this issue](https://github.com/eslint/eslint/issues/10823)

- `react/require-render-return` rule:
When linting LightScript files, this rule is automatically disabled. Because
of LightScript's implicit returns, this rule is almost always superfluous.

Flow:
> Check out [eslint-plugin-flowtype](https://github.com/gajus/eslint-plugin-flowtype): An `eslint` plugin that makes flow type annotations global variables and marks declarations as used. Solves the problem of false positives with `no-undef` and `no-unused-vars`.
- `no-undef` for global flow types: `ReactElement`, `ReactClass` [#130](https://github.com/babel/babel-eslint/issues/130#issuecomment-111215076)
  - Workaround: define types as globals in `.eslintrc` or define types and import them `import type ReactElement from './types'`
- `no-unused-vars/no-undef` with Flow declarations (`declare module A {}`) [#132](https://github.com/babel/babel-eslint/issues/132#issuecomment-112815926)

Modules/strict mode
- `no-unused-vars: [2, {vars: local}]` [#136](https://github.com/babel/babel-eslint/issues/136)

Please check out [eslint-plugin-react](https://github.com/yannickcr/eslint-plugin-react) for React/JSX issues
- `no-unused-vars` with jsx

Please check out [eslint-plugin-babel](https://github.com/babel/eslint-plugin-babel) for other issues

## Contributing

Issues: https://github.com/wcjohnson/lightscript/issues

## Deep Dives

### parserOptions

- `sourceType` can be set to `'module'`(default) or `'script'` if your code isn't using ECMAScript modules.
- `allowImportExportEverywhere` (default `false`) can be set to `true` to allow import and export declarations to appear anywhere a statement is allowed if your build environment supports that. Otherwise import and export declarations can only appear at a program's top level.
- `codeFrame` (default `true`) can be set to `false` to disable the code frame in the reporter. This is useful since some eslint formatters don't play well with it.

```json
{
  "parser": "@lightscript/eslint-plugin",
  "parserOptions": {
    "sourceType": "module",
    "allowImportExportEverywhere": false,
    "codeFrame": true
  }
}
```
