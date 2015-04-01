# bytewise-uri

URI encoding scheme for bytewise key paths


```js
var key = require('./')
var assert = require('assert')

function eq(uri, expected) {
  assert.deepEqual(key(uri).valueOf(), expected)
}


// ## primitives

// The colon denotes a type literal, and can be used to reference primitive
// types as literals:

eq('null:', null)
eq('undefined:', undefined)
eq('true:', true)
eq('false:', false)

// ## strings

eq('string:null', 'null')

// Components that don't include reserve characters are interpreted as strings:

eq('null', 'null')

// Reserved characters in strings must be escaped:

eq('null%3A', 'null:')

// Using the string constructor syntax allows some otherwise-reserved characters
// to be used within the constructor's lexical space:

eq('string:foo:bar@baz+quux%2F', 'foo:bar@baz+quux/')

// All reserved URI characters require escapement without the string prefix:

eq('foo%3Abar%40baz%2Bquux%2F', 'foo:bar@baz+quux/')


// ## numbers

// The number constructor syntax does what you might expect:

eq('number:-123.45', -123.45)

// You can use the other lexical forms availale in ES:

eq('number:0x22', 0x22)
eq('number:3.5e-4', 0.00035)

// Even octal and binary literals from ES6

eq('number:0o767', 503)
eq('number:0b111110111', 503)

// You can also reference positive and negative infinity:

eq('number:Infinity', Infinity)
eq('number:-Infinity', -Infinity)

// `NaN` is not available

// throws(() => uri('number:NaN'))

// Number literals are common enough to merit a shorthand syntax, the `+` suffix:

eq('-5.2+', -5.2)
eq('Infinity+', Infinity)
eq('0o767+', 503)

// Number literal shorthand syntax can be chained:

eq('10+9.5+3', 22.5)

// But you can only use simple number syntax when chaining:

// throws(() => key('3.2e+4+3'))

// ## dates

// Date constructor syntax is just ISO 8601:

eq('date:2008-10-01', new Date('2008-10-01'))


// Date literals also have a shorthand syntax, the `@` suffix:

eq('2008-10-01@', new Date('2008-10-01'))

// Double colon could be used to access static type members, e.g.:

// eq(uri('date::now').toString(), Date.now().toString())

// We may also find reasons to borrow semantics from the (ES function bind syntax proposal)[https://github.com/zenparsing/es-function-bind]


// ## arrays

// Top level paths are serialized as arrays:

eq('/foo/bar/123+', [ 'foo', 'bar', 123 ])

// Arrays can be nested as well

var expected = [ 'a', [ 'b', [ null, 'c', 'd', null ], '', 'baz' ], [ 'z' ] ]

eq('/a/(b,(null:,c,d,null:),string:,baz)/z,', expected)



// ## index paths
// TODO

// eq(key('/foo/bar/baz'), path('foo', 'bar', 'baz'))


// ## intervals

// All "children" of some path:

// eq(key('/foo/bar/baz/').range, {
//    gt: path('foo', 'bar', 'baz', types.BOTTOM),
//    lt: path('foo', 'bar', 'baz', types.TOP)
//})


// ## ranges

// stepped ranges (e.g. start, end, step)
```
