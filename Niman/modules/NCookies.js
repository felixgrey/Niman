;
(function(_window) {

	var NCookies = (function() {
		var a = {};
		return a.set = function(a, b) {
			var c = arguments,
				d = arguments.length,
				e = d > 2 ? c[2] : null,
				f = d > 3 ? c[3] : "/",
				g = d > 4 ? c[4] : null,
				h = d > 5 ? c[5] : !1;
			document.cookie = a + "=" + escape(b) + (null == e ? "" : "; expires=" + e.toGMTString()) + (null == f ? "" : "; path=" + f) + (null == g ? "" : "; domain=" + g) + (1 == h ? "; secure" : "")
		}, a.get = function(b) {
			for (var c = b + "=", d = c.length, e = document.cookie.length, f = 0, g = 0; e > f;) {
				if (g = f + d, document.cookie.substring(f, g) == c) return a.getCookieVal(g);
				if (f = document.cookie.indexOf(" ", f) + 1, 0 == f) break
			}
			return null
		}, a.clear = function(b) {
			a.get(b) && a.set(b, "", new Date(0))
		}, a.getCookieVal = function(a) {
			var b = document.cookie.indexOf(";", a);
			return -1 == b && (b = document.cookie.length), unescape(document.cookie.substring(a, b))
		}, a
	})();


	//-----------------------------------------模块-----------------------------------------//

	if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
		//node.js
		module.exports = NCookies;
	} else if (typeof define === 'function') {
		//CommonJS
		define(function(require, exports, module) {
			module.exports = NCookies;
		});
	} else {
		//window
		_window.NimanCookies = NCookies;
	}

})(this);