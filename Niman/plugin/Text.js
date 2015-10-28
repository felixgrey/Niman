/**
 * 文字模块加载
 */
;Niman.plugin('Text', ['supports'], function(info) {
	var moduleLoader = info.moduleLoader,
		getPage = moduleLoader.getPage,
		supports = info.supports;

	var createXMLHttpRequest = function(callback) {
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
					callback && callback(request.responseText);
				}
			};
			return request;
		}
	};

	info.getPagePolicy['\\.tpl|\\.htm$|\\.html$|\\.template$|\\.txt$'] = function(_url, _callback) {
		var name = supports.getId(info.config.location, _url);
		var request = createXMLHttpRequest(function(text) {
			info.moduleFactory.getModule(name).define([], function(context) {
				context[name] = text;
			});
			_callback && _callback();
		});
		request.open('GET', _url, true);
		request.send(null);
	}
});