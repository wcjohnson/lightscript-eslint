match undef:
  | UndefinedAtom: false
  | with {a, b}: (a, c)
  | as { a, b: {c: [d, e], f}}: (d, e, f)
  | if undefOuter when UndefinedAtom as { unused } if undefInner: 42
