var assert = require('assert')
var path = require('../')

var key, tmpl

// string templates with type preservation and auto-escapement
key = path`/${ 'foo:ordered' }/${ 20.2 }/widgets/${ { 'free-shipping': false } }`
assert.equal(key.uri, '/foo%3Aordered/20.2+/widgets/free-shipping=false:')
assert.deepEqual(key.data, [ 'foo:ordered', 20.2, 'widgets', { 'free-shipping': false } ])

// nested structures escaped correctly
key = path`/foo,${ [ [ [ 'a', [ true, 'true' ] ], 2 ] ] },bar`
assert.equal(key.uri, '/foo,(((a,(true:,true)),2+)),bar')


// uri templates
tmpl = path('/ordered/{ :val }/{ :type }')
tmpl({ type: 'widgets', val: 20.2 }).uri === 'ordered/20.2+/widgets'
tmpl({ type: 'widgets/foo', val: -3 }).uri === 'ordered/-3+/widgets%2Ffoo'


tmpl = path('/ordered/{ number:val }/{ :type }')
assert.throws(() => mpl({ val: '20.2', type: 'widgets' }))