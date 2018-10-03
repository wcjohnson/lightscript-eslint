x = match 1:
  | 0:
    f() -> 2
  | 1:
    function f() { return 3; }
  | 2:
    class C:
      f() -> 4

x
