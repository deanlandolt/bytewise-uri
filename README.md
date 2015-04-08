# bytewise-uri

This library implements an URI encoding scheme for concisely encoding bytewise-serializable data structures as URI paths. Legibility is optimized for the most common types used in keys -- strings, numbers, and top level arrays. If you generally stick to these types your keys should look fairly elegant.

This library also embeds all of bytewise's encoding capabilities into these URIs, so bear this in mind when reading the examples below. When designing keyspaces, the most important factor is that you can easily comprehend the sorting semantics of your keys to be able to range and query over them soundly.

`bytewise` makes this possible by eliminating the many subtle edge cases that crop up when using less formal approaches to building your indexes. `bytewise-uri` helps make this approach more legible, and goes further by providing abstractions for common patterns, like constructing range queries. But `bytewise` isn't strictly about keyspaces -- it's a general purpose binary encoding, a superset of JSON's data types with more data structures, and a general purpose type system some novel and useful characteristics.

But just because you *can* do something doesn't mean you *should*! Go ahead and use as much of `bytewise` as you need, but no more.

## Components

Here's how various types are encoded in `bytewise-uri` strings:

```js
var uri = require('./')
var assert = require('assert')
var eq = assert.strictEqual
var deepEq = assert.deepEqual

function uriEq(uri, expected) {
  deepEq(uri(uri).data, expected)
}
```

### Primitives

The colon denotes a literal, and can be used to reference primitive types as literals:

```js
uriEq('null:', null)
uriEq('void:', undefined)
uriEq('boolean:true', true)
uriEq('boolean:false', false)
```

One way to think of this syntax is as a type constructor -- everything following the colon and preceding a reserved delimiting character is like an argument to some type constructor, which (if valid) results in an "instance" of this type.


### Strings

You could create a `string` instance like this:

```js
uriEq('string:null', 'null')
```

But this is generally unnecessary. Components which don't include reserve characters are interpreted as strings automatically:

```js
uriEq('null', 'null')
```

All reserved characters in string literals must be escaped:

```js
uriEq('foo%2Bbar%40baz.com', 'foo+bar@baz.com')
```

The string constructor syntax does have one advantage over raw string literals: a few otherwise-reserved characters can be used safely within a type constructor's lexical space:

```js
uriEq('string:foo+bar@baz.com', 'foo+bar@baz.com')
```

But the list of safe characters is pretty small (just `+` and `@` for now) -- other reserved characters still have to be escaped:

```js
uriEq('string:mailto%3Afoo+bar@baz.com', 'mailto:foo+bar@baz.com')
```

But this isn't much of an improvement over the unprefixed form:

```js
uriEq('mailto%3Afoo%2Bbar%40baz.com', 'mailto:foo+bar@baz.com')
```

### Buffers

A `binary` constructor is also supported:

```js
deepEq(uri('binary:deadbeef').data, Buffer('deadbeef', 'hex'))
```


### Numbers

The number constructor syntax does what you might expect:

```js
uriEq('number:-123.45', -123.45)
```

You can use other literal forms available in ES:

```js
uriEq('number:0x22', 0x22)
uriEq('number:3.5e-4', 0.00035)
```

You can also use even use octal and binary literals from ES6:

```js
uriEq('number:0o767', 503)
uriEq('number:0b111110111', 503)
```

You can also reference positive and negative infinity:

```js
uriEq('number:Infinity', Infinity)
uriEq('number:-Infinity', -Infinity)
```

But `NaN` is not available:

```js
assert.throws(function () { uri('number:NaN') })
```

Number types are common enough to merit a literal syntax as a shorthand, which we accomodate with the `+` suffix:

```js
uriEq('-5.2+', -5.2)
uriEq('Infinity+', Infinity)
uriEq('0o767+', 503)
```

### Dates

Date constructor syntax is just ISO 8601:

```js
uriEq('date:2008-10-01', new Date('2008-10-01'))
```

Date types also get a literal syntax, using the `@` suffix:

```js
uriEq('2008-10-01@', new Date('2008-10-01'))
```

Year and month shorthands can also be used:

```js
uriEq('2008@', new Date('2008'))
```

```js
uriEq('2008-02@', new Date('2008-02'))
```

### Arrays

Arrays components are just comma-separated:

