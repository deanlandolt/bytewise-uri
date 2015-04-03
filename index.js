var bytewise = require('bytewise-core')
var parser = require('./parser')

function Path(input) {
  //
  // check if invoked as template string tag
  //
  if (Array.isArray(input)) {
    var len = arguments.length

    //
    // short circuit if no interpolation args provided
    //
    if (len === 1)
      return new Path(input.join(''))

    //
    // create specially specially-named template variables for interpolations
    //
    var source = input[0];
    var unique = (Math.random() + '').slice(2)
    var interpolations = {}
    for (var i = 1; i < len; ++i) {
      var name = `{ ${ i }-${ unique } }`
      source += name + input[i]
      interpolations[name] = arguments[i]
    }
    console.log(source, interpolations)

    //
    // generate template from provided source and fill with interpolations
    //
    return (new Path(source)).fill(interpolations)
  }


  if (!(this instanceof Path))
    return new Path(input)

  // TODO: parse should return immutable data structures
  this._parsed = parser.parse(this.uri = input)
}

Object.defineProperties(Path.prototype, {
  data: {
    get: function () {
      return this._parsed.value
    }
  },
  encoded: {
    get: function () {
      // TODO: keep generated buffer private and return a copy on each call
      return this._encoded || (this._encoded = bytewise.encode(this._parsed))
    }
  },
  toString: {
    value: function (codec) {
      //
      // default to hex to preserve order in case of accidental string coercion
      //
      return this.encoded.toString(codec || 'hex')
    }
  },
  uri: {
    get: function () {
      // TODO: stringify `this.data` back into a uri
    }
  },
  fill: {
    value: function (args) {
      // TODO
      console.log(args)
      return this
    }
  }
})

module.exports = Path
