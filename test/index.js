var key = require('../')
var assert = require('assert')
var bytewise = require('bytewise-core')

function eq(uri, expected) {
  var result = key(uri)
  assert.deepEqual(result.valueOf(), expected)
  assert.equal(result + '', bytewise.encode(expected) + '')
}

function throws(message, uri) {
  assert.throws(key(uri), message + ': ' + uri)
}

eq(
  '/foo,/(345+-123+,(2010-10-10T10:10:10-05:00@,bar,0x22,0x22+,0o777+,d,(a,false:,(string%3Atrue,null:))))',
  [
     [
        "foo"
     ],
     [
        222,
        [
           new Date('2010-10-10T10:10:10-05:00'),
           "bar",
           "0x22",
           34,
           511,
           "d",
           [
              "a",
              false,
              [
                 "string:true",
                 null
              ]
           ]
        ]
     ]
  ]
)

eq(
  '/foo/baz,/(-12.3+,(2344-10-10@,bar,d,(a,b,(array:))))',
  [
     "foo",
     [
        "baz"
     ],
     [
        -12.3,
        [
           new Date('2344-10-10'),
           "bar",
           "d",
           [
              "a",
              "b",
              []
           ]
        ]
     ]
  ]
)


[
  '',
  '/',
  '//',
  '//a',
  '//a/',
  '/a//',
  '/a//b',
  '/a//b/',
].map(throws)

  ',',
  '/,',
].map(throws)

[
  'array:', [],
  '/array:', [ [] ],
  '/array:,', [ [ [] ] ],
  '/array:a,', [ [ 'a' ] ],
  '/array:/a,', [ [], [ 'z' ] ],
]


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
  'a,b,,'

  // array ctors
  'array:,',
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

fails.push('', [
  'array:a',
])
.map(throws.bind(null, 'trailing comma required for 1-element arrays'))


fails.push('', [
  '',
  'a=b,b',
])
.map(throws.bind(null, '= required in every component of object literal'))


var invalidDates = []
[
  '2',
  '20',
  '200',
  '2000-',
  '2000-1',
  '2000-1-',
  '2000-10-',
  '2000-10-1',
  '2000-13-10',
  '2000-10-32',
  '2000-10-10T',
].forEach(function (v) {
  // date literals
  invalidDates.push(v + '@')

  // date ctors
  invalidDates.push('date:' + v)
})
fails.push('strict ISO date parsing', invalidDates)


// key prefix and suffix combinations to test various failure scenarios
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
  var message = fails[++i]
  var variations = fails[++i]
  contexts.forEach(function (context) {
    variations.map(throws.bind(null, message)
  })
}


// Y U NO WORK, ungrouped array?
// /foo/baz,/(123+,(2344-10-10@,bar,d,(a,b,array:)))

