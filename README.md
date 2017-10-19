# @oigroup/lightscript-eslint

> `@oigroup/lightscript-eslint` is most frequently tested with `eslint@^4.0.0`.
> It SHOULD be backwards-compatible with `eslint@^3.0.0` as well.

`@oigroup/lightscript-eslint` is a fork of `babel-eslint` that parses code with
`@oigroup/babylon-lightscript` and `@oigroup/babel-plugin-lightscript`.

Any file that includes `.lsc` or `.lsx` in the filename (including, eg, `.lsc.js`)
will be processed with the LightScript compiler;
all others will be processed exactly as in `babel-eslint`.

To use, just `npm install --save-dev @oigroup/lightscript-eslint`
and add `parser: "@oigroup/lightscript-eslint"` to your `.eslintrc`.

Example configuration (with React):

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

### Live Linting

#### Visual Studio Code

- Set up eslint for your project as above. Verify that eslint lints correctly from the CLI.
- Install the `ESLint` extension for VSCode: https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint
- Tell VSCode to live-lint LightScript files by adding the following entry to your VSCode options (workspace or global):
  ```
  "eslint.validate": ["javascript", "javascriptreact", "lightscript"]
  ```

### Broken Rules

The following lint rules are either buggy, broken, or do not make sense in the context of LightScript. They are disabled at the code level and will not run even if you enable them in your configuration.

- `no-unexpected-multiline`
- `no-else-return`

### Contributing

Issues: https://github.com/wcjohnson/lightscript/issues
