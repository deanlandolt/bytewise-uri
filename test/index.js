var path = require('../')
var assert = require('assert')
var bytewise = require('bytewise-core')
require('./serialization')

function uriEq(uri, expected) {
  var key = path(uri)
  assert.deepEqual(key.data, expected)
  assert.equal(key.encoding + '', bytewise.encode(expected) + '')
}

//
// general insanity
//

uriEq('/foo/baz,/(-12.3+,(2344-10-10@,bar,d,(a,b,array:)))', [
  'foo',
  [ 'baz' ],
  [
    -12.3,
    [
      new Date('2344-10-10'),
      'bar',
      'd',
      [ 'a', 'b', [] ]
    ]
  ]
])

var key = '/foo,/(345+,-12.3+,(2010-10-10T10:10:10-05:00@,bar,0x22,0x22+,0o777+\
,d,(a,boolean:false,(string%3Atrue,null:))))'

uriEq(key, [
  [ 'foo' ],
  [
    345,
    -12.3,
    [
      new Date('2010-10-10T10:10:10-05:00'),
      'bar',
      '0x22',
      0x22,
      511,
      'd',
      [
        'a',
        false,
        [ 'string:true', null ]
      ]
    ]
  ]
])
