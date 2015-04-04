var path = require('../')
var assert = require('assert')
var bytewise = require('bytewise-core')
require('./serialization')

function uriEq(uri, expected) {
  var result = path(uri)
  assert.deepEqual(result.data, expected)
  assert.equal(result + '', bytewise.encode(expected) + '')
}

function throws(message, uri) {
  assert.throws(function () { path(uri) }, message + ': "' + uri + '"')
}


var fails = []

fails.push('trailing comma required in structured types', [
  // array literals

  // array ctors

  // object literals

  // object ctors
])

fails.push('no holes in structured types', [
  // array literals
  ',',
  ',,',
  'a,,',
  'a,,b',
  'a,b,,',

  // array ctors
  // 'array:,',
  'array:,,',
  'array:a,,',
  'array:a,,b',
  'array:a,b,,',

  // object literals

  // object ctors
])

fails.push('both key and value components required in record-like types', [
  // object literals

  // object ctors

])

// fails.push('', [
//   'array:a',
// ])
// .map(throws.bind(null, 'trailing comma required for 1-element arrays'))


// fails.push('', [
//   '',
//   'a=b,b',
// ])
// .map(throws.bind(null, '= required in every component of object literal'))


var invalidDates = [
  '2',
  '20',
  '200',
  '2000-13-10',
  '2000-10-32',
  '2000-10-10T',
  '2000-10-10T00',
  '2000-10-10T00:',

  // complete date component required when time provided
  '2000-1-10T00:00:00',
  '2000-10-1T00:00:00',
  '2000-10-10T0:00:00',

  // time component must be complete too
  '2000-10-10T00:0:00',
  '2000-10-10T00:00:0',

  // tz component must be complete and correct
  '2000-10-10T00:00:00A',
  '2000-10-10T00:00:00+Z',
  '2000-10-10T00:00:00+1',
  '2000-10-10T00:00:00+0',
  '2000-10-10T00:00:00+0Z',
  '2000-10-10T00:00:00+01',
  '2000-10-10T00:00:00+01:',
  '2000-10-10T00:00:00+01:0',
  '2000-10-10T00:00:00+01:0Z',
  '2000-10-10T00:00:00-Z',
  '2000-10-10T00:00:00-1',
  '2000-10-10T00:00:00-0',
  '2000-10-10T00:00:00-0Z',
  '2000-10-10T00:00:00-01',
  '2000-10-10T00:00:00-01:',
  '2000-10-10T00:00:00-01:0',
  '2000-10-10T00:00:00-01:0Z',
]

invalidDates.forEach(function (v, i) {
  // date literals
  invalidDates[i] = v + '@'

  // date ctors
  invalidDates.push('date:' + v)
})

fails.push('somewhat restricted ES6-based date parsing', invalidDates)

// path prefix and suffix combinations to test various failure scenarios
var contexts = [
  [ '', '' ],
  [ '/', ''],
  [ '/a/', '' ],
  [ '/a/', '/b' ],
  [ '/a/(', ')' ],
  [ '/a/(', ')/b' ],
  [ '/a/(b,(', '),/b' ],
]

for (var i = 0, len = fails.length; i < len;) {
  var message = fails[i++]
  var variations = fails[i++]
  contexts.forEach(function (context) {
    variations.map(throws.bind(null, message))
  })
}


// general insanity

uriEq('/foo/baz,/(-12.3+,(2344-10-10@,bar,d,(a,b,())))', [
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
,d,(a,false:,(string%3Atrue,null:))))'

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
