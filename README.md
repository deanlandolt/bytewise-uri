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
  deepEq(path(uri).data, expected)
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

deepEq(path('binary:deadbeef').data, Buffer('deadbeef', 'hex'))


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


## Path templates

Curly braces can be used to introduce template variables. These create placeholders in specific path components which can later be filled. Variable names can be any valid javascript identifier:

```js
tmpl = path('/foo/bar/{ myVar }/baz/quux'))
eq(tmpl({ myVar: 123 }).uri, '/foo/bar/123+/baz/quux')
eq(tmpl({ myVar: [ true, 'false' ] }).uri, '/foo/bar/true:,false/baz/quux')

// Template variables may be unnamed:

tmpl = path('/foo/{*},{*}/{ a }/bar')

// All template variables (whether named or not), can be bound by position too:

eq(tmpl([ 'z', [ 'y' ], { x: 1 } ]).uri, '/foo/z,(y,)/x=1,/bar')

// Or a mix of both may be used, as shown below.

Also note that that not all variables have to be populated at once -- any unbound variables carry over to the newly generated uri instance:

eq(tmpl({ a: 'AAA', 0: null }).uri, '/foo/null:,{*}/AAA/bar')

// Binding variables on a template returns a new URI object without mutating the
// source template:

eq(tmpl.uri = path('/foo/{*},{*}/{ a }/bar')

// Template variables can also be given a type annotation to constrain the range of legal values that it may be bound to:

tmpl = path('/foo/{ someVar : number },baz')

eq(tmpl({ someVar: 3 }).uri, '/foo/3+/baz')
throws(() => tmpl({ someVar: '3' }))

eq(tmpl([ -2.5 }).uri, '/foo/-2.5+/baz')
throws(() => tmpl([ '-2.5' ]))
```

// Template variables can be used anywhere you might expect to be able to use parentheses to form a group. Attempting to use a template variable to represent only a portion of a given path component will result in an exception:

```js
throws(() => path('/foo/bar/{ badVar }:baz/quux'))
throws(() => path('/foo/bar/baz:{ badVar }/quux'))
throws(() => path('/foo/bar/baz/{ badVar }+/quux'))
// etc...
```

## Path templates as queries

Another way of thinking of key range "templates" is as a kind of query. Template variables define the areas of the keyspace a given template can range over. Consider this template:

```js
path('/foo/{ someVar }')
```

This would almost correspond to the query:

```js
{ gte: '/foo/null:', lte: '/foo/undefined:' }
```

Things can get messy if you're storing things with `undefined` keys (maybe for secondary index reasons, or maybe you're just batshit crazy...). To fix this we define out-of-bounds primitives that can be used in range queries to represent the absolute lower and upper bounds -- `0x00` and `0xFF`, respectively:

This can be thought of as a query that ranges over *any* `foo` value:

```js
{ gt: '/foo/bottom:', lt: '/foo/top:' }
```

This is analogous to an `any` type. Thinking of a template as a predicate function, *any* value for `someVar` could be used. But this could be further refined by adding a type declaration to narrow the query space:

```js
path('/foo/{ someVar : number }')
```

This would correspond to a query like this:

```js
{ gte: '/foo/Infinity+:', lte: '/foo/-Infinity+' }
```

### Ranges as type system

