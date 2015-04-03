var bytewise = require('bytewise-core')
var parser = require('./parser')

function Path(uri) {
  if (!(this instanceof Path))
    return new Path(uri)

  // TODO: parse should return immutable data structures
  this._parsed = parser.parse(this.uri = uri)
}

Object.defineProperties(Path.prototype, {
  data: {
    get: function () {
      return this._parsed.value
    }
  },
  encoded: {
    get: function () {
      return this._encoded || (this._encoded = bytewise.encode(this._parsed))
    }
  },
  toString: {
    value: function (codec) {
      // default to hex to preserve order in case of accidental string coercion
      return this.encoded.toString(codec || 'hex')
    }
  },
  uri: {
    get: function () {
      // TODO: stringify `this.data` back into a uri
    }
  }
})

module.exports = Path
