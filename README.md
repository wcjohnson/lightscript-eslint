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

### Contributing

Issues: https://github.com/wcjohnson/lightscript/issues
