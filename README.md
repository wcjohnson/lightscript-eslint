# @lightscript/eslint-plugin

A first-class ESLint linter plugin for LightScript.

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
      "extends": [
        "eslint:recommended",
        "plugin:@lightscript/automatic"
      ]
    }
    ```

3. Lint your source code:
    ```sh
    $ (npm bin)/eslint --ext .js,.lsc src/
    ```

`@lightscript/eslint-plugin` is compatible with most other ESLint plugins and can lint JavaScript as well as LightScript code.

## The Details

`@lightscript/eslint-plugin` is an extension for ESLint that parses and statically analyzes LightScript code.
It is based on the `babel-eslint` plugin and has been modified to support LightScript AST.

When using the `@lightscript/automatic` config package, any file with the extension `.lsc` or `.lsx` in the filename will be processed as LightScript; all others will be processed as JavaScript according to other ESLint configuration values.

`@lightscript/babel-preset` is a peerDependency and must be installed alongside the linter plugin. If you have a working LightScript build chain, this should already be the case.

# Usage

`@lightscript/eslint-plugin` is both a parser and plugin for modern versions of ESLint. The easiest way to enable the plugin is to use the automatic configuration, which will set the linter to lint LightScript files using a reasonable default ruleset. Place the following in your configuration file:

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@lightscript/automatic"
  ]
}
```

For more advanced ESLint configurations, the parser and plugin can be enabled
manually within ESLint configuration files:

```json
{
  "parser": "@lightscript/eslint-plugin",
  "plugins": ["@lightscript/eslint-plugin"]
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

# Rules

`@lightscript/eslint-plugin` provides a number of linting rules designed specifically for LightScript code. In addition, a number of replacements for ESLint's default rules, which are either broken or inapplicable to LightScript, are provided as well.

Rules are configured using the standard ESLint mechanisms, e.g. by adding the rule to your `.eslintrc`:

```json
{
  "rules": {
    "@lightscript/unnecessary-const": "warn"
  }
}
```

## LightScript rules

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

## Broken or obsolete ESLint rules

All these rules are automatically disabled by `recommended` and `automatic` presets.

### `no-unused-vars`
### `no-unused-expressions`
### `no-use-before-define`
These semantic rules must be modified to support LightScript. The versions built into ESLint will not work. Enable new versions by prefixing with `@lightscript/`  i.e. `@lightscript/no-unused-vars`, `@lightscript/no-unused-expressions`, etc.

### `no-unreachable`
### `array-callback-return`
These rules are unfortunately broken due to ESLint's code path analysis API. See [https://github.com/eslint/eslint/issues/10823] for more information.

### `no-extra-semi`
This rule is superseded by `@lightscript/no-unnecessary-semi` and should be disabled.

### `keyword-spacing`
### `arrow-spacing`
### `rest-spread-spacing`
### `function-paren-newline`
### `indent`
These stylistic rules break on LightScript code. They can be prefixed by `@lightscript/` to enable fixed versions.

## Broken ecosystem rules

### `react/require-render-return`
This rule does not understand LightScript implicit returns. Fix by replacing with `@lightscript/react/require-render-return`.

# Contributing

Issues: https://github.com/wcjohnson/lightscript/issues

# Deep Dives

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
