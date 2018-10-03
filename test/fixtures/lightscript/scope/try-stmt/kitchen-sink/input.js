f() ->
  try:
    result() -> 1
f()

g() ->
  try:
    undef()
    unused1 = 2
    unused3() -> 4
    5
g()
