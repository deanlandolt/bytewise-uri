var uri = require('../')
var assert = require('assert')
var eq = assert.strictEqual
var deepEq = assert.deepEqual

//
// round-trip some uris to see how well serialization holds up
//
;[
  'foo',
  '/foo',
  '/foo/',
  '/foo/bar',
  '/foo/-42+',
  '/foo/-42+,a',
  '/foo/-42+,a,b',
  '/foo/-42+,(a)',
  '/foo/-42+,(a,b)',
  '/foo,bar,baz,(quux,123+)',
  '/foo,bar,baz,(quux,123+)/',
  '/foo/bar,baz,(quux,123+),2000@',
  '/foo/bar,baz,(quux,123+),2000@/true:',

  // objects
  '/foo/object:',
  '/foo/(a=1+)',
  '/foo/(a=1+,b=2)',
  '/foo/(a=1+,b=2,c=())',
  // '/foo/(a=1+,b=2,c=(d))',
  // '/foo/(a=1+,b=2,c=(d,foo))',
  // '/foo/(a=1+,b=2,c=(d=foo))',
  // '/foo/(a=1+,b=2,c=(d=foo,e=(bar,baz)))',
  // '/foo/(a=1+,b=2,c=(d=foo,e=()))',
  // '/foo/(a=1+,b=2,c=(d=foo),d=(bar=baz))',
].forEach(function (input) {
  var key1 = uri(input)

  // console.log(input, key1.data, key1.uri)

  var key2 = uri(key1.uri)

  deepEq(key1.data, key2.data)
  eq(key1.uri, key2.uri)
  eq(key1._input, input)
  eq(key2._input, key1.uri)
})
