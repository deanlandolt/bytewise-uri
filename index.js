var bytewise = require('bytewise-core')
var parser = require('./parser')
var serialization = require('./serialization')

function Uri(input) {
  //
  // check if invoked as template string tag
  //
  if (Array.isArray(input)) {
    var len = arguments.length

    //
    // short circuit if no interpolation args provided
    //
    if (len === 1)
      return new Uri(input.join(''))

    //
    // create specially specially-named template variables for interpolations
    //
    var source = input[0];
    var unique = (Math.random() + '').slice(2)
    var interpolations = {}
    for (var i = 1; i < len; ++i) {
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

  this._parsed = serialization.parse(this._input = input)

}

Object.defineProperties(Uri.prototype, {
  data: {
    get: function () {
      return this._parsed.data
    }
  },
  fill: {
    value: function (args) {
      // TODO
      console.log('TODO: fill args:', args)
      return this
    }
  },
  key: {
    get: function () {
      //
      // queries ain't got not keys
      //
      var key
      if (!this._parsed.index && !this._parsed.holes.length)
        key = bytewise.encode(this.data)

      Object.defineProperty(this, 'key', { value: key })

      // TODO: keep generated buffer private and return a copy on each call
      return key
    },
    configurable: true
  },
  query: {
    get: function () {
      //
      // if not a query, return singleton range
      //
      var key = this.key
      if (key)
        return { gte: key, lte: key }

      // TODO
    },
    configurable: true
  },
  toString: {
    value: function (codec) {
      //
      // default to hex to preserve order in case of accidental string coercion
      //
      return this.key.toString(codec || 'hex')
    }
  },
  uri: {
    get: function () {
      var uri = serialization.stringify(this.data, this._parsed)
      Object.defineProperty(this, 'uri', { value: uri })
      return uri
    },
    configurable: true
  }
})

module.exports = Uri
