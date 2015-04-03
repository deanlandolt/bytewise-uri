var bytewise = require('bytewise-core')
var parser = require('./parser')

// TODO: return immutable instance types instead of this temporary hack
function Key(uri) {
  if (!(this instanceof Key))
    return new Key(uri)

  this._parsed = parser.parse(this.uri = uri)
}

Object.defineProperties(Key.prototype, {
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

module.exports = Key
