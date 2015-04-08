var assert = require('assert')
var base = require('bytewise-core/base')
var codecs = require('bytewise-core/codecs')
var defprop = require('defprop')
var parser = require('./parser')
var util = require('./util')
var encodeComponent = util.encodeComponent

//
// extend bytewise base types with serialization config
//
module.exports = base


var serialization = base.serialization = {}
//
// registry for looking up type by constructor alias prefix during parsing
//
var TYPE_REGISTRY

//
// registry for instance checking on type during serialization
//
var TYPE_CHECK_ORDER

function registerType(type, key) {
  var serializer = type && type.serialization
  if (!serializer)
    return

  TYPE_CHECK_ORDER.push(type)

  //
  // add alias to type registry if applicable
  //
  var alias = serialization && serialization.alias || key
  if (alias) {
    if (alias in TYPE_REGISTRY)
      assert.deepEqual(type, TYPE_REGISTRY[alias], 'Duplicate ctor: ' + alias)

    // TODO: assert alias contains only unreserved characters

    TYPE_REGISTRY[alias] = type

    type.serialization.alias = alias
  }
}

//
// process base types and build serialization registries
//
function processTypes() {
  TYPE_REGISTRY = {}
  TYPE_CHECK_ORDER = []

  //
  // register native serialization types
  //
  registerType(base.range)
  registerType(base.variable)

  //
  // register sorts (our value types)
  //
  var sorts = base.sorts
  // TODO: use base.order
  for (var key in sorts) {
    registerType(sorts[key], key)
  }
}


//
// look up type descriptor from constructor prefix alias
//
serialization.getType = function (alias) {
  //
  // construct and memoize serialization registry on first run
  //
  if (!TYPE_REGISTRY)
    processTypes()

  var type = TYPE_REGISTRY[alias]
  assert(type, 'Unknown type alias: ' + alias)
  return type
}

//
// return canonical alias string associated with type descriptor
//
serialization.getAlias = function (type) {
  return type && type.serialization && type.serialization.alias
}

//
// look up and delegate to appropriate serializer for instance
//
function serialize(instance, nested) {
  if (!TYPE_CHECK_ORDER)
    processTypes()

  var type
  for (var i = 0; type = TYPE_CHECK_ORDER[i]; ++i) {
    if (type.is(instance))
      return type.serialization.stringify(instance, nested)
  }
}

//
// serializes a data structure into bytewise uri strings
//
serialization.stringify = function (instance, pathType) {
  //
  // serialize component 
  //
  if (!pathType)
    return serialize(instance)


  //
  // serialize as '/'-separated path
  //
  assert.ok(Array.isArray(instance), 'Array data required for path')

  var elements = []
  for (var i = 0, length = instance.length; i < length; ++i)
    elements.push(serialize(instance[i]))
  var prefix = (pathType === 'prefix' || pathType === true) ? '/' : ''
  var suffix = pathType === 'suffix' ? '/' : ''
  return prefix + elements.join('/') + suffix
}

//
// utility for parsing bytewise uri instances into data structures
//
serialization.parse = function (string) {
  //
  // TODO: return data as persistent immutable data structure
  //
  return parser.parse(string)
}

//
// extend base sorts with serialization definitions
//
var sorts = base.sorts

sorts.void.serialization = {
  parse: function (string) {
    return
  },
  stringify: function () {
    return 'void:'
  }
}

sorts.null.serialization = {
  parse: function (string) {
    assert(!string.length, 'Invalid "null" constructor')
    return null
  },
  stringify: function () {
    return 'null:'
  }
}

sorts.boolean.serialization = {
  parse: function (string) {
    if (string === 'true')
      return true
    if (string === 'false')
      return false
    assert(false, 'Invalid "boolean" constructor')
  },
  stringify: function (instance) {
    return 'boolean:' + instance
  }
}

var numberParseConfig = { startRule: 'NUMBER_LITERAL' }
sorts.number.serialization = {
  parse: function (string) {
    //
    // run constructor form through parser as a literal
    //
    return parser.parse(encodeComponent(string) + '+', numberParseConfig)
  },
  revive: function (args) {
    assert.equal(args.length, 1, 'Invalid "number" arguments')

    // TODO: more strict
    var value = Number(args[0])

    //
    // test for NaN
    //
    if (value !== value)
      throw new TypeError('"NaN" value')
    
    return value
  },
  stringify: function (instance) {
    return instance + '+'
  }
}