```js
uriEq('foo,null:,3+', [ 'foo', null, 3 ])
```

Arrays can be nested by using parentheses for grouping:

```js
uriEq('(foo,null:),3+', [ [ 'foo', null ], 3 ])
```

### Objects

Objects are just comma-separated key/value pairs. The keys and values are separated with an `=` character:

```js
uriEq('foo=bar,baz=3+', { foo: 'bar', baz: 3 })
```

Objects can contain neseted objects or arrays.

```js
uriEq(
  'foo=(bar=(1+,2+,3)),baz=(null:,3+)',
  { foo: { bar: [ 1, 2, '3' ] }, baz: [ null, 3 ] }
)
```

Arrays can contain objects or other arrays as well:

```js
uriEq(
  'a,(1,2,(3+,4+),(foo=bar)),b',
  [ 'a', [ '1', '2', [ 3, 4 ], { foo: 'bar' } ], 'b' ]
)
```


## URI Paths

When creating URIs for index keys (the primary use case of this library), deeply nesting values in this way is not recommended. The flatter the keyspace, the easier it should be to reason about. But at the very top level keys should generally be arrays, allowing a keyspace to be partitioned into subspaces that can be ranged over reliably.

Top level URI "paths" are a list of `/`-separated components, serialized as arrays:

```js
uriEq('/foo/bar/123+', [ 'foo', 'bar', 123 ])
```

Each component of a path may contain any of the structures documented above (and some others). Paths referencing specific keys always start with a `/` and never end with one. These are the kinds of paths you would use to store and dereference specific records (TODO: should we call these "reference paths"?). Other kinds of paths (like those ending in `/`, or containing a `/` but not beginning with one) are supported, but don't yet have any specific semantics.

Keys could be created as array components with the same `bytewise`-encoded value as some corresponding path key, i.e. these two keys are `bytewise`-identical:

```js
deepEq(uri('foo,bar,123+').encoded, uri('/foo/bar/123+').encoded)
```

In general the path form should be used when creating keys, as paths have sane rules for combinging with other paths, and resulting paths can be created without having to reencode any of reencoding of the underlying keys.


## Queries


## Prefix Intervals

String prefix searches get a shorthand form:

  /foo/200*


## Intervals

Interval notation is fine for defining ranges for atomic components but you run into trouble when you need to further refine your bounds across path components.

    /foo/2000/10/03

    /foo/?*:(2000/07,2005/07/24*)

Using the query component allows us to use slashes to express these assignments more naturally without screwing up the path hierarchy.

The query component is just parsed as a variadic component, so you can tack on additional items to the array if needed:

    /foo/?*:(2000/07,2005/07/24*),bar,123+

The path ends in a slash, which makes it more apparent that this is a scan, not a key dereference.


Any valid variadic component could be included in the query:

    /foo/?bar=baz,quux=123+

You can get www-form-urlencoded syntax by using a map literal rather than the objet literal in the previous example:

    /foo/?bar=baz&quux=123+


## Path traversal

As this a path language, we can also use the semantics to resolve paths in known objects.

Our syntax give us valid json-pointer semantics out of the box:

    uri`#/foo/0/bar`

Any path could be used to resolve keys in this way, but using the hash prefix for paths that are strictly for this purpose denotes objects created strictly for this purposes.

Since we also have typed literals, we can allow key lookup by number as well as string. Like js, both string and numeric keys could be used to deference array elements:

    uri`#/foo/0+/bar`

Things get more interesting when you introduce typed ranges:

    uri`#/foo/*:(1+,10+)/bar`

The above range would have numeric sort semantics, so you can count on results coming back in the correct order:

    /foo/1/bar
    /foo/2/bar
    ...
    /foo/10/bar

String ranges can also be used in your ranges, yielding string sort semantics:

    uri`#/foo/*:(1,10)/bar`

    /foo/1/bar
    /foo/10/bar
    /foo/2/bar
    ...
    /foo/9/bar

One way to think of these ranges is as generators for building keys that can be used to deference paths in the expected order. Multiple ranges can be combined to yield a cyclic permutatation over the defined ranges:

    uri`#/*:(!foo,foo*)/*:(1+,10+)/bar`

    /foo/fooa/1+/bar
    /foo/fooa/2+/bar
    ...
    /foo/fooa/10+/bar
    /foo/foob/1+/bar
    /foo/foob/2+/bar
    ...
    /foo/foo\xff\xff/10+/bar
    /foo/foo\xff\xff\x00/1+/bar
    /foo/foo\xff\xff\x00/2+/bar
    ...

