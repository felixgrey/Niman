/**
 * CSS模块加载插件
 */
;Niman.plugin('CSS', ['supports'], function(info) {
	var moduleLoader = info.moduleLoader,
		getPage = moduleLoader.getPage,
		supports = info.supports;


	var oldLoad = moduleLoader.load;

	moduleLoader.load = function(name, cbk) {
		var url = info.config.location[name] || name;
		oldLoad.apply(this, arguments);
		if (new RegExp('\\.css$', 'g').test(url)) {
			info.moduleFactory.getModule(name).define([], function() {
				cbk && cbk();
			});
		}
	}

	info.getPagePolicy['\\.css$'] = function(url, callback) {
		var name = supports.getId(info.config.location, url);
		var link = document.createElement('link');
		with(link) {
			rel = "stylesheet";
			rev = "stylesheet";
			type = "text/css";
			media = "screen";
			href = url;
		}
		info.head.appendChild(link);
	}
});