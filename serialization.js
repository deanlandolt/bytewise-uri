var assert = require('assert')
var base = require('bytewise-core/base')
var codecs = require('bytewise-core/util/codecs')
var immutable = require('immutable')
var parser = require('./parser')

//
// utilties for serializing uri strings
//
function getSerializer(instance) {
  for (var name in types) {
    var type = types[name]
    var sort = type && type.stringify && type.sort
    if (sort && sort.is && sort.is(instance))
      return type
  }
  assert(false, 'Cannot serialize value: ' + instance)
}

function serialize(instance, nested) {
  return getSerializer(instance).stringify(instance, nested)
}

//
// serializes a data structure into bytewise uri strings
//
exports.stringify = function (instance, config) {
  config || (config = {})

  //
  // serialize as '/'-separated path
  //
  if (config.path) {
    assert.ok(Array.isArray(instance), 'Array instance required for path')

    var elements = []
    var len = instance.length
    assert(len || config.index, 'Cannot serialize empty path')
    for (var i = 0; i < len; ++i)
      elements.push(serialize(instance[i]))
    return '/' + elements.join('/') + (config.index ? '/' : '')
  }

  //
  // top-level arrays serialize as '/'-prefixed paths
  //
  assert(!config.index, 'Array required for path index')
  return serialize(instance)
}

//
// utility for parsing bytewise uri instances into data structures
//
exports.parse = function (string) {
  //
  // TODO: return data as persistent immutable data structure
  //
  return parser.parse(string)
}



// `parse` method is always invoked on values starting with a `<prefix>:` value
// may be skipped bypassed by parser for literal forms parser has syntax for
// `stringify` invoked for serializing all values
// this method is responsible for doing type annotations and escapement

//
// boundary types
//
// TODO

//
// helper for registering serializers on nullary types
//
var registerNullary = function (name, sort) {
  types[name] = {
    sort: sort,
    parse: function (string) {
      assert(string.length === 0, 'Nullary constructor should be empty')
      return sort.value
    },
    stringify: function (instance) {
      return sort.value + ':'
    }
  }
}

//
// a more correct encodeURIComponent
// from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
//
function encodeComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

//
// base sorts
//
var sorts = base.sorts
var types = exports.types = {}


registerNullary('undefined', sorts.UNDEFINED)
registerNullary('null', sorts.NULL)

//
// registry true and false as distinct top level types for uris
//
registerNullary('true', sorts.BOOLEAN.sorts.TRUE)
registerNullary('false', sorts.BOOLEAN.sorts.FALSE)

types.number = {
  sort: sorts.NUMBER,
  parse: function (string) {
    return Number(string)
  },
  stringify: function (instance) {
    return instance + '+'
  }
}

types.date = {
  sort: sorts.DATE,
  parse: function (string) {
    return new Date(string)
  },
  stringify: function (instance) {
    // TODO: canonicalize
    return instance.toISOString() + '@'
  }
}

types.binary = {
  sort: sorts.BINARY,
  parse: function (string) {
    return codecs.HEX.encode(string)
  },
  stringify: function (instance) {
    return 'binary:' + codecs.HEX.decode(instance)
  }
}

types.string = {
  sort: sorts.STRING,
  parse: function (string) {
    return string
  },
  stringify: function (instance) {
    return encodeComponent(instance)
  }
}

//
// no `parse` method so no `array:...` constructor form
//
types.array = {
  sort: sorts.ARRAY,
  stringify: function (instance, nested) {
    var len = instance.length
    //
    // empty form
    //
    if (!len)
      return '()'

    var elements = []
    for (var i = 0; i < len; ++i) {
      elements.push(serialize(instance[i], true))
    }

    var result = elements.join(',')
    if (nested)
      return '(' + result + ')'

    return result
  }
}

//
// no `parse` method so no `object:...` constructor form
//
types.object = {
  sort: sorts.OBJECT,
  stringify: function (instance, nested) {
    var records = []
    for (var key in instance)
      records.push(serialize(key) + '=' + serialize(instance[key]))

    //
    // empty form
    //
    if (!records.length)
      return 'object:'

    return records.join(',')

  }
}