This isn't how the implementation would actually work, of course -- just one way to reason about the syntax and what it implies. In the case of path traversal, we can index the keyspace of our target iterating over matching keys efficiently.


## Templates

Curly braces can be used to introduce template variables. These create placeholders in specific path components which can later be filled. Variable names can be any literal string, but reserved characters must be encoded:

```js
tmpl = uri('/foo/bar/{ my%24var }/baz/quux'))
eq(tmpl.fill({ my$var: 123 }).uri, '/foo/bar/123+/baz/quux')
eq(tmpl.fill({ my$var: [ true, 'false' ] }).uri, '/foo/bar/boolean:true,false/baz/quux')
```

Template variables may be unnamed:

```js
tmpl = uri('/foo/{ * },{ * }/{ a }/bar')
```

All template variables (whether named or not), can be bound by position too:

```js
eq(tmpl.fill([ 'z', [ 'y' ], { x: 1 } ]).uri, '/foo/z,(y,)/x=1,/bar')
```

Or a mix of both may be used, as shown below.

Also note that that not all variables have to be populated at once -- any unbound variables carry over to the newly generated uri instance:

```js
eq(tmpl.fill({ a: 'AAA', 0: null }).uri, '/foo/null:,{ * }/AAA/bar')
```

Binding variables on a template returns a new URI object without mutating the source template:

```js
eq(tmpl.uri = uri('/foo/{ * },{ * }/{ a }/bar')
```

Template variables can also be given a type annotation to constrain the range of legal values that it may be bound to. Providing out-of-bounds variable bindings results in an empty template:

```js
tmpl = uri('/foo/{ someVar : number },baz')

eq(tmpl.fill({ someVar: 3 }).uri, '/foo/3+/baz')
assert.equal(tmpl.fill({ someVar: '3' }), null)

eq(tmpl.fill([ -2.5 }).uri, '/foo/-2.5+/baz')
assert.equal(tmpl.fill([ '-2.5' ]), null)
```

Template variables can be used anywhere you might expect to be able to use parentheses to form a group. Attempting to use a template variable to represent only a portion of a given path component will result in an exception:

```js
assert.throws(() => uri('/foo/bar/{ badVar }:baz/quux'))
assert.throws(() => uri('/foo/bar/baz:{ badVar }/quux'))
assert.throws(() => uri('/foo/bar/baz/{ badVar }+/quux'))
// etc...
```

## Templates as queries

Another way of thinking of key range "templates" is as a kind of query. Template variables define the areas of the keyspace a given template can range over. Consider this template:

```js
uri('/foo/{ someVar }')
```

This would almost correspond to the query:

```js
{ gte: '/foo/null:', lte: '/foo/void:' }
```

Things can get messy if you're storing things with `void` keys (maybe for secondary index reasons, or maybe you're just batshit crazy...). To fix this we define out-of-bounds primitives that can be used in range queries to represent the absolute lower and upper bounds -- `0x00` and `0xFF`, respectively:

This can be thought of as a query that ranges over *any* `foo` value:

```js
{ gt: '/foo/bottom:', lt: '/foo/top:' }
```

This is analogous to an `any` type. Thinking of a template as a predicate function, *any* value for `someVar` could be used. But this could be further refined by adding a type declaration to narrow the query space:

```js
uri('/foo/{ someVar:number }')
```

This would correspond to a query like this:

```js
{ gte: '/foo/Infinity+:', lte: '/foo/-Infinity+' }
```

### Ranges as type annotations

We could allow type annotations to specify arbitrary ranges right inline, reusing our range notation.

For example, refining a type to the range of non-negative reals, the interval `0 <= x < Infinity`, might look like this:

```js
uri('/foo/{ someVar:(0+,!Infinity+) }')
```

The `!` prefix symbolizes exclusive bounds. The positive reals:

```js
uri('/foo/{ someVar:(!0+,!Infinity+) }')
```

This notation would have a sensible interpretation when used directly in URIs:

```js
uri('/foo/*:(!0+,!Infinity+)')
```

