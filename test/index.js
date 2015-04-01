var key = require('../')
var assert = require('assert')
var bytewise = require('bytewise-core')

function eq(uri, expected) {
  var result = key(uri)
  assert.deepEqual(result.valueOf(), expected)
  assert.equal(result + '', bytewise.encode(expected) + '')
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


// Y U NO WORK, ungrouped array?
// /foo/baz,/(123+,(2344-10-10@,bar,d,(a,b,array:)))

