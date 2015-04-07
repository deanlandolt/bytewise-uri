//
// a more correct encodeURIComponent
// from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
//
exports.encodeComponent = function (string) {
  return encodeURIComponent(string).replace(/[!'()*]/g, function (unit) {
    return '%' + unit.charCodeAt(0).toString(16);
  });
}
