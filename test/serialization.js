var uri = require('../')
var assert = require('assert')
var eq = assert.strictEqual
var deepEq = assert.deepEqual

//
// round-trip some uris to see how well serialization holds up
//
;[
  //
  // simple
  //
  'foo',
  '/foo',
  '/foo/',
  '/foo/bar',
  '/foo/-42+',
  '/foo/-42+,a',
  '/foo/-42+,a,b',

  //
  // arrays
  //
  '()',
  '/foo/-42+,(a)',
  '/foo/-42+,(a,b)',
  '/foo,bar,baz,(quux,123+)',
  '/foo,bar,baz,(quux,123+)/',
  '/foo/bar,baz,(quux,123+),2000@',
  '/foo/bar,baz,(quux,123+),2000@/true:',

  //
  // objects
  //
  'object:',
  '/object:',
  '/foo/object:',
  '/foo/(a=1+)',
  '/foo/(a=1+,b=2)',
  '/foo/(a=1+,b=2,c=())',
  '/foo/(a=1+,b=2,c=(d))',
  '/foo/(a=1+,b=2,c=(d,foo))',
  '/foo/(a=1+,b=2,c=(d=foo),)',
  '/foo/(a=1+,b=2,c=(d=foo,e=(bar,baz)))',
  '/foo/(a=1+,b=2,c=(d=foo,e=()))',
  '/foo/(a=1+,b=2,c=(d=foo),d=(bar=baz))',

  
  // // ranges
  
  // // '*',

  
  // templates
  
  '{*}',
  '{    *    }',
  '{a}',
  '{    a    }',
  '{*:string}',
  '{a:string}',
  '{    a    :    string    }',
  '/{a%2fb:number}/',
  '/foo/{a:string}',
  '/foo/({a:string})',
  '/foo/({a:string},bar)',
  '/foo/(bar,{a:string})',
  '/foo/(bar,{a:string},baz)',
  '/foo/(bar,({a:string}),baz)',
  '/foo/(bar,((),({a:string}),),baz,)',
  '/foo/(bar,{*:foo},((a={*}),(k={a:string}),),baz,)',

].forEach(function (input) {
  var key1 = uri(input)

  // console.log('\ninput', input)
  // console.log('data', key1.data)
  // console.log('uri', key1.uri)

  var key2 = uri(key1.uri)

  deepEq(key1.data, key2.data)
  eq(key1.uri, key2.uri)
  eq(key1._input, input)
  eq(key2._input, key1.uri)
})
