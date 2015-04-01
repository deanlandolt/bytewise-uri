# bytewise-uri

URI encoding scheme for bytewise key paths


```js
var key = require('./')
var assert = require('assert')
var eq = assert.strictEqual
var deepEq = assert.deepEqual

function keyEq(uri, expected) {
  deepEq(key(uri).valueOf(), expected)
}

// ## primitives

// The colon denotes a type literal, and can be used to reference primitive
// types as literals:

keyEq('null:', null)
keyEq('undefined:', undefined)
keyEq('true:', true)
keyEq('false:', false)

// ## strings

keyEq('string:null', 'null')

// Components that don't include reserve characters are interpreted as strings:

keyEq('null', 'null')

// Reserved characters in strings must be escaped:

keyEq('null%3A', 'null:')

// Using the string constructor syntax allows some otherwise-reserved characters
// to be used within the constructor's lexical space:

keyEq('string:foo:bar@baz+quux%2F', 'foo:bar@baz+quux/')

// All reserved URI characters require escapement without the string prefix:

keyEq('foo%3Abar%40baz%2Bquux%2F', 'foo:bar@baz+quux/')


// ## numbers

// The number constructor syntax does what you might expect:

keyEq('number:-123.45', -123.45)

// You can use the other lexical forms availale in ES:

keyEq('number:0x22', 0x22)
keyEq('number:3.5e-4', 0.00035)

// Even octal and binary literals from ES6

keyEq('number:0o767', 503)
keyEq('number:0b111110111', 503)

// You can also reference positive and negative infinity:

keyEq('number:Infinity', Infinity)
keyEq('number:-Infinity', -Infinity)

// `NaN` is not available

// throws(() => uri('number:NaN'))

// Number literals are common enough to merit a shorthand syntax, the `+` suffix:

keyEq('-5.2+', -5.2)
keyEq('Infinity+', Infinity)
keyEq('0o767+', 503)

// Number literal shorthand syntax can be chained:

keyEq('10+9.5+3', 22.5)

// But you can only use simple number syntax when chaining:

// throws(() => key('3.2e+4+3'))

// ## dates

// Date constructor syntax is just ISO 8601:

keyEq('date:2008-10-01', new Date('2008-10-01'))

// Date literals also have a shorthand syntax, the `@` suffix:

keyEq('2008-10-01@', new Date('2008-10-01'))

// Year and month shorthand can also be used
// TODO
// keyEq('2000@', new Date('2008'))
// keyEq('2008-02@', new Date('2008-02'))

// Double colon could be used to access static type members, e.g.:

// keyEq(uri('date::now').toString(), Date.now().toString())
```

We may also find reasons to borrow semantics from the [ES function bind syntax proposal]
// (https://github.com/zenparsing/es-function-bind)


## arrays

Top level paths are serialized as arrays:

```js

keyEq('/foo/bar/123+', [ 'foo', 'bar', 123 ])

// Arrays can be nested as well

ex = [ 'a', [ 'b', [ null, 'c', 'd', null ], '', 'baz' ], [ 'z' ] ]
keyEq('/a/(b,(null:,c,d,null:),string:,baz)/z,', ex)



// ## index paths
// TODO

// keyEq(key('/foo/bar/baz'), path('foo', 'bar', 'baz'))


// ## intervals

// All "children" of some path:

// keyEq(key('/foo/bar/baz/').range, {
//    gt: path('foo', 'bar', 'baz', types.BOTTOM),
//    lt: path('foo', 'bar', 'baz', types.TOP)
//})

```

## ranges
TODO

... stepped ranges (e.g. start, end, step)


## Keypath templates
TODO

Curly braces can be used to introduce template variables. These create placeholders in specific path components which can later be filled. Variable names can be any valid javascript identifier:

```js
tmpl = key('/foo/bar/{ myVar }/baz/quux'))
eq(tmpl({ myVar: 123 }).uri, '/foo/bar/123+/baz/quux')
eq(tmpl({ myVar: [ true, 'false' ] }).uri, '/foo/bar/true:,false/baz/quux')

// Template variables may be unnamed:

tmpl = key('/foo/{},{}/{ a }/bar')

// All template variables (whether named or not), can be bound by position too:

eq(tmpl([ 'z', [ 'y' }, { x: 1 } ]).uri, '/foo/z,(y,)/x=1,/bar')

// Or a mix of both may be used, as shown below.

Also note that that not all variables have to be populated at once -- any unbound variables carry over to the newly generated uri instance:

eq(tmpl({ a: 'AAA', 0: null }).uri, '/foo/null:,{}/AAA/bar')

// Binding variables on a template returns a new URI object without mutating the
// source template:

eq(tmpl.uri = key('/foo/{},{}/{ a }/bar')

// Template variables can also be given a type annotation to constraint the range of legal values that it may be bound to:

tmpl = key('/foo/{ string:someVar },baz')
eq(tmpl({ someVar: 'bar' }).uri, '/foo/bar/baz')
throws(() => tmpl({ someVar: 123 }))
throws(() => tmpl([ new Date() ]))
```

// Template variables can be used anywhere you might expect to be able to use parentheses to form a group. Attempting to use a template variable to represent only a portion of a given path component will result in an exception:

```js
throws(() => key('/foo/bar/{ badVar }:baz/quux'))
throws(() => key('/foo/bar/baz:{ badVar }/quux'))
throws(() => key('/foo/bar/baz/{ badVar }+/quux'))
// etc...
```


## Template strings
TODO

```js
// The encoding function can also be used as a template string:

deepEq(key`/true:/foo/null:`.valueOf(), [ true, 'foo', null ])

// Interpolated variables will be strongly typed when encoded:

deepEq(key`/a/${ 0 }/${ new Date('2000') }`, [ 'a', 0, new Date('2000') ] }

// String variables will be URI encoded automatically:

eq(key`/b/${ 'C/d@e.f%G' }/h` }, [ '/b/C%2Fd%40e.f%25G/h' ])

// Array variables will also be correctly encoded:

ex = [ 'c/d', false, 'null:', 20*-3 ]
k = key`/a/b/${ ex }`
eq(k.uri, '/a/b/c%Fd,false:,null%3A,-60+')
deepEq(k.valueOf(), ex)

// Even deeply nested arrays:

ex = [ 'a/B', [ 'null:', [ [], true ] ], -Infinity ]
k = key`/${ ex }/a/string:a@b.com`
eq(k.uri, '/A%2FB,(null%3A,(array:,true:)),-Infinity+)/a/a%40b.com')
deepEq(k.valueOf(), ex)

// With objects too:

ex = { foo: true, baz: [ '', {}, 0, { a: 1 } ], bar: '0' }
k = key`/${ ex }/s`
eq(k.uri, '/foo=true:,baz=(string:,0+,object:,(a=1;)),bar=0')
deepEq(k.valueOf(), ex)
```

String template interpolations are escaped using the underlying templating functinoality of the system. As part of the interpolation process, an intermediate template is created with specially-keyed variables. By reusing the underlying templating system each of these variables will have the context necessary. This is captured by the parser when parsing values with template bindiings, allowing for these urls to be a safe and efficient way to reference key ranges.

