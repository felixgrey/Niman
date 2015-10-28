/**
 * Niman模块加载管理器
 */
;
(function(ctx, name) {

	var Niman = ctx[name] = {};

	var mix = function(a, b) {
		for (var k in b) {
			a[k] = b[k];
		}
		return a;
	};

	var StateAction = function(scope) {
		this.scope = scope;
		this.status = 0;
		this._thenFuns = [];
		this._args = [];
	};

	StateAction.prototype = {
		ok: function(fun) {
			if (1 == this.status) {
				fun.apply(this.scope, this._args);
			} else {
				this._thenFuns.push(fun);
			}
			return this;
		},
		all: function(list) {
			var ok = 0,
				allOk = list.length,
				self = this;
			ok == allOk && (self.setOk(list));
			for (var i = 0; i < allOk; i++) {
				list[i].ok(function() {
					ok++;
					ok == allOk && (self.setOk(list))
				});
			}
			return this;
		},
		setOk: function() {
			if (1 != this.status) {
				this.status = 1;
				this._args = Array.prototype.slice.call(arguments);
				var fun;
				while (fun = this._thenFuns.shift()) {
					fun.apply(this.scope, this._args);
				}
			}
			return this;
		}
	};

	//获得当前script节点
	var head = document.getElementsByTagName('head')[0] || document.documentElement;
	var scripts = head.getElementsByTagName('script');
	var currentScript = scripts[scripts.length - 1];

	//模块
	var Module = function(name) {
		this.get = 'getModule';
		this.name = name;
		this.defineState = new StateAction(this);
		this.readyState = new StateAction(this);
		this.initState = new StateAction(this);
	};

	Module.prototype = {
		init: function() {
			this.readyState.ok(function() {
				if (!this.initState.status) {
					this.fun.call(ctx, ModuleInfo.context);
					this.initState.setOk();
				}
			});
		},
		use: function(cbk) {
			this.initState.ok(function() {
				cbk && cbk();
			});
			if (!this.initState.status) {
				this.readyState.ok(function() {
					var stack = moduleFactory.initStack(this.name),
						_m;
					while (_m = stack.pop()) {
						_m.init();
					}
				});
			}
			moduleLoader.load(this.name);
		},
		define: function(dependencies, fun) {
			this.dependencies = dependencies;
			this.fun = fun;
			var length = dependencies.length;
			page[this.name] = 1;
			var depArr = [];
			for (var i = 0; i < length; i++) {
				var mName = dependencies[i];
				moduleLoader.load(mName);
				depArr.push(moduleFactory[this.get](mName).readyState);
			}
			this.readyState.all(depArr);
			this.defineState.setOk();
		}
	};

	//插件
	var Plugin = function() {
		Module.apply(this, arguments);
		this.get = 'getPlugin';
		this.stop = false;
	};

	mix(Plugin.prototype, Module.prototype);

	Plugin.prototype.init = function() {
		this.readyState.ok(function() {
			if (!this.initState.status) {
				this.fun.call(this, ModuleInfo);
				!this.stop && this.initState.setOk();
			}
		});
	};

	Plugin.prototype.define = function() {
		Module.prototype.define.apply(this, arguments);
		Niman.use(this.name);
	}

	var page = {
		'./': 1
	};

	var getJs = function(url, callback) {
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.originSrc = url;
		var cbk = function(evt) {
			callback && callback(script, evt);
			script.parentNode.removeChild(script);
		}
		if (ModuleInfo.isOldIE) {
			script.onreadystatechange = function() {
				if (script.readyState == 'loaded' || script.readyState == 'complete') {
					script.onreadystatechang = null;
					cbk(window.event);
				}
			};
		} else {
			script.onload = cbk;
		}
		script.src = url;
		head.insertBefore(script, scripts[0]);
	};

	var moduleLoader = {
		getPage: function(url, callback) {
			var p = ModuleInfo.getPagePolicy,
				k;
			for (k in p) {
				if (new RegExp(k, 'g').test(url)) {
					p[k](url, callback);
					return;
				}
			}
			getJs(url, callback);
		},
		load: function(name, cbk) {
			var lcn = ModuleInfo.config.location;
			var url = lcn[name] || name;
			if ('./' == url) {
				cbk && cbk();
				return;
			}
			if (url == name && !new RegExp('\\.\\w+$').test(url)) {
				url += '.js';
			}
			if (!lcn[name]) {
				lcn[name] = url;
			}
			if (!page[name]) {
				page[name] = 1;
				this.getPage(url, function(script, evt) {
					cbk && cbk();
				});
			} else {
				cbk && cbk();
			}
		}
	};

	var moduleMap = {};
	var moduleFactory = {
		getModule: function(name) {
			return moduleMap[name] = moduleMap[name] || new Module(name);
		},
		getPlugin: function(name) {
			return moduleMap[name] = moduleMap[name] || new Plugin(name);
		},
		initStack: function(name, _track, _stack) {
			var track = _track || {};
			var stack = _stack || [];
			var root = moduleMap[name];
			//节点不存在或出现循环依赖，终止执行
			if (!root || track[name]) {
				var msg = root ? 'no ' + name : 'circular dependency.';
				throw new Error('wrong dependencies :' + msg);
				return;
			}
			track[name] = 1;
			//压栈
			stack.push(root);
			//依赖
			var _f = arguments.callee,
				dependencies = root.dependencies;
			//依赖递归
			for (var i = 0; i < dependencies.length; i++) {
				_f(dependencies[i], mix({}, track), stack);
			}
			return stack;
		}
	};

	var ModuleInfo = {
		config: {
			plugin: [],
			location: {}
		},
		getPagePolicy: {},
		StateAction: StateAction,
		windowLoadState: new StateAction,
		isOldIE: /msie [678]/g.test(navigator.userAgent.toLowerCase()),
		global: ctx,
		context: {},
		getJs: getJs,
		moduleMap: moduleMap,
		moduleFactory: moduleFactory,
		moduleLoader: moduleLoader,
		head: head,
		currentScript: currentScript,
		afterConfig: new StateAction
	};

	var onload = function() {
		ModuleInfo.windowLoadState.setOk();
	};
	(window.addEventListener && window.addEventListener('load', onload)) || (window.attachEvent && window.attachEvent('onload', onload));

	var allPluginInitState = ModuleInfo.allPluginInitState = new StateAction;

	/**
	 * 定义一个模块
	 * @param {Object} name 模块名
	 * @param {Object} dependencies 依赖模块
	 * @param {Object} fun模块定义
	 */
	Niman.define = function(name, dependencies, fun) {
		allPluginInitState.ok(function() {
			moduleFactory.getModule(name).define(dependencies, fun);
		});
	};

	/**
	 * 定义一个插件
	 * @param {Object} name 插件名
	 * @param {Object} dependencies 依赖模块
	 * @param {Object} fun 插件定义
	 */
	Niman.plugin = function(name, dependencies, fun) {
		moduleFactory.getPlugin(name).define(dependencies, fun);
	};

	/**
	 * 使用一个模块
	 * @param {Object} name 模块名
	 * @param {Object} cbk 模块载入后的回调，可选
	 */
	Niman.use = function(name, cbk) {
		moduleFactory.getModule(name).use(cbk);
	};

	/**
	 * 配置，调用此方法载入配置信息并初始化。
	 * @param {Object} obj 配置信息
	 */
	Niman.config = function(obj) {
		obj = obj || {};
		obj.plugin = (obj.plugin || []).concat(ModuleInfo.config.plugin);
		obj.location = mix(obj.location || {}, ModuleInfo.config.location);
		obj = mix(ModuleInfo.config, obj);
		var arr = [];
		for (var i = 0; i < obj.plugin.length; i++) {
			var pg = moduleFactory.getPlugin(obj.plugin[i]);
			arr.push(pg.initState);
			pg.use();
		}
		allPluginInitState.all(arr);
		ModuleInfo.afterConfig.setOk();
	};

	Niman._init = function(fun) {
		fun && fun(ModuleInfo);
		var cfg = currentScript.getAttribute('data-config');
		cfg && moduleLoader.load(cfg);
	};

})(this, 'Niman');
/**
 * supports
 */
