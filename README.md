# bytewise-uri

This library implementats URI encoding scheme for tersely encoding bytewise key paths as URIs. Legitibility is optimized for the most common types used in keys -- strings, numbers, and top level arrays. If you generally stick to these types your key paths should look fairly elegant.

This library also aims to embed as much of bytewise encoding capabilities into these URIs, so bear that in mind when reading the examples below. When designing keyspaces, the most important factor is that you are able to fully comprehend sort semantics of your various keys and queries over necessary key ranges.

`bytewise` makes this possible by eliminating the many subtle edge cases that crop up when using less formal approaches to defining your indexes. `bytewise-uri` can help further by providing abstractions for some of the common things people need when working with keyspaces. But `bytewise` isn't strictly about keyspaces -- it's a general purpose binary encoding and related type system with a number of interesting and novel properties. But just because you *can* do something doesn't mean you *should*! Go ahead and use as much of `bytewise` as you need, but no more.

Here's how various types are encoded in `bytewise-uri` strings:

```js
var path = require('./')
var assert = require('assert')
var eq = assert.strictEqual
var deepEq = assert.deepEqual

function pathEq(uri, expected) {
  deepEq(path(uri).valueOf(), expected)
}

// ## primitives

// The colon denotes a type literal, and can be used to reference primitive
// types as literals:

pathEq('null:', null)
pathEq('undefined:', undefined)
pathEq('true:', true)
pathEq('false:', false)

// ## strings

pathEq('string:null', 'null')

// Components that don't include reserve characters are interpreted as strings:

pathEq('null', 'null')

// Reserved characters in strings must be escaped:

pathEq('null%3A', 'null:')

// Using the string constructor syntax allows some otherwise-reserved characters
// to be used within the constructor's lexical space:

pathEq('string:foo+bar@baz.com', 'foo+bar@baz.com')

// Without the string prefix every reserved character must be escaped:

pathEq('foo%2Bbar%40baz.com', 'foo+bar@baz.com')

// Some reserved characters must still be escaped in string-prefixed syntax:

pathEq('string:mailto%3A%2F%2Ffoo+bar@baz.com', 'mailto://foo+bar@baz.com')

// But this isn't much of an improvement over the unprefixed form:

pathEq('mailto%3A%2F%2Ffoo%2Bbar%40baz.com', 'mailto://foo+bar@baz.com')


// ## binary

// Binary data is also supported:

deepEq(path('binary:deadbeef').valueOf(), Buffer('deadbeef', 'hex'))


// ## numbers

// The number constructor syntax does what you might expect:

pathEq('number:-123.45', -123.45)

// You can use the other lexical forms availale in ES:

pathEq('number:0x22', 0x22)
pathEq('number:3.5e-4', 0.00035)

// Even octal and binary literals from ES6

pathEq('number:0o767', 503)
pathEq('number:0b111110111', 503)

// You can also reference positive and negative infinity:

pathEq('number:Infinity', Infinity)
pathEq('number:-Infinity', -Infinity)

// `NaN` is not available

// throws(() => uri('number:NaN'))

// Number literals are common enough to merit a shorthand syntax, the `+` suffix:

pathEq('-5.2+', -5.2)
pathEq('Infinity+', Infinity)
pathEq('0o767+', 503)

// ## dates

// Date constructor syntax is just ISO 8601:

pathEq('date:2008-10-01', new Date('2008-10-01'))

// Date literals also have a shorthand syntax, the `@` suffix:

pathEq('2008-10-01@', new Date('2008-10-01'))

// Year and month shorthand can also be used

// pathEq('2000@', new Date('2008'))

// TODO
// pathEq('2008-02@', new Date('2008-02'))

// Double colon could be used to access static type members, e.g.:

// pathEq(uri('date::now').toString(), Date.now().toString())
```

