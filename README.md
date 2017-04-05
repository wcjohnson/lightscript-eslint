# @oigroup/lightscript-eslint

> NB: This is a fork of lightscript-eslint which implements language changes that are not necessarily endorsed by upstream. Generally speaking, our intent is to closely follow the upstream language -- however, there may be notable deviations which are documented below.

`@oigroup/lightscript-eslint` is a fork of `babel-eslint` that parses code with
`@oigroup/babylon-lightscript` and `@oigroup/babel-plugin-lightscript`.

Any file that includes `.lsc` or `.lsx` in the filename (including, eg, `.lsc.js`)
will be processed with the LightScript compiler;
all others will be processed exactly as in `babel-eslint`.

To use, just `npm install --save-dev @oigroup/lightscript-eslint`
and add `parser: "@oigroup/lightscript-eslint"` to your `.eslintrc`.

Testing so far has been limited; this is very much alpha software and it may not work well. So far, it is has seen limited use with the following configuration:

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
  },
  "rules": {
    "semi": ["error", "never"],
    "react/require-render-return": 0
  }
}
```
