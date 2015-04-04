var assert = require('assert')
var base = require('bytewise-core/base')
var codecs = require('bytewise-core/util/codecs')
var immutable = require('immutable')
var parser = require('./parser')

//
// utilties for serializing uri strings
//
function getSerializer(instance) {
  for (var name in registry) {
    var type = registry[name]
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



// `parse` method invoked with string values following a `<prefix>:`

// `revive` method invoked with structured data from literal syntactic forms

// `stringify` invoked for serializing all values
// this method is responsible for doing type annotations and escapement

//
// helper for registering serializers on nullary types
//
var registerNullary = function (name, sort) {
  registry[name] = {
    sort: sort,
    parse: function (string) {
      assert.equal(string.length, 0, 'Nullary constructor should be empty')
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

var sorts = base.sorts
var registry = exports.types = {}


//
// boundary types
//
// TODO

//
// ranges
//
registry.RANGE = {
  // sort: base.types.RANGE,
  revive: function (string) {

  },
  stringify: function (instance) {

  }
}

//
// crappy little impl for template variable placeholders
//
function Hole(options) {
  this.name = options.name
  this.range = options.range
}

registry.HOLE = {
  // sort: base.types.HOLE,
  sort: {
    is: function (instance) {
      return instance instanceof Hole
    }
  },
  revive: function (args) {
    return new Hole(args)
  },
  stringify: function (instance) {
    var name = instance.name
    name = name ? encodeComponent(name) : '*'

    var range = instance.range || ''
    if (range)
      range = ' : ' + encodeComponent(range)

    return '{ ' + name + range + ' }'
  }
}

//
// base types
//

registerNullary('undefined', sorts.UNDEFINED)
registerNullary('null', sorts.NULL)

//
// registry true and false as distinct top level types for uris
//
registerNullary('true', sorts.BOOLEAN.sorts.TRUE)
registerNullary('false', sorts.BOOLEAN.sorts.FALSE)

registry.number = {
  sort: sorts.NUMBER,
  parse: function (string) {
    return Number(string)
  },
  stringify: function (instance) {
    return instance + '+'
  }
}

registry.date = {
  sort: sorts.DATE,
  parse: function (string) {
    return new Date(string)
  },
  stringify: function (instance) {
    // TODO: canonicalize
    return instance.toISOString() + '@'
  }
}

registry.binary = {
  sort: sorts.BINARY,
  parse: function (string) {
    return codecs.HEX.encode(string)
  },
  stringify: function (instance) {
    return 'binary:' + codecs.HEX.decode(instance)
  }
}

registry.string = {
  sort: sorts.STRING,
  parse: function (string) {
    return string
  },
  stringify: function (instance) {
    return encodeComponent(instance)
  }
}

registry.array = {
  sort: sorts.ARRAY,
  //
  // no `parse` method so no `array:...` constructor form
  //
  stringify: function (instance, nested) {
    var length = instance.length
    //
    // empty form
    //
    if (!length)
      return '()'

    var elements = []
    for (var i = 0; i < length; ++i) {
      elements.push(serialize(instance[i], true))
    }

    var result = elements.join(',')
    if (nested || length === 1)
      return '(' + result + ')'

    return result
  }
}

registry.object = {
  sort: sorts.OBJECT,
  //
  // no `parse` method so no `object:...` constructor form
  //
  revive: function (tuples) {
    var value = {}
    tuples.forEach(function (tuple) {
      value[tuple[0]] = tuple[1]
    })
    return value
  },
  stringify: function (instance, nested) {
    var records = []
    for (var key in instance)
      records.push(serialize(key) + '=' + serialize(instance[key], true))

    //
    // empty form
    //
    if (!records.length)
      return 'object:'

    var result = records.join(',')
    if (nested || records.length === 1)
      return '(' + result + ')'

    return result
  }
}