(function(ctx) {
	var Niman = ctx.Niman;
	Niman.plugin('supports', [], function(info) {

		//Array遍历
		Array.prototype.forEach = Array.prototype.forEach ||
			function(fun) {
				for (var i = 0; i < this.length; i++) {
					fun(this[i], i, this);
				}
			};

		//用for(property in object)迭代object属性时，IE不包括 toString属性，判断是否包含toString属性
		function hasToString(obj) {
			var sourceIsEvt = typeof window.Event == "function" && obj instanceof window.Event;
			return !sourceIsEvt && obj.hasOwnProperty && obj.hasOwnProperty("toString");
		}

		var supports = info.supports = {
			hasOrDo: function(name, scope, cbk1, cbk2) {
				if (supports.has(info.config.plugin, name)) {
					info.moduleFactory.getPlugin(name).initState.ok(function() {
						cbk1 && cbk1.apply(scope, arguments);
					});
				} else {
					cbk2 && cbk2.apply(scope, arguments);
				}
			},
			useOrDo: function(name, scope, cbk1, cbk2) {
				if (info.config.location[name]) {
					Niman.Module.use(name, function() {
						cbk1 && cbk1.apply(scope, arguments);
					});
				} else {
					cbk2 && cbk2.apply(scope, arguments);
				}
			},
			//获得Object或Array中对象对应的key或index
			getId: function(obj, value) {
				var id = null;
				supports.forEach(obj, function(k, v) {
					if (v === value) {
						id = k;
					}
					return !(v === value);
				});
				return id;
			},
			//Object或Array中是否包含给定的对象
			has: function(obj, value) {
				var id = supports.getId(obj, value);
				return !(id === null);
			},
			//遍历Object或Array
			forEach: function(obj, callback) {
				var type = supports.typeOf(obj);
				if ('Array' == type) {
					for (var i = 0; i < obj.length; i++) {
						if (false === callback(i, obj[i])) {
							break;
						}
					}
				} else if ('Object' == type) {
					if (hasToString(obj) && (false === callback('toString', obj.toString))) {
						return;
					}
					for (var k in obj) {
						if (false === callback(k, obj[k])) {
							break;
						}
					}
				}
			},
			//类Array转为Array
			toArr: function(_arr) {
				return Array.prototype.slice.call(_arr);
			},
			//混入对象
			mix: function() {
				var objs = supports.toArr(arguments);
				var a = objs.shift();
				supports.forEach(objs, function(i, b) {
					for (var k in b) {
						a[k] = b[k];
					}
					if (hasToString(b)) {
						a.toString = b.toString;
					}
				});
				return a;
			},
			//识别数据类型
			typeOf: function(obj) {
				if ('undefined' === typeof obj) {
					return 'Undefined';
				}
				var a = [window, document, null],
					b = ['Window', 'Document', 'Null'];
				for (var i = 0; i < 3; i++) {
					if (a[i] === obj) {
						return b[i];
					}
				}
				var type = Object.prototype.toString.call(obj).slice(8, -1);
				if (navigator && navigator.appName == 'Microsoft Internet Explorer' && 'Object' == type && obj) {
					if (obj.nodeName && obj.nodeType == 1) {
						type = 'HTML' + obj.tagName + 'Element';
					}
					if (obj.nodeValue) {
						type = 'Text';
					}
				}
				return type;
			}
		};
	});
})(this);
/**
 * definition
 */