We could allow type annotations to specify arbitrary ranges right inline, reusing our interval notation, whatever we eventually settle on (various ideas kicked around [here](https://gist.github.com/deanlandolt/1522a1126727afbfdd4d).

For example, refining a type to the range of non-negative reals, the interval `0 <= x < Infinity`, might look like this:

```js
path('/foo/{ someVar : (0+,!Infinity+) }')
```

The `!` prefix symbolizes exclusive bounds. The positive reals:

```js
path('/foo/{ someVar : (!0+,!Infinity+) }')
```

This notation would have a sensible interpretation when used directly in URIs:

```js
path('/foo/*:(!0+,!Infinity+)')
```

This would also leave us surface area for additional arguments, like a step param:

```js
path('/foo/*:(0+,Infinity+,1000+)
```

This might partition the underlying range in a step-like fashion.

Lots more to say about this, but one way to think of this is as dividing the interval into some partitions of some particular size, or on some predictable (perhaps type-specific) boundary points. A particular reduce mechanism could be specified -- could be some canned ones, could allow reduction functions to be registered somewhere, possibly could define some set of generic monoids and allow reductions to be composed from these.

For example the semantics you might expect from a range `step` function could also be thought of as something like `take(1)`: grab the first record, at most, from each partition. All kinds of generic aggregate operations could be defined like this (or just lifted from SQL). The implementation should be pretty obvious, especially if you bear in mind that `bytewise-uri` is itself an extremely powerful path syntax. While it's primarily designed around the idea of paths in database keyspaces, it can just as easily be used to reference into structed data, like JSON -- or even a superset of JSON, like `bytewise`.

In addition to controlling the boundaries of partitioning, there are also some use cases for controlling the size of the *window* in each partition. By default this would be equal to the size of the partition itself, but you may want to shrink this window, perhaps collapsing it down to a single point. This would create a comb over the keyspace that will only pick out records that fall precisely on the boundary created by your partition. This could also be put to use for typed template variables, allowing them to be constrained to the space of integers, for instance. Or refined with even more detail -- even numbers, odd numbers, numbers divisible by some `n`, etc. This approach could accomodate just about anything you could specify with set builder notation, so quite a lot! If we're careful, these type predicates should be statically verifiable, yet inexpensive enough to type check that they could be useful as runtime "guards". This would be useful for defining type-constrained API endpoints where "routing" is just type verification.

Back to key path queries, this shold also do what you'd expect:

```js
path('/foo/*:number')
```

Coming full circle, back to path templates, an unnamed template variable, number-typed:

```js
path('/foo/{ *:number }')
```

An unnamed, untyped template variable:

```js
path('/foo/{ * }')

It all hangs together pretty well.


## Template strings

The encoding function can also be used as a template string:

```js
deepEq(path`/true:/foo/null:`.data, [ true, 'foo', null ])
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
deepEq(k.data, ex)
```

Even deeply nested arrays:

```js
ex = [ 'a/B', [ 'null:', [ [], true ] ], -Infinity ]
k = path`/${ ex }/a/string:a@b.com`
eq(k.uri, '/A%2FB,(null%3A,(array:,true:)),-Infinity+)/a/a%40b.com')
deepEq(k.data, ex)
```

This works with objects too:

```js
ex = { foo: true, baz: [ '', {}, 0, { a: 1 } ], bar: '0' }
k = path`/${ ex }/s`
eq(k.uri, '/foo=true:,baz=(string:,0+,object:,(a=1)),bar=0')
deepEq(k.data, ex)
```

String template interpolations are escaped using the underlying templating functionality of the system. As part of the interpolation process, an intermediate template is created with specially-keyed variables.

Work requierd to do any actual escapement is deferred until an underlying URI string is requested, which may not ever be necessary. By leveraging the underlying templating system allows interpolation to simply replace template object placeholders with provided values. 


### Persistent immutable templates

Parsed URIs are backed by persistent immutable data structures. This property allows them to be passed around to untrusted code without fear of mutation, and offers some other interesting security and developer ergonomics benefits. But the performance benefits are even more interesting...

Stamping values in a template is just a matter of replacing variable placeholders with new data. Due to structural sharing, this is an extremely cheap operation. Structural sharing could also drastically improve the performance of encoding. The structures in a template only need to be encoding once, and this data can be shared by all template instances. When encoding an instance, only new data structures must encoded (and only the first time) -- the encoded bytewise values for all existing data structures can be reused. Encoding a bytewise value would mostly consist of copying memory around. For certain usage patterns, e.g. largish templates with smallish variable bindings, encoding performance should be in the ballpark of native JSON, a few orders of magnitude better than vanilla bytewise.

Structural sharing also makes it extremely inexpensive to join key paths together, like when you're prefixing keys with a namespace, or adding a suffix to a key to reference its "children".
