# @lightscript/eslint

`@lightscript/eslint` is a fork of `babel-eslint` that parses LightScript code.

Any file that includes `.lsc` or `.lsx` in the filename (including, eg, `.lsc.js`)
will be processed with the LightScript compiler;
all others will be processed exactly as in `babel-eslint`.

To use, just `npm install --save-dev @lightscript/eslint`
and add `parser: "@lightscript/eslint"` to your `.eslintrc`.

## Usage

### Supported ESLint versions

ESLint | babel-eslint
------------ | -------------
4.x | >= 6.x
3.x | >= 6.x
2.x | >= 6.x
1.x | >= 5.x

### Example Configuration

**.eslintrc**

```json
{
  "parser": "@oigroup/lightscript-eslint",
  "plugins": [
    "react"
  ],
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended"
  ],
  "env": {
    "browser": true,
    "node": true,
    "es6": true
  }
}
```

When running `eslint` from the CLI, you must tell it to process LightScript file extensions:

```
$ eslint --ext .js,.lsc src
```

### Options

> Note that the `ecmaFeatures` config property may still be required for ESLint to work properly with features not in ECMAScript 5 by default. Examples are `globalReturn` and `modules`).

- `sourceType` can be set to `'module'`(default) or `'script'` if your code isn't using ECMAScript modules.
- `allowImportExportEverywhere` (default `false`) can be set to `true` to allow import and export declarations to appear anywhere a statement is allowed if your build environment supports that. Otherwise import and export declarations can only appear at a program's top level.
- `codeFrame` (default `true`) can be set to `false` to disable the code frame in the reporter. This is useful since some eslint formatters don't play well with it.

```json
{
  "parser": "babel-eslint",
  "parserOptions": {
    "sourceType": "module",
    "allowImportExportEverywhere": false,
    "codeFrame": true
  }
}
```

### Live Linting

#### Visual Studio Code

- Set up eslint for your project as above. Verify that eslint lints correctly from the CLI.
- Install the `ESLint` extension for VSCode: https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint
- Tell VSCode to live-lint LightScript files by adding the following entry to your VSCode options (workspace or global):
  ```
  "eslint.validate": ["javascript", "javascriptreact", "lightscript"]
  ```

### Known Issues

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

The following lint rules are either buggy, broken, or do not make sense in the context of LightScript. They are disabled at the code level and will not run even if you enable them in your configuration.

- `no-unexpected-multiline`
- `no-else-return`

### Contributing

Issues: https://github.com/wcjohnson/lightscript/issues