This syntax also leave us surface area for additional arguments, like a step param:

```js
uri('/foo/*:(0+,Infinity+,step=1000+)
```

This might partition the underlying range in a step-like fashion.

Lots more to say about this, but one way to think of this is as dividing the interval into some partitions of some particular size, or on some predictable (perhaps type-specific) boundary points. A particular reduce mechanism could be specified -- could be some canned ones, could allow reduction functions to be registered somewhere, possibly could define some set of generic monoids and allow reductions to be composed from these.

For example the semantics you might expect from a range `step` function could also be thought of as something like `take(1)`: grab the first record, at most, from each partition. All kinds of generic aggregate operations could be defined like this (or just lifted from SQL). The implementation should be pretty obvious, especially if you bear in mind that `bytewise-uri` is itself an extremely powerful path syntax. While it's primarily designed around the idea of paths in database keyspaces, it can just as easily be used to reference into structed data, like JSON -- or even a superset of JSON, like `bytewise`.

In addition to controlling the boundaries of partitioning, there are also some use cases for controlling the size of the *window* in each partition. By default this would be equal to the size of the partition itself, but you may want to shrink this window, perhaps collapsing it down to a single point. This would create a comb over the keyspace that will only pick out records that fall precisely on the boundary created by your partition. This could also be put to use for typed template variables, allowing them to be constrained to the space of integers, for instance. Or refined with even more detail -- even numbers, odd numbers, numbers divisible by some `n`, etc. This approach could accomodate just about anything you could specify with set builder notation, so quite a lot! If we're careful, these type predicates should be statically verifiable, yet inexpensive enough to type check that they could be useful as runtime "guards". This would be useful for defining type-constrained API endpoints where "routing" is just type verification.

Back to key path queries, this should also do what you'd expect:

```js
uri('/foo/number:*')
```

You could think of this as "desugaring" to the conceptual interval `[number.bound.lower, number.bound.upper]`. But in with this syntax we wouldn't even need to add any special `top:` or `bottom:` types -- we could just reuse `*` notation:

```js
uri('/foo/*(number:*,number:*)')
```

On the left side of an interval `number:*` implies the very bottom of the range defiend by the type. On the right, the very top. In the case of `number` this would correspond to `number:-Infinity` and `number:Infinity`, respectively. But `number` is the exception, not the rule. The top side of most types is usually inaccessible as an actual value. In the case of `date`, both top and bottom are inaccessible -- there is *infinitary* date value, positive or negative.

To reference all values from, e.g. the `2000` onward, you could conjure up a far-future date, or you could just do this:

```js
uri('/foo/*(2000@,date:*)')
```

And rather than having to mint special `TOP` and `BOTTOM` instances for the `any` type, we can just use the standalone `*` syntax. On the left side of an interval this means `bottom`, on the right, `top`. To range over all values from the number 0 to `TOP`:

```js
uri('/foo/*(0+,*)')
```

Ranging from `any.bound.lower` to `any.bound.upper`:

```js
uri('/foo/*(*,*)')
```

In this case, the refinement `(*,*)` is superfluous, and this could be written more succinctly:

```js
uri('/foo/*')
```

Whatever the form, the fact that this is not a simple key (or, a possibly inhabited *instance*), but some kind of query or type definition. These two concepts are deeply related in this syntax, just as they should be -- they are completely dual. The fact that these keys represent ranges over a keyspace is made explicit with the presence of the `*` prefix.

The intent of the underlying range should be readily apparent to the reader -- legitble to humans as well as machines, and not just arbitrary "growlix" characters assembled with complex rules. The `*` operator has a coherent meaning in its various forms, and the `!` prefix operator is used only only within interval refinement forms (the parenthetical `*(x,y)` form), and only to denote exclusive bounds.

Coming full circle, back to templates -- an unnamed template variable, number-typed, might look like this:

```js
uri('/foo/{ * : number }')
```

An unnamed, untyped template variable:

```js
uri('/foo/{ * : * }')
```

The any type is the default, so this could be shortened to:

```js
uri('/foo/{ * }')
```

The leading `*` represents an unnamed variable. Naming the variable just involves replaces the leading `*` with a string representing the name:

```js
uri('/foo/{ someVar : date }')
```

A named variable with the `any`-type:

```js
uri('/foo/{ someVarv : * }')
```

