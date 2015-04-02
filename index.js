var bytewise = require('bytewise-core')
var parser = require('./parser')

function Key(uri) {
  if (!(this instanceof Key))
    return new Key(uri)

  this._parsed = parser.parse(this.uri = uri)
}

Key.prototype.valueOf = function () {
  return this._parsed.value;
}

Key.prototype.encode = function () {
  return this._encoded || (this._encoded = bytewise.encode(this._parsed))
}

Key.prototype.toString = function () {
  return this.encode().toString('hex')
}

// TODO: return immutable instance types instead of this temporary hack
module.exports = Key