var dateParseConfig = { startRule: 'DATE_LITERAL' }
sorts.date.serialization = {
  parse: function (string) {
    //
    // run constructor form through parser as a literal
    // we can unescape [+:] when encoding date component chars
    //
    var encoded = encodeComponent(string).replace(/%(?:2B|3A)/g, unescape)
    return parser.parse(encoded + '@', dateParseConfig)
  },
  revive: function (args) {
    assert.equal(args.length, 1, 'Invalid "date" arguments')

    // TODO: more strict
    var value = new Date(args[0])

    //
    // test for invalid
    //
    if (+value !== +value)
      throw new TypeError('"Invalid Date": ' + args[0])
    
    return value
  },
  stringify: function (instance) {
    // TODO: canonicalize
    return instance.toISOString() + '@'
  }
}

sorts.binary.serialization = {
  parse: function (string) {
    return codecs.HEX.encode(string)
  },
  stringify: function (instance) {
    return 'binary:' + codecs.HEX.decode(instance)
  }
}

sorts.string.serialization = {
  sort: sorts.string,
  parse: function (string) {
    return string
  },
  stringify: function (instance) {
    return instance.length ? encodeComponent(instance) : 'string:'
  }
}

sorts.array.serialization = {
  parse: function (string) {
    //
    // only empty constructor form is allowed (for empty array)
    //
    assert(!string.length, 'Invalid "array" constructor')
    return []
  },
  revive: function (args) {
    assert(Array.isArray(args), 'Invalid "array" structure')
    return args
  },
  stringify: function (instance, nested) {
    var length = instance.length
    //
    // empty form
    //
    if (!length)
      return 'array:'

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

sorts.object.serialization = {
  parse: function (string) {
    //
    // only empty constructor form is allowed (for empty object)
    //
    assert(!string.length, 'Invalid "object" constructor')
    return {}
  },
  revive: function (args) {
    assert(Array.isArray(args), 'Invalid "object" structure')

    var value = {}
    args.forEach(function (pair) {
      value[pair[0]] = pair[1]
    })
    // TODO
    // return types.object(value)
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

//
// crappy little impl for template variable placeholders
//
var VARIABLE_BRAND = {}

base.variable = {
  is: function (instance) {
    return instance && instance.__brand === VARIABLE_BRAND
  },
  create: function (args) {
    var instance = {}
    defprop.value(instance, '__brand', VARIABLE_BRAND)
    defprop.value(instance, 'args', args)
    return instance
  },
  serialization: {
    revive: function (args) {
      return base.variable.create(args)
    },
    stringify: function (instance) {
      var id = instance.id ? encodeComponent(instance.id) : '*'

      var range = instance.range || ''
      if (range)
        range = ' : ' + encodeComponent(range)

      return '{ ' + id + range + ' }'
    }
  }
}

//
// crappy little impl for ranges
//
var RANGE_BRAND = {}

base.range = {
  is: function (instance) {
    return instance && instance.__brand === RANGE_BRAND
  },
  create: function (args) {
    var instance = {}
    defprop.value(instance, '__brand', RANGE_BRAND)
    defprop.value(instance, 'args', args)
    var lower = defprop.value(instance, 'lower', args[0] || base)
    defprop.value(instance, 'upper', args[1] || lower)
    return instance
  },
  serialization: {
    revive: function (args) {
      return base.range.create(args)
    },
    stringify: function (instance) {
      var lower = instance.lower
      if (lower === instance.upper) {
        if (lower === base)
          return '*'

        var alias = serialization.getAlias(lower)
        assert(alias, 'Unable to serialize typed range')
        return '*:' + encodeComponent(alias)
      }

      console.log(instance.args)

      return '*:(' + serialize(instance.args[0]) + ',' + serialize(instance.args[1]) + ')'
    }
  }
}


// TODO: we need an API for generating a new type system
processTypes()

//
// surface default handlers for literal syntactic forms in parser
//
serialization.RANGE = base.range.serialization
// serialization.SUFFIX = base.suffix.serialization
serialization.VARIABLE = base.variable.serialization
serialization.NUMBER = base.sorts.number.serialization
serialization.DATE = base.sorts.date.serialization
serialization.ARRAY = base.sorts.array.serialization
serialization.OBJECT = base.sorts.object.serialization
