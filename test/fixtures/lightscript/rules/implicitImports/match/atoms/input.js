Predicate() -> true
SomeClass = {}
SomeLibrary = {}

match 1:
  | SomeClass: "will import"
  | 1: "won't import"
  | '1': "won't import"
  | SomeLibrary.SomeObject: "will import"
  | ~Predicate(): "won't import"
  | not ~Predicate(): "Won't import"
  | -1: "won't import"
  | undefined: "won't import"
  | null: "won't import"
  | else: 1
