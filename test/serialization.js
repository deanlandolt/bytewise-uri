var uri = require('../')
var base = require('../base')
var assert = require('assert')

var eq = assert.strictEqual
var deepEq = assert.deepEqual
var RANGE = base.serialization.RANGE
var VARIABLE = base.serialization.VARIABLE

function throws(input) {
  assert.throws(function () { uri(input) }, 'should throw: "' + input + '"')
}

//
// round-trip some uris to see how well serialization holds up
//
var pairs = [
  //
  // primitives
  //
  'null:',
    null,
  'void:',
    void 0,
  'void:foo',
    void 0,
  'void:123+',
    void 0,
  'void:a:',
    throws,
  'void:a/b',
    throws,
  'void:a()',
    throws,
  'boolean:true',
    true,
  'boolean:false',
    false,
  'boolean:true:',
    throws,
  'boolean:false:',
    throws,
  'boolean:xxx',
    throws,

  //
  // numbers
  //
  '0+',
    0,
  '-0+',
    0,
  '1+',
    1,
  '-1+',
    -1,
  '42.35+',
    42.35,

  // exponential
  '2.5e4+',
    25000,
  '2.5e4',
    '2.5e4',
  '2.5e-4+',
    0.00025,
  '2.5e-4',
    '2.5e-4',

  // hex
  '0x18+',
    24,
  '0x18',
    '0x18',
  '-0x18+',
    throws,
  '-0x18',
    '-0x18',

  // octal
  '0o767+',
    503,
  '0o767',
    '0o767',
  '-0o767+',
    throws,
  '-0o767',
    '-0o767',

  // binary
  '0b111110111+',
    503,
  '0b111110111',
    '0b111110111',
  '-0b111110111+',
    throws,
  '-0b111110111',
    '-0b111110111',

  //
  // dates
  //
  '0000@',
    new Date('0000-01-01'),
  '2000@',
    new Date('2000-01-01Z'),
  '2000-10-10@',
    new Date('2000-10-10T00:00:00Z'),
  '2000-10-10T00:00:00Z@',
    new Date('2000-10-10T00:00:00Z'),
  '2010-10-10T10:10:10-05:00@',
    new Date('2010-10-10T10:10:10-05:00'),
  
  // // strict parsing
  // '0@', throws,
  // '00@', throws,
  // '000@', throws,
  // '0000-01-01Z@', throws,
  // '2@', throws,
  // '20@', throws,
  // '200@', throws,
  // '2000-13-10@', throws,
  // '2000-10-32@', throws,
  // '2000-10-10T@', throws,
  // '2000-10-10T00@', throws,
  // '2000-10-10T00:@', throws,

  // // complete date component required when time provided
  // '2000-1-10T00:00:00@', throws,
  // '2000-10-1T00:00:00@', throws,
  // '2000-10-10T0:00:00@', throws,

  // // time component must be complete too
  // '2000-10-10T00:0:00@', throws,
  // '2000-10-10T00:00:0@', throws,

  // // tz component must be complete and correct
  // '2000-10-10T00:00:00A@', throws,
  // '2000-10-10T00:00:00+Z@', throws,
  // '2000-10-10T00:00:00+1@', throws,
  // '2000-10-10T00:00:00+0@', throws,
  // '2000-10-10T00:00:00+0Z@', throws,
  // '2000-10-10T00:00:00+01@', throws,
  // '2000-10-10T00:00:00+01:@', throws,
  // '2000-10-10T00:00:00+01:0@', throws,
  // '2000-10-10T00:00:00+01:0Z@', throws,
  // '2000-10-10T00:00:00-Z@', throws,
  // '2000-10-10T00:00:00-1@', throws,
  // '2000-10-10T00:00:00-0@', throws,
  // '2000-10-10T00:00:00-0Z@', throws,
  // '2000-10-10T00:00:00-01@', throws,
  // '2000-10-10T00:00:00-01:@', throws,
  // '2000-10-10T00:00:00-01:0@', throws,
  // '2000-10-10T00:00:00-01:0Z@', throws,

  //
  // strings
  //
  'foo',
    'foo',
  'foo%2Fbar',
    'foo/bar',
  'null',
    'null',
  'undefined',
    'undefined',
  'boolean%3Atrue',
    'boolean:true',
  'foo%2Bbar%40baz.com',
    'foo+bar@baz.com',
  'string:foo+bar@baz.com',
    'foo+bar@baz.com',
  'string:null',
    'null',
  'string:null:',
    throws,

  //
  // binary
  //
  'binary:deadbeef',
    new Buffer('deadbeef', 'hex'),
  'binary:dEaDbEeF',
    new Buffer('deadbeef', 'hex'),
  'binary:abcdef',
    new Buffer('abcdef', 'hex'),
  'binary:abcedfg',
    throws,

  //
  // arrays
  //
  'array:',
    [],
  'array:a',
    throws,
  'array:a,',
    throws,
  'array:a,b',
    throws,
  'a,',
    [ 'a' ],
  'a,b',
    [ 'a', 'b' ],
  '(a)',
    [ 'a' ],
  '(a,)',
    [ 'a' ],
  '(a,b)',
    [ 'a', 'b' ],
  '(a,b),',
    [ [ 'a', 'b' ] ],
  '((a,b))',
    [ [ 'a', 'b' ] ],
  '((a,b)),',
    [ [ [ 'a', 'b' ] ] ],
  '-42+,a',
    [ -42, 'a' ],
  '-42+,a,b',
    [ -42, 'a', 'b' ],
  '-42+,(a)',
    [ -42, [ 'a' ] ],
  '-42+,(a,b)',
    [ -42, [ 'a', 'b' ] ],
  '-42+,(a,b,)',
    [ -42, [ 'a', 'b' ] ],
  'foo,bar,(baz,quux,123+)',
    [ 'foo', 'bar', [ 'baz', 'quux', 123 ] ],
  'foo,bar,(baz,quux,123+,),',
    [ 'foo', 'bar', [ 'baz', 'quux', 123 ] ],
  'foo,bar,(baz,(quux,123+))',
    [ 'foo', 'bar', [ 'baz', [ 'quux', 123 ] ] ],
  'foo,bar,(baz,(quux,123+),),',
    [ 'foo', 'bar', [ 'baz', [ 'quux', 123 ] ] ],

  // structured
  'array:(1,2+,3)',
    [ '1', 2, '3' ],
  'array:(1,2+,3',
    throws,
  'array:1,2+,3)',
    throws,
  'array:1,2+,3',
    throws,

  //
  // objects
  //
  // 'object:',
  //   {},
  // 'a=1+',
  //   { a: 1 },
  // 'a=1+,b=2',
  //   { a: 1, b: '2' },
  // 'a=1+,b=2,c=array:',
  //   { a: 1, b: '2', c: [] },
  // 'a=1+,b=2,c=(d)',
  //   { a: 1, b: '2', c: [ 'd' ] },
  // 'a=1+,b=2,c=(d,foo)',
  //   { a: 1, b: '2', c: [ 'd', 'foo' ] },
  // 'a=1+,b=2,c=(d=foo),',
  //   { a: 1, b: '2', c: { d: 'foo' } },
  // 'a=1+,b=2,c=(d=foo,e=array:)',
  //   { a: 1, b: '2', c: { d: 'foo', e: [] } },
  // 'a=1+,b=2,c=(d=foo,e=(bar,baz))',
  //   { a: 1, b: '2', c: { d: 'foo', e: [ 'bar', 'baz' ] } },
  // 'a=1+,b=2,c=(d=foo),d=(bar=baz)',
  //   { a: 1, b: '2', c: { d: 'foo' }, d: { bar: 'baz' } },

  //
  // key paths
  //
  '/foo',
    [ 'foo' ],
  '/foo/bar',
    [ 'foo', 'bar' ],
  '/foo/-42+',
    [ 'foo', -42 ],
  '/foo/2000@',
    [ 'foo', new Date('2000') ],
  '/foo/string:/bar',
    [ 'foo', '', 'bar' ],
  '/foo//bar',
    throws,

  //
  // prefix, suffix, infix paths
  //

  // //
  // // maps (order-preserving)
  // //
  // 'a=b&', // map([ 'a', 'b' ])
  // 'a=b&a=c', // map([ 'a', 'c' ])
  // 'a=c&a=b', // map([ 'a', 'b' ])
  // 'b=c&a=b', // map([ 'b', 'c' ], [ 'a', 'b' ])
  // 'a=b&c=1', // map([ 'a', 'b' ], [ 'c', '1' ])
  // 'a=b&c=1+', // map([ 'a', 'b' ], [ 'c', 1 ])
  // 'a=b&c=1+&', // map([ 'a', 'b' ], [ 'c', 1 ])

  // //
  // // sets (order-preserving)
  // //
  // 'a&', // set('a')
  // 'a&a', // set('a')
  // 'a&b', // set('a', 'b')
  // 'b&a', // set('b', 'a')
  // 'a&b&', // set('a', 'b')
  // 'a&b&a', // set('a', 'b')
  // 'a&b&(a)', // set('a', 'b', [ 'a' ])
  // 'a&b&(a&)', // set('a', 'b', set('a'))

  // //
  // // tuples (shortlex-sorted arrays)
  // //
  // 'a;', // tuple('a')
  // '/a;', // [ tuple('a') ]
  // '/foo/a;', // [ 'foo', tuple('a') ]
  // '/foo/a;b', // [ 'foo', tuple('a', 'b') ]
  // '/foo/b;a', // [ 'foo', tuple('b', 'a') ]
  // '/foo/a;b;', // [ 'foo', tuple('a', 'b') ]
  // '/foo/a;b;c', // [ 'foo', tuple('a', 'b', 'c') ]
  // '/foo/2000;', // [ 'foo', tuple('2000') ]
  // '/foo/2000;02', // [ 'foo', tuple('2000', '02') ]
  // '/foo/2000;02;', // [ 'foo', tuple('2000', '02') ]
  // '/foo/2000;02;03', // [ 'foo', tuple('2000', '02', '03') ]
  // '/foo/US;', // [ 'foo', tuple('US') ]
  // '/foo/US;MD', // [ 'foo', tuple('US', 'MD') ]
  // '/foo/US;(MD)', // [ 'foo', tuple('US'), [ 'MD' ] ]
  // '/foo/US;(MD;)', // [ 'foo', tuple('US', tuple('MD')) ]

  // //
  // // records (shortlex-sorted objects)
  // //
  // 'a=b;', // record([ 'a', 'b' ])
  // 'a=b;c=d', // record([ 'a', 'b' ], [ 'c', 'd'] )
  // 'a=b;c=d;', // record([ 'a', 'b' ], [ 'c', 'd' ])
  // 'a=b;c=d;e=0+', // record([ 'a', 'b' ], [ 'c', 'd' ], [ 'e', 0 ])
  // 'a=b;c=(0+)', // record([ 'a', 'b' ], 'c', [ 0 ])
  // 'a=b;c=(0+,)', // record([ 'a', 'b' ], 'c', [ 0 ])
  // 'a=b;c=(0+;)', // record([ 'a', 'b' ], 'c', tuple(0))
  // 'a=b;c=(0+,@2000)', // record([ 'a', 'b' ], 'c', [ 0, new Date('2000') ])
  // 'a=b;c=(0+;@2000)', // record([ 'a', 'b' ], [ 'c', tuple([ new Date('2000') ]) ])
  // 'a=b;c=(d=0+;)', // record([ 'a', 'b' ], [ 'c', record([ 'd', 0 ]) ])

  // //
  // // ranges
  // //
  // '*',
  // '*:(*,*)',

  // // number
  // '*:number',
  // '*:array:',
  // '*:(0+,0+)',
  // '*:(number:0,number:0)',
  // '*:(!0+,1+)',
  // '*:(0+,!1+)',
  // '*:(number:0,!number:1)',

  //
  // templates
  //
  '{*}',
    VARIABLE.revive([]),
  '{ * }',
    VARIABLE.revive([]),
  '{    *    }',
    VARIABLE.revive([]),
  '{a}',
    VARIABLE.revive([ 'a' ]),
  '{ a }',
    VARIABLE.revive([ 'a' ]),
  '{    a    }',
    VARIABLE.revive([ 'a' ]),
  '{ * : string}',
    VARIABLE.revive([ '', 'string' ]),
  '{ a : string}',
    VARIABLE.revive([ 'a', 'string' ]),
  '{    a    :    string    }',
    VARIABLE.revive([ 'a', 'string' ]),
  '/{ a%2fb:number }/',
    [ VARIABLE.revive([ 'a/b', 'number' ]) ],
  '/foo/{ a : string }',
    [ 'foo', VARIABLE.revive([ 'a', 'string' ]) ],
  '/foo/({ a : string })',
    [ 'foo', [ VARIABLE.revive([ 'a', 'string' ]) ] ],
  '/foo/({ a : string },bar)',
    [ 'foo', [ VARIABLE.revive([ 'a', 'string' ]), 'bar' ] ],
  '/foo/(bar,{ a:string })',
    [ 'foo', [ 'bar', VARIABLE.revive([ 'a', 'string' ]) ] ],
  '/foo/(bar,{ a : string },baz)',
    [ 'foo', [ 'bar', VARIABLE.revive([ 'a', 'string' ]), 'baz' ] ],
  '/foo/(bar,({ a : string }),baz)',
    [ 'foo', [ 'bar', [ VARIABLE.revive([ 'a', 'string' ]) ], 'baz' ] ],
  '/foo/(bar,(array:,({ a :string }),),baz,)',
    [ 'foo', [ 'bar', [ [], [ VARIABLE.revive([ 'a', 'string' ]) ] ], 'baz' ] ],
  // '/foo/(bar,{ * : foo },((a={ * }),(k={ a : string }),),baz,)',
  //   [
  //     'foo', [
  //       'bar',
  //       VARIABLE.revive([ '', 'foo' ]),
  //       [
  //         { a: VARIABLE.revive([]) },
  //         { k: VARIABLE.revive([ 'a', 'string' ]) }
  //       ],
  //       'baz'
  //     ]
  //   ]

  // //
  // // recursive ranges
  // //
  // '**',
  // '/**',
  // '/foo/**',
  // '/foo/**:string'

]

for (var i = 0, len = pairs.length; i < len; i += 2) {
  var input = pairs[i]
  var expected = pairs[i + 1]

  // console.log('\ninput:', input)

  if (expected === throws) {
    throws(input)
    continue
  }

  var key1 = uri(input)
  // console.log('uri', key1.uri)
  deepEq(key1.data, expected)

  // serialize expected data as uri and compare
  eq(uri.data(expected, input[0] === '/').uri, key1.uri)

  var key2 = uri(key1.uri)

  deepEq(key2.data, expected)
  eq(key1.uri, key2.uri)
  eq(key1._input, input)
  eq(key2._input, key1.uri)
}
