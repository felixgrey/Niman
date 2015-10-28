/**
 * Ajax
 */
;
(function(_window) {
	//UUID
	var createId = function(prefix) {
			prefix = prefix || '';
			//http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/873856#873856
			var s = [],
				hexDigits = "0123456789ABCDEF";
			for (var i = 0; i < 32; i += 1) {
				s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
			}
			return prefix + s.join("");
		}
		//-----------------------Request-------------------------//

	//Request
	var createXMLHttpRequest = function(callback, error) {
		var request = false;
		if (window.XMLHttpRequest) {
			request = new XMLHttpRequest();
			if (request.overrideMimeType) {
				request.overrideMimeType('text/xml');
			}
		} else if (window.ActiveXObject) {
			var versions = ['Microsoft.XMLHTTP', 'MSXML.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.7.0', 'Msxml2.XMLHTTP.6.0', 'Msxml2.XMLHTTP.5.0', 'Msxml2.XMLHTTP.4.0', 'MSXML2.XMLHTTP.3.0', 'MSXML2.XMLHTTP'];
			for (var i = 0; i < versions.length; i++) {
				try {
					request = new ActiveXObject(versions[i]);
					if (request) {
						break;
					}
				} catch (e) {}
			}
		}
		if (request) {
			request.onreadystatechange = function() {
				if (request.readyState == 4 && request.status == 200) {
					callback(request.responseText);
				}
			};
			return request;
		}
	};

	var parametersToString = function(parameters, encodeURI) {
		var str = "",
			key, parameter;
		parameters = parameters || {};
		for (key in parameters) {
			if (parameters.hasOwnProperty(key)) {
				key = encodeURI ? encodeURIComponent(key) : key;
				if ('string' != typeof parameters[key]) {
					parameters[key] = JSON.stringify(parameters[key]);
				}
				parameter = encodeURI ? encodeURIComponent(parameters[key]) : parameters[key];
				str += key + "=" + parameter + "&";
			}
		}
		return str.replace(/&$/, "");
	};

	var fullUrl = function(url, paramStr) {
		url = url + '?' + paramStr;
		return url.replace(/\?$/g, '');
	};

	var head = document.getElementsByTagName('head')[0] || document.documentElement;
	var scripts = head.getElementsByTagName('script');

	var getJs = function(url, callback) {
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.originSrc = url;
		var cbk = function(evt) {
			callback && callback(script, evt);
		}
		if (/msie [678]/g.test(navigator.userAgent.toLowerCase())) {
			script.onreadystatechange = function() {
				if (script.readyState == 'loaded' || script.readyState == 'complete') {
					script.onreadystatechang = null;
					cbk(window.event);
				}
			};
		} else {
			script.onload = script.onerror = cbk;
		}
		script.src = url;
		head.insertBefore(script, scripts[0]);
	};

	var Void = function() {},
		fun = {};

	var JsonParser = function(data) {
		try {
			var JSON = window.JSON;
			if (JSON && JSON.parse) {
				data = JSON.parse(data);
			} else {
				data = eval("(" + data + ")");
			}
			return data;
		} catch (e) {
			window.console && window.console.log(e.stack);
		}
		return null;
	};

	fun.request = function(param) {
		var dataType = param.dataType;
		var success = param.success,
			error = param.error;
		if (undefined === param.async) {
			param.async = true;
		}
		if (dataType && 'json' == dataType.toLowerCase()) {
			success = function(data) {
				data = JsonParser(data);
				param.success(data);
			};
			error = function(data) {
				data = JsonParser(data);
				param.error(data);
			};
		}
		var request = createXMLHttpRequest(success || Void, error || Void);
		var url = param.url;
		var parametersStr = parametersToString(param.parameters, true);
		if ('GET' == param.type) {
			request.open('GET', fullUrl(url, parametersStr), param.async);
			param.beforeSend && param.beforeSend(request);
			request.send(null);
		} else {
			request.open(param.type||"POST", url, param.async);
			param.beforeSend && param.beforeSend(request);
			request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			request.send(parametersStr);
		}
	};

	//-----------------------JsonP-------------------------//

	fun.jsonP = function(param) {
		var callbackName = param.callback || createId('jsonP_');
		param.parameters.callback = callbackName;
		var url = fullUrl(param.url, parametersToString(param.parameters, true));
		window[callbackName] = function(json) {
			window[callbackName] = null;
			param.success && param.success(json);
		};
		var head = document.getElementsByTagName('head')[0] || document.documentElement;
		getJs(url, function(script) {
			head.removeChild(script);
		});
	};

	fun.ajax = function(param) {
		var type = param.type = (param.type || 'get').toUpperCase();
		param.parameters = param.parameters || {};
		if ('GET' == type || 'POST' == type) {
			fun.request(param);
		} else if ('JSONP' == type) {
			fun.jsonP(param);
		}
	}

	function NAjax(param) {
		return fun.ajax(param);
	};

	NAjax.fun = fun;

	NAjax.setPromise = function(_Promise) {
		if (NAjax.hasPromise) {
			return;
		}
		var _ajax = NAjax.fun.ajax;
		NAjax.fun.ajax = function(param) {
			return new _Promise(function(resolve, reject) {
				var success = param.success;
				param.success = function(data) {
					success && success(data);
					resolve(data);
				};
				_ajax(param);
			});
		};
		NAjax.hasPromise = true;
	};

	if (_window.Promise) {
		NAjax.setPromise(_window.Promise);
	}



	//-----------------------------------------模块-----------------------------------------//

	if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
		//node.js
		module.exports = NAjax;
	} else if (typeof define === 'function') {
		//CommonJS
		define(function(require, exports, module) {
			module.exports = NAjax;
		});
	} else {
		//window
		_window.NimanAjax = NAjax;
	}
})(this);