Again, the any type is implied so this could be shortened to:

```js
uri('/foo/{ someVar }')
```

You can even define refined intervals for your variable's type. For instance, to define a value space representing the positive real numbers:

A named variable with the `any`-type:

```js
uri('/foo/{ someVarv : *(!0+,!Infinity*) }')
```

It all hangs together pretty well. Queries are type defs and vice versa. Defining a template variable just punches a "hole" in the underlying data structure. We can efficiently type check, and even determine subtype relationships, with a few buffer comparisons.


## Template strings

The encoding function can also be used as a template string:

```js
deepEq(uri`/boolean:true/foo/null:`.data, [ true, 'foo', null ])
```

Interpolated variables will be strongly typed when encoded:

```js
deepEq(uri`/a/${ 0 }/${ new Date('2000') }`.data, [ 'a', 0, new Date('2000') ] }
```

String variables will be URI encoded automatically:

```js
eq(uri`/b/${ 'C/d@e.f%G' }/h' }`.data, [ '/b/C%2Fd%40e.f%25G/h' ])
```

Array variables will also be correctly encoded:

```js
data = [ 'c/d', false, 'null:', 20*-3 ]
key = uri`/a/b/${ ex }`
eq(key.uri, '/a/b/c%Fd,boolean:false,null%3A,-60+')
deepEq(k.data, data)
```

Even deeply nested arrays:

```js
data = [ 'a/B', [ 'null:', [ [], true ] ], -Infinity ]
key = uri`/${ data }/a/string:a@b.com`
eq(key.uri, '/A%2FB,(null%3A,(array:,boolean:true)),-Infinity+)/a/a%40b.com')
deepEq(key.data, data)
```

This works with objects too:

```js
data = { foo: true, baz: [ '', {}, 0, { a: 1 } ], bar: '0' }
key = uri`/${ data }/s`
eq(key.uri, '/foo=boolean:true,baz=(string:,0+,object:,(a=1)),bar=0')
deepEq(key.data, data)
```

You can use a string interpolation to create a template variable, and get escapement for free:

```js
tmpl = uri('/foo/bar/${ uri.types.variable('my$var') }/baz/quux'))
eq(tmpl.fill({ my$var: 123 }).uri, '/foo/bar/123+/baz/quux')
```

String template interpolations are escaped using the underlying templating functionality of the system. As part of the interpolation process, an intermediate template is created with specially-keyed variables. This ensures that template interpolations may only represent atomic components -- they can't span across multiple components and accidentally "jump" the namespace, which eliminates potential injection attacks.

The work required to do any actual escapement is deferred until the first time the underlying URI string is requested, which may be never (this should be the case for most usage patterns). By leveraging the underlying templating system allows interpolation to simply replace template object placeholders with provided values. 


### Templates and persistent immutable data

Parsed URIs are backed by persistent immutable data structures. This property allows them to be passed around to untrusted code without fear of mutation, and offers some other interesting security and developer ergonomics benefits. But the performance benefits are even more interesting...

Stamping values in a template is just a matter of replacing variable placeholders with new data. Due to structural sharing, this is an extremely cheap operation. Structural sharing could also drastically improve the performance of encoding. The structures in a template only need to be encoding once, and this data can be shared by all template instances. When encoding an instance, only new data structures must encoded (and only the first time) -- the encoded bytewise values for all existing data structures can be reused. Encoding a bytewise value would mostly consist of copying memory around. For certain usage patterns, e.g. largish templates with smallish variable bindings, encoding performance should be in the ballpark of native JSON, a few orders of magnitude better than vanilla bytewise.

Structural sharing also makes it extremely inexpensive to join key paths together, like when you're prefixing keys with a namespace, or adding a suffix to a key to reference its "children".

```
var namespace = uri('/some/app/namespace')
var partialRoute = uri('/foo/bar/{ foo:number }')

// paths can be stacked together like "sublevels", but with nice clean keyspaces
var fullRoute = namespace.append(partialRoute)

// or go the other way:
fullRoute = partialRoute.prepend(namespace)


// req.url === '/some/app/namespace/foo/bar/-12.3+'
if (fullRoute.match(req.url)) {
  // should be very cheap to reexecute match
  var context = fullRoute.match(req.url)
  context.variables.foo === -12.3
}
```
