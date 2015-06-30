var assert = require('assert')
var base = require('bytewise-core/base')
var codecs = require('bytewise-core/codecs')
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
var CTOR_REGISTRY

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
  // add alias to CTOR_REGISTRY if applicable
  //
  var alias = serialization && serialization.alias || key
  if (alias) {
    if (alias in CTOR_REGISTRY)
      assert.deepEqual(type, CTOR_REGISTRY[alias], 'Duplicate ctor: ' + alias)

    CTOR_REGISTRY[alias] = type
  }
}

//
// process base types and build serialization registries
//
function processTypes() {
  CTOR_REGISTRY = {}
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
serialization.aliasedType = function (alias) {
  //
  // construct and memoize serialization registry on first run
  //
  if (!CTOR_REGISTRY)
    processTypes()

  return CTOR_REGISTRY[alias]
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
    //
    // args are already an array
    //
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

sorts.object || (sorts.object = {})
sorts.object.serialization = {
  parse: function (string) {
    //
    // only empty constructor form is allowed (for empty object)
    //
    assert(!string.length, 'Invalid "object" constructor')
    return {}
  },
  revive: function (args) {
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
function Variable(name, range) {
  this.name = name || ''
  this.range = range || ''
}

base.variable = {
  is: function (instance) {
    return instance instanceof Variable
  },
  serialization: {
    revive: function (args) {
      return new Variable(args[0], args[1])
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
}


// TODO: we need an API for generating a new type system
processTypes()

//
// surface default serializations for types with literal syntactic forms
//
// exports.RANGE = base.sorts.range.serialization
serialization.VARIABLE = base.variable.serialization
serialization.NUMBER = base.sorts.number.serialization
serialization.DATE = base.sorts.date.serialization
serialization.ARRAY = base.sorts.array.serialization
serialization.OBJECT = base.sorts.object.serialization