We may also find reasons to borrow semantics from the [ES function bind syntax proposal](https://github.com/zenparsing/es-function-bind)


## arrays

Top level paths are serialized as arrays:

```js
pathEq('/foo/bar/123+', [ 'foo', 'bar', 123 ])
```

Arrays can be nested as well

```js
ex = [ 'a', [ 'b', [ null, 'c', 'd', null ], '', 'baz' ], [ 'z' ] ]
pathEq('/a/(b,(null:,c,d,null:),string:,baz)/z,', ex)
```


## Queries

TODO: subpath indexes, intervals, ranges w/ stepping


## Path templates

TODO

Curly braces can be used to introduce template variables. These create placeholders in specific path components which can later be filled. Variable names can be any valid javascript identifier:

```js
tmpl = path('/foo/bar/{ myVar }/baz/quux'))
eq(tmpl({ myVar: 123 }).uri, '/foo/bar/123+/baz/quux')
eq(tmpl({ myVar: [ true, 'false' ] }).uri, '/foo/bar/true:,false/baz/quux')

// Template variables may be unnamed:

tmpl = path('/foo/{},{}/{ a }/bar')

// All template variables (whether named or not), can be bound by position too:

eq(tmpl([ 'z', [ 'y' ], { x: 1 } ]).uri, '/foo/z,(y,)/x=1,/bar')

// Or a mix of both may be used, as shown below.

Also note that that not all variables have to be populated at once -- any unbound variables carry over to the newly generated uri instance:

eq(tmpl({ a: 'AAA', 0: null }).uri, '/foo/null:,{}/AAA/bar')

// Binding variables on a template returns a new URI object without mutating the
// source template:

eq(tmpl.uri = path('/foo/{},{}/{ a }/bar')

// Template variables can also be given a type annotation to constrain the range of legal values that it may be bound to:

tmpl = path('/foo/{ string:someVar },baz')
eq(tmpl({ someVar: 'bar' }).uri, '/foo/bar/baz')
throws(() => tmpl({ someVar: 123 }))
throws(() => tmpl([ new Date() ]))
```

// Template variables can be used anywhere you might expect to be able to use parentheses to form a group. Attempting to use a template variable to represent only a portion of a given path component will result in an exception:

```js
throws(() => path('/foo/bar/{ badVar }:baz/quux'))
throws(() => path('/foo/bar/baz:{ badVar }/quux'))
throws(() => path('/foo/bar/baz/{ badVar }+/quux'))
// etc...
```


## Template strings
TODO

The encoding function can also be used as a template string:

```js
deepEq(path`/true:/foo/null:`.valueOf(), [ true, 'foo', null ])
```

Interpolated variables will be strongly typed when encoded:

```js
deepEq(path`/a/${ 0 }/${ new Date('2000') }`, [ 'a', 0, new Date('2000') ] }
```

String variables will be URI encoded automatically:

```js
eq(path`/b/${ 'C/d@e.f%G' }/h` }, [ '/b/C%2Fd%40e.f%25G/h' ])
```

Array variables will also be correctly encoded:

```js
ex = [ 'c/d', false, 'null:', 20*-3 ]
k = path`/a/b/${ ex }`
eq(k.uri, '/a/b/c%Fd,false:,null%3A,-60+')
deepEq(k.valueOf(), ex)
```

Even deeply nested arrays:

```js
ex = [ 'a/B', [ 'null:', [ [], true ] ], -Infinity ]
k = path`/${ ex }/a/string:a@b.com`
eq(k.uri, '/A%2FB,(null%3A,(array:,true:)),-Infinity+)/a/a%40b.com')
deepEq(k.valueOf(), ex)
```

This works with objects too:

```js
ex = { foo: true, baz: [ '', {}, 0, { a: 1 } ], bar: '0' }
k = path`/${ ex }/s`
eq(k.uri, '/foo=true:,baz=(string:,0+,object:,(a=1;)),bar=0')
deepEq(k.valueOf(), ex)
```

String template interpolations are escaped using the underlying templating functinoality of the system. As part of the interpolation process, an intermediate template is created with specially-keyed variables. By reusing the underlying templating system each of these variables will have the context necessary. This is captured by the parser when parsing values with template bindiings, allowing for these urls to be a safe and efficient way to reference key path ranges.

