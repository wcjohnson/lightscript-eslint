f() ->
  x = try:
    g() -*> yield 3
    g()
  x
f()
