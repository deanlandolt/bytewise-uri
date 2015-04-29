var defprop = require('defprop')
var bytewise = require('bytewise-core')
var base = require('./base')

var PRIVATE_SIGIL = {}

function process(data, pathType) {
  defprop.value(this, 'data', data)
  defprop.value(this, 'pathType', pathType || false)

  // TODO: walk data for ranges and template variables
}

function Uri(input) {
  //
  // check for special invocation for internal constructions
  //
  if (input === PRIVATE_SIGIL)
    return process.call(this, arguments[1], arguments[2])

  //
  // check for invokation as template string tag
  //
  if (Array.isArray(input)) {
    var length = arguments.length

    //
    // short circuit for no interpolations
    //
    if (length === 1)
      return new Uri(input.join(''))

    //
    // create specially specially-named template variables for interpolations
    //
    var source = input[0];
    var unique = (Math.random() + '').slice(2)
    var interpolations = {}
    for (var i = 1; i < length; ++i) {
      var name = '{' + i + '~' + unique + '}'
      source += name + input[i]
      interpolations[name] = arguments[i]
    }

    //
    // generate template from provided source and fill with interpolations
    //
    return (new Uri(source)).fill(interpolations)
  }

  //
  // allow newless construction
  //
  if (!(this instanceof Uri))
    return new Uri(input)

  defprop.value(this, '_input', input)
  return process.apply(this, base.serialization.parse(input))
}

//
// generate a new uri instance directly from provided data
//
Uri.data = function (data, pathType) {
  return new Uri(PRIVATE_SIGIL, data, pathType)
}

Uri.bytewise = bytewise

Uri.encode = function (input) {
  return (new Uri(input)).encoding
}

Uri.decode = function (buffer) {
  return Uri.data(bytewise.decode(buffer));
}

var proto = Uri.prototype

//
// resolves the key associated with instance, if it has a key encoding
//
defprop.memoize(proto, 'encoding', function () {
  // TODO: keep generated buffer private and return a copy on each call
  return this.keyed ? bytewise.encode(this.data) : null
})

//
// a key value can only be generated for non-index types w/o range quantifiers
//
defprop.memoize(proto, 'keyed', function () {
  return typeof this.pathType === 'boolean' && !this.variables && !this.ranges
})

defprop.memoize(proto, 'uri', function () {
  return base.serialization.stringify(this.data, this.pathType)
})

//
// populate template variables, by name or position
//
defprop.value(proto, 'fill', function () {
  var data = this.data
  // TODO: deep copy, replace template variables with args
  return Uri.data(data)
})

//
// query descriptor object defined by uri
//
defprop.memoize(proto, 'query', function () {
  //
  // if type has an associated key, return singleton interval
  //
  if (this.keyed)
    return { gte: this.encoding, lte: this.encoding }

  if (this.pathType === 'prefix')
    return {
      gte: Uri.encode(this.data.concat(null)),
      lte: Uri.encode(this.data.concat(undefined))
    }

  // TODO: templates and ranges
})

module.exports = Uri