(function(ctx) {
	var Niman = ctx.Niman;
	Niman.plugin('definition', ['supports'], function(info) {
		//配置信息
		var config = info.config,
			Module = Niman.Module,
			factory = info.moduleFactory,
			supports = info.supports,
			typeOf = supports.typeOf,
			StateAction = info.StateAction;

		//当前模块
		var currentModuleInfo = [];

		//转化为符合AMD规范的定义格式
		var buildAmdCallback = function(name, dependencies, fun) {
			return function(ctx) {
				var arg = [];
				supports.forEach(dependencies, function(i, _name) {
					arg.push(ctx[_name]);
				});
				ctx[name] = fun.apply(null, arg);
			};
		};

		//数据模块
		var buildDataCallback = function(name, dependencies, fun) {
			return function(_ctx) {
				_ctx[name] = fun;
			};
		};

		//CommonJs规范的require方法
		var require = function(name) {
			return info.context[name];
		};

		/**
		 *
		 * @param {Object} names
		 * @param {Object} callback
		 */
		require.async = function(names, callback) {
			var allStateAction = new StateAction,
				allList = [];
			for (var i = 0; i < names.length; i++) {
				var name = names[i];
				var sa = new StateAction;
				Niman.use(name, (function(_sa) {
					return function() {
						_sa.setOk();
					};
				})(sa));
				allList.push(sa);
			}
			allStateAction.all(allList).ok(function() {
				var list = [];
				for (var i = 0; i < names.length; i++) {
					list.push(info.context[names[i]]);
				}
				callback && callback.apply(null, list);
			});
		};

		//转化为符合CommonJs规范的定义格式
		var buildCommonJsCallback = function(name, dependencies, fun) {
			return function(ctx) {
				var module = {
					exports: {}
				};
				var exports = fun.apply(null, [require, module.exports, module]);
				ctx[name] = exports || module.exports;
			};
		};

		//从函数的require代码中提取依赖
		var REQUIRE_REG = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g;
		var getdependencies = function(callback) {
			var callbackStr = callback.toString();
			var require = [],
				temp = {};
			callbackStr.replace(/\\\\/g, "").replace(REQUIRE_REG, function(m, m1, m2) {
				if (m2) {
					temp[m2] = 1;

				}
			});
			for (var k in temp) {
				require.push(k);
			}
			return require;
		};

		var buildCallBackMap = {
			'amd': buildAmdCallback,
			'commonJs': buildCommonJsCallback,
			'cmd': buildCommonJsCallback,
			'data': buildDataCallback
		};

		//异步加载模块后读取模块信息
		info.getPagePolicy['\\.js$'] = function(url, callback) {
			var cbk = function(script, evt) {
				var _c = currentModuleInfo.shift();
				if (_c) {
					var name = _c.name || supports.getId(config.location, script.originSrc) || script.originSrc;
					var type = _c.type,
						dependencies = _c.dependencies,
						fun = _c.fun;
					if (info.afterCommonJsDefine) {
						info.afterCommonJsDefine(name, dependencies, fun, url);
					}
					Niman.define(name, dependencies, buildCallBackMap[type](name, dependencies, fun));
				}
				callback && callback(script, evt);
			}
			info.getJs.apply(info, [url, cbk]);
		};

		//CommonJs规范
		var commonJs = function(fun) {
			return {
				type: 'commonJs',
				dependencies: getdependencies(fun),
				fun: fun
			};
		};

		//各种定义规范的格式化
		var definitionFormatter = {
			//匿名CommonJs规范
			FunctionUndefinedUndefined: commonJs,
			//具名CommonJs规范
			StringFunctionUndefined: function(name, fun) {
				var info = commonJs(fun);
				info.name = name;
				return info;
			},
			//匿名AMD规范
			ArrayFunctionUndefined: function(dependencies, fun) {
				return {
					type: 'amd',
					dependencies: dependencies,
					fun: fun
				};
			},
			//数据对象
			ObjectUndefinedUndefined: function(name, dependencies, fun) { //数据对象模块
				return {
					type: 'data',
					dependencies: [],
					fun: name
				};
			},
			//具名AMD规范或CMD规范
			StringArrayFunction: function(name, dependencies, fun) {
				var _dependencies = getdependencies(fun);
				var cmd = false;
				//如果依赖数组和require一致，视为CMD规范
				if (_dependencies.length == dependencies.length) {
					cmd = true;
					for (var i = 0; i < dependencies.length; i++) {
						if (!supports.has(_dependencies, dependencies[i]) || !supports.has(dependencies, _dependencies[i])) {
							cmd = false;
							break;
						}
					}
				}
				var _info = {
					name: name,
					dependencies: dependencies
				}
				if (info.config.cmdOnly) {
					_info.type = 'cmd';
				} else {
					_info.type = cmd ? 'cmd' : 'amd';
				}
				return _info;
			}
		};


		/**
		 *标准定义模块接口
		 */
		var define = info.global.define = function(name, dependencies, fun) {
			//根据参数特性判断规范，得到格式化定义信息处理方法
			var infoFormatter = definitionFormatter[typeOf(name) + typeOf(dependencies) + typeOf(fun)];
			var moduleInfo = (infoFormatter && infoFormatter(name, dependencies, fun)) || {};
			if (moduleInfo.name) {
				//具名模块可以立即解析
				with(moduleInfo) {
					Niman.define(name, dependencies, buildCallBackMap[type](name, dependencies, fun));
				}
			} else {
				//保存格式化后定义信息,在onload阶段解析
				currentModuleInfo.push(moduleInfo);
			}
		};

		info.global.require = function(name) {
			Niman.use(name);
		};

		//define.amd = {};
		define.cmd = {};
		define.require = info.global.require;

	});
})(this);
/**
 * application
 */
