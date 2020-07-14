f() ->
  1

f([...for elem e in []: [e]])

x = {}
x.something?.someFunction()
x?~something.someFunction()
x~something?.someFunction()
x~something.someFunction?()
x~someFunction()

export createPermalink(state, origUrl) ->
  packed = JSON.stringify(state)
  // packed = msgpack.encode(state)
  console.log("permalinking to state", packed, " uncompressed length (bytes) ", packed.length)
  deflated = pako.deflate(packed, { to: 'string', level: 9 })
  stateArg = base64url.encode(deflated)

  parsed = url.parse(origUrl)
  delete parsed.search
  parsed.query = {
    v: 2
    s: stateArg
  }

  newUrl = url.format(parsed)

  newUrl