(function(ctx) {
	var Niman = ctx.Niman;
	Niman.plugin('application', ['supports'], function(info) {
		var moduleFactory = info.moduleFactory;

		//插件
		var plugins = info.config.plugin,
			pluginAllOkArr = [];
		for (var i = 0; i < plugins.length; i++) {
			pluginAllOkArr.push(moduleFactory.getPlugin(plugins[i]).initState);
		}

		var readyState = new info.StateAction();
		info.readyState = readyState;

		function ready(fn) {
			var isIE = /msie/g.test(navigator.userAgent.toLowerCase());
			if (!isIE && document.addEventListener) {
				document.addEventListener("DOMContentLoaded", function() {
					document.removeEventListener("DOMContentLoaded", fn, false);
				}, false);
			} else {
				if (document.documentElement.doScroll && window == window.top)(function() {
					try {
						document.documentElement.doScroll("left");
						fn();
					} catch (error) {
						setTimeout(arguments.callee, 0);
						return;
					}
				})();
			}
		};

		function setOk() {
			readyState.setOk();
		};

		info.windowLoadState.ok(setOk);
		ready(setOk);

		//预加载模块
		var preloadAllOkArr = [readyState];

		//预加载模块在页面加载后初始化
		var preloadAllOk = new info.StateAction();
		info.allPluginInitState.ok(function() {
			var main = info.currentScript.getAttribute('data-main') || info.config.main;
			info.config.main = main;
			var preloads = info.config.preload || (info.config.preload = []);
			for (var i = 0; i < preloads.length; i++) {
				var _name = preloads[i];
				var _preload = moduleFactory.getModule(_name);
				preloadAllOkArr.push(_preload.initState);
				Niman.use(_name);
			}

			//			info.afterConfig.ok(function() {
			//				main && info.moduleLoader.load(main);
			//			});

			preloadAllOk.all(preloadAllOkArr).ok(function() {
				main && Niman.use(main);
			});
		});
	});
})(this);
/**
 *  初始化
 */
(function(ctx) {
	ctx.Niman._init(function(info) {
		info.config.plugin = ['supports', 'definition', 'application'];
		info.config.cmdOnly = true;
	});
})(this);