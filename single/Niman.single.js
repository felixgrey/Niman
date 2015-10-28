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

/*!
 * Sizzle CSS Selector Engine v@VERSION
 * http://sizzlejs.com/
 *
 * Copyright 2008, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: @DATE
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// General-purpose constants
	MAX_NEGATIVE = 1 << 31,

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf as it's faster than native
	// http://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,
	rescape = /'|\\/g,

	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	};

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var match, elem, m, nodeType,
		// QSA vars
		i, groups, old, nid, newContext, newSelector;

	if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
		setDocument( context );
	}

	context = context || document;
	results = results || [];
	nodeType = context.nodeType;

	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	if ( !seed && documentIsHTML ) {

		// Try to shortcut find operations when possible (e.g., not under DocumentFragment)
		if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document (jQuery #6963)
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, context.getElementsByTagName( selector ) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && support.getElementsByClassName ) {
				push.apply( results, context.getElementsByClassName( m ) );
				return results;
			}
		}

		// QSA path
		if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
			nid = old = expando;
			newContext = context;
			newSelector = nodeType !== 1 && selector;

			// qSA works strangely on Element-rooted queries
			// We can work around this by specifying an extra ID on the root
			// and working up from there (Thanks to Andrew Dupont for the technique)
			// IE 8 doesn't work on object elements
			if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
				groups = tokenize( selector );

				if ( (old = context.getAttribute("id")) ) {
					nid = old.replace( rescape, "\\$&" );
				} else {
					context.setAttribute( "id", nid );
				}
				nid = "[id='" + nid + "'] ";

				i = groups.length;
				while ( i-- ) {
					groups[i] = nid + toSelector( groups[i] );
				}
				newContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;
				newSelector = groups.join(",");
			}

			if ( newSelector ) {
				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch(qsaError) {
				} finally {
					if ( !old ) {
						context.removeAttribute("id");
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
	var div = document.createElement("div");

	try {
		return !!fn( div );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( div.parentNode ) {
			div.parentNode.removeChild( div );
		}
		// release memory in IE
		div = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = attrs.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			( ~b.sourceIndex || MAX_NEGATIVE ) -
			( ~a.sourceIndex || MAX_NEGATIVE );

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare,
		doc = node ? node.ownerDocument || node : preferredDoc,
		parent = doc.defaultView;

	// If no document and documentElement is available, return
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Set our document
	document = doc;
	docElem = doc.documentElement;

	// Support tests
	documentIsHTML = !isXML( doc );

	// Support: IE>8
	// If iframe document is assigned to "document" variable and if iframe has been reloaded,
	// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
	// IE6-8 do not support the defaultView property so parent will be undefined
	if ( parent && parent !== parent.top ) {
		// IE11 does not have attachEvent, so all must suffer
		if ( parent.addEventListener ) {
			parent.addEventListener( "unload", function() {
				setDocument();
			}, false );
		} else if ( parent.attachEvent ) {
			parent.attachEvent( "onunload", function() {
				setDocument();
			});
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties (excepting IE8 booleans)
	support.attributes = assert(function( div ) {
		div.className = "i";
		return !div.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( div ) {
		div.appendChild( doc.createComment("") );
		return !div.getElementsByTagName("*").length;
	});

	// Support: IE<9
	support.getElementsByClassName = rnative.test( doc.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( div ) {
		docElem.appendChild( div ).id = expando;
		return !doc.getElementsByName || !doc.getElementsByName( expando ).length;
	});

	// ID find and filter
	if ( support.getById ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var m = context.getElementById( id );
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [ m ] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		// Support: IE6/7
		// getElementById is not reliable as a find shortcut
		delete Expr.find["ID"];

		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See http://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( doc.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			div.innerHTML = "<select msallowcapture=''>" +
				"<option id='d\f]' selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( div.querySelectorAll("[msallowcapture^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.2+, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.7+
			if ( !div.querySelectorAll("[id~=d]").length ) {
				rbuggyQSA.push("~=");
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}
		});

		assert(function( div ) {
			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = doc.createElement("input");
			input.setAttribute( "type", "hidden" );
			div.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( div.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			div.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( div ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( div, "div" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( div, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully does not implement inclusive descendent
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === doc ? -1 :
				b === doc ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return doc;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch(e) {}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, outerCache, node, diff, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {
							// Seek `elem` from a previously-cached index
							outerCache = parent[ expando ] || (parent[ expando ] = {});
							cache = outerCache[ type ] || [];
							nodeIndex = cache[0] === dirruns && cache[1];
							diff = cache[0] === dirruns && cache[2];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									outerCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						// Use previously-cached element index if available
						} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
							diff = cache[1];

						// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
						} else {
							// Use the same loop as above to seek `elem` from the start
							while ( (node = ++nodeIndex && node && node[ dir ] ||
								(diff = nodeIndex = 0) || start.pop()) ) {

								if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
									// Cache the index of each encountered element
									if ( useCache ) {
										(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
									}

									if ( node === elem ) {
										break;
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});
						if ( (oldCache = outerCache[ dir ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							outerCache[ dir ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			return ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context !== document && context;
			}

			// Add elements passing elementMatchers directly to results
			// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// Apply set filters to unmatched elements
			matchedCount += i;
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is no seed and only one group
	if ( match.length === 1 ) {

		// Take a shortcut and set the context if the root selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				support.getById && context.nodeType === 9 && documentIsHTML &&
				Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( div1 ) {
	// Should return 1, but returns 4 (following)
	return div1.compareDocumentPosition( document.createElement("div") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( div ) {
	div.innerHTML = "<a href='#'></a>";
	return div.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( div ) {
	div.innerHTML = "<input/>";
	div.firstChild.setAttribute( "value", "" );
	return div.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( div ) {
	return div.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

// EXPOSE
if ( typeof define === 'function' && define.cmd && define.amd ) {
	define("Sizzle",[],function() { return Sizzle; });
// Sizzle requires that there be a global window in Common-JS like environments
} else if ( typeof module !== "undefined" && module.exports ) {
	module.exports = Sizzle;
} else {
	window.Sizzle = Sizzle;
}
// EXPOSE

})( window );




/**
 * 已有模块的整合优化
 */
;
(function(_window) {

	function joinNEventsNViewModel(NEvents, NViewModel) {
		NViewModel.prototype._observeElement = function(_element, type, callback) {
			NEvents.listen(_element).on(type, _element, callback);
		};
		NViewModel.prototype._stopObserveElement = function(_element, type, callback) {
			NEvents.listen(_element).un(type, _element, callback);
		};
	};

	function joinNEventsNDomQuery(NEvents, NDomQuery) {
		NDomQuery.prototype._observeElement = function(_element, type, callback) {
			NEvents.listen(_element).on(type, _element, callback);
		};
		NDomQuery.prototype._stopObserveElement = function(_element, type, callback) {
			NEvents.listen(_element).un(type, _element, callback);
		};
	};

	var PromiseNAjaxJoined = false;

	function joinPromiseNAjax(NAjax) {
		if (PromiseNAjaxJoined || !Promise || !NAjax || NAjax.hasPromise) {
			return;
		}
		PromiseNAjaxJoined = true;
		NAjax.setPromise(Promise);
	};

	var PromiseEmitterJoined = false;

	function joinPromiseEmitter(NUtils) {
		if (PromiseEmitterJoined || !Promise || !NUtils || NUtils.Emitter.prototype.call) {
			return;
		}
		PromiseEmitterJoined = true;
		NUtils.Emitter.setPromise(Promise);
	};

	var factory = function(o) {
		var NViewModel = o.NViewModel,

			NPromise = o.NPromise,
			NEvents = o.NEvents,
			NDomQuery = o.NDomQuery,
			Sizzle = o.Sizzle,
			NUtils = o.NUtils,
			//			NRouter = o.NRouter,		
			//			NBezier = o.NBezier,
			//			Dragger = o.Dragger,
			//			Gesture = o.Gesture,
			NAjax = o.NAjax;

		var reObj = {};

		if (NEvents && NViewModel) {
			joinNEventsNViewModel(NEvents, NViewModel);
		}

		if (NEvents && NDomQuery) {
			joinNEventsNDomQuery(NEvents, NDomQuery);
		}

		if (Sizzle && NDomQuery) {
			NDomQuery.setSizzle(Sizzle);
		}

		if (NAjax && (Promise || NPromise)) {
			joinPromiseNAjax(NAjax);
		}

		if (NUtils && (Promise || NPromise)) {
			joinPromiseEmitter(NUtils);
		}

		return reObj;
	};
	//-----------------------------------------模块-----------------------------------------//
	if (Niman && Niman.plugin && Niman.define) {
		Niman.plugin('NCombinationPlugin', ['supports', 'definition', 'application'], function(info) {
			var modules = ['NViewModel', 'NPromise', 'NEvents', 'NDomQuery',
				'NAjax', 'Sizzle', 'NUtils' //, 'NRouter',  'Dragger', 'Gesture'
			];

			var moduleDefineStates = {};
			var _name;
			for (var i = 0; i < modules.length; i++) {
				_name = modules[i];
				moduleDefineStates[_name] = info.moduleFactory.getModule(_name).defineState;
			}

			var StateAction = info.StateAction;
			var context = info.context;

			new StateAction().all([moduleDefineStates['NEvents'], moduleDefineStates['NViewModel']]).ok(function() {
				Niman.use('NEvents', function() {
					Niman.use('NViewModel', function() {
						joinNEventsNViewModel(context.NEvents, context.NViewModel);
					});
				});
			});

			new StateAction().all([moduleDefineStates['NEvents'], moduleDefineStates['NDomQuery']]).ok(function() {
				Niman.use('NEvents', function() {
					Niman.use('NDomQuery', function() {
						joinNEventsNViewModel(context.NEvents, context.NDomQuery);
					});
				});
			});

			new StateAction().all([moduleDefineStates['NDomQuery'], moduleDefineStates['Sizzle']]).ok(function() {
				Niman.use('NDomQuery', function() {
					Niman.use('Sizzle', function() {
						context.NDomQuery.setSizzle(context.Sizzle);
					});
				});
			});

			moduleDefineStates['NAjax'].ok(function() {
				Niman.use('NAjax', function() {
					joinPromiseNAjax(context.NAjax);
				});
			});

			moduleDefineStates['NUtils'].ok(function() {
				Niman.use('NUtils', function() {
					joinPromiseEmitter(context.NUtils);
				});
			});

			moduleDefineStates['NPromise'].ok(function() {
				Niman.use('NPromise', function() {
					joinPromiseNAjax(context.NAjax);
					joinPromiseEmitter(context.NUtils);
				});
			});

		});
	} else if (typeof define === 'function' && define.cmd) {
		//CommonJS
		define("NCombinationPlugin",[],function(require, _exports, module) {
			module.exports = factory;
		});
	} else {
		factory({
			NViewModel: _window.NimanViewModel,
			NPromise: _window.NimanPromise,
			NEvents: _window.NimanEvents,
			NDomQuery: _window.NimanDomQuery,
			Sizzle: _window.Sizzle,
			NUtils: _window.NimanUtils,
			//			NRouter: _window.NimanRouter,
			//			NBezier: _window.NimanBezier,
			//			Dragger: _window.NimanDragger,
			//			Gestrue: _window.NimanGestrue,
			NAjax: _window.NimanAjax
		});
	}
})(this);

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
	} else if (typeof define === 'function' && define.cmd) {
		//CommonJS
		define("NCookies",[],function(require, exports, module) {
			module.exports = NCookies;
		});
	} else {
		//window
		_window.NimanCookies = NCookies;
	}

})(this);

/**
 * 事件管理器
 */
;(function(_window) {

	var eventsMap = {};

	var exports = {
		handler: {}
	};

	exports.POSITION_EVENTS = ['gesturestart', 'gesturechange', 'gestureend', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseover', 'mousemove', 'mouseup', 'click', "dblclick", "contextmenu", 'mousewheel', 'DOMMouseScroll'];

	exports.BROWSER_EVENTS = ['orientationchange', "drop", "dragleave", "dragenter", "dragover", "dragend", "dragstart", "drag", "load", "change", "focus", 'scroll', "blur", "resize", "error", "keypress", "keydown", "keyup"].concat(exports.POSITION_EVENTS);

	function False(evt) {
		exports.preventDefault(evt);
		return false;
	};

	/**
	 * MouseHandler
	 */
	function Mouse(core) {
		this.info = {
			downXY: {}
		}
		this.touchmoved = false;
		this.core = core;
		this.init();
	};

	exports.handler.Mouse = Mouse;

	Mouse.prototype = {
		interval: 300,
		mouseEventOn: 400,
		deviation: 5,
		name: 'Mouse',
		clickOnPushDown: false,
		init: function() {
			this._listenMouse(true);
			this._listenTouch(true);
			this.core.on('DOMMouseScroll', this, this._wheel);
		},
		_listenMouse: function(_listen) {
			var events = this.core,
				fun = 'un';
			if (_listen) {
				this._listenMouse(false);
				fun = 'on';
			}
			events[fun]('contextmenu', this, this._rightclick);
			events[fun]('mousewheel', this, this._wheel);
			events[fun]('mousedown', this, this._mousedown);
			events[fun]('mousemove', this, this._mousemove);
			events[fun]('mouseup', this, this._mouseup);
		},
		_listenTouch: function(_listen) {
			var events = this.core,
				fun = 'un';
			if (_listen) {
				this._listenTouch(false);
				fun = 'on';
			}
			events[fun]('touchstart', this, this._touchstart);
			events[fun]('touchmove', this, this._touchmove);
			events[fun]('touchend', this, this._touchend);
		},
		_wheel: function(evt) {
			var c = this.core;
			evt.wheelStep = evt.wheelDelta ? (evt.wheelDelta / 120) : (-evt.detail / 3);
			if (evt.wheelStep > 0) {
				c.emit('$wheelup', evt);
			} else {
				c.emit('$wheeldown', evt);
			}
			c.emit('$wheel', evt);
		},
		_rightclick: function(evt) {
			this.core.emit('$right', evt);
		},
		_down: function(evt) {
			var info = this.info;
			info.hasClick = false;
			info.hasDown = getSrcElement(evt);
			info.hasMove = false;
			if (this.clickOnPushDown) {
				info.hasClick = true;
				this.core.emit('$click', evt);
			}
			this.core.emit('$down', evt);
			return false;
		},
		_mousedown: function(evt) {
			this._listenTouch(false);
			//this._down(evt);
			this.info.downXY = {
				x: evt.clientX,
				y: evt.clientY
			};
			this._down(evt);
		},
		_mousemove: function(evt) {
			this._move(evt, {
				x: evt.clientX,
				y: evt.clientY
			});
		},
		_mouseup: function(evt) {
			this._listenTouch(true);
			this._up(evt, {
				x: evt.clientX,
				y: evt.clientY
			});
		},
		_touchstart: function(evt) {
			this._listenMouse(false);
			//this._down(evt);
			var tts = evt.targetTouches
			this.info.downXY = {
				x: tts[0].clientX,
				y: tts[0].clientY
			}
			this._down(evt);
		},
		_touchmove: function(evt) {
			var tts = evt.targetTouches;
			this._move(evt, {
				x: tts[0].clientX,
				y: tts[0].clientY
			});
		},
		_touchend: function(evt) {
			var self = this;
			clearTimeout(this.info.timeoutId);
			this.info.timeoutId = setTimeout(function() {
				self._listenMouse(true);
			}, this.mouseEventOn);
			var tts = evt.targetTouches;
			this._up(evt);
		},
		_move: function(evt, xy) {
			var info = this.info;
			if (!info.hasDown) {
				return;
			}
			if (!info.hasMove) {
				info.hasMove = Math.abs(info.downXY.x - xy.x) > this.deviation || Math.abs(info.downXY.y - xy.y) > this.deviation;
				if (info.hasMove) {
					this.core.emit('$movestart', evt);
				}
			}
			if (info.hasMove) {
				this.core.emit('$move', evt);
				if (info.inTiming) {
					this._clearTimeout();
				}
			}
		},
		_clearTimeout: function(isDouble) {
			var info = this.info;
			clearTimeout(info.inTiming);
			info.inTiming = false;
			if (!isDouble && 2 != this.clickButtion) {
				this.core.emit('$lagclick', info._lagevt);
			}
			this.clickButtion = -1;
		},
		_up: function(evt) {
			var _src = getSrcElement(evt),
				info = this.info;
			this.core.emit('$up', evt);
			if (info.hasMove || info.hasDown != _src) {
				info.hasDown = false;
				return;
			}
			if (!this.clickOnPushDown && !info.hasClick) {
				info.hasClick = true;
				this.core.emit('$click', evt);
			}			
			info.hasDown = false;
			var _time = new Date().getTime();
			var _ = this;
			if (!info.inTiming) {
				var _e = this.info._lagevt = {
					sims: true
				};
				for (var k in evt) {
					_e[k] = evt[k];
				}
				info.inTiming = setTimeout(function() {
					_._clearTimeout();
				}, this.interval);
				this.clickButtion = evt.button;
			} else {
				if (this.clickButtion == evt.button) {
					if (2 == this.clickButtion) {
						this.core.emit('$dbrclick', evt);
					} else {
						this.core.emit('$dblclick', evt);
					}
					_._clearTimeout(true);
				} else {
					_._clearTimeout();
				}
			}
		},
		destroy: function() {
			this._listenMouse(false);
			this._listenTouch(false);
			this.core.un('DOMMouseScroll', this, this._wheel);
		}
	};

	var idIndex = 0;

	exports.useMouseHandler = true;

	var Events = exports.Events = function() {
		this.emitterMap = {};
		this.contextInfo = {};
		this.listenerList = [];
		this.id = idIndex++;
		eventsMap[this.id] = this;
		if (exports.useMouseHandler) {
			this.mouse = new Mouse(this);
		}
	};

	Events.prototype = {
		_get: function(evtName) {
			return this.emitterMap[evtName] = this.emitterMap[evtName] || [];
		},
		/**
		 * 销毁事件管理对象
		 */
		destroy: function() {
			this.emitterMap = null;
			var obj;
			while (obj = this.listenerList.shift()) {
				exports.stopObserveElement(this.bindedElement, obj.name, obj.fun);
			}
			this.listenerList = null;
			this.bindedElement = null;
			if (this.mouse) {
				this.mouse.destroy();
			}
			delete eventsMap[this.id];
		},
		/**
		 * 监听事件
		 * @param {Object} evtName 事件名称
		 * @param {Object} scope 上下文，this指代对象
		 * @param {Object} fun 事件响应方法
		 * @param {Object} once 是否是一次性事件
		 */
		on: function(evtName, scope, fun, once) {
			var evts = this._get(evtName);
			evts.push({
				evtName: evtName,
				scope: scope,
				fun: fun,
				once: once
			});
			return this;
		},
		/**
		 * 解除监听事件
		 * @param {Object} evtName 事件名称
		 * @param {Object} scope 上下文，this指代对象
		 * @param {Object} fun 事件响应方法
		 */
		un: function(evtName, scope, fun) {
			var evts = this._get(evtName);
			for (var i = 0; i < evts.length; i++) {
				var evt = evts[i];
				if (evt.scope == scope && evt.fun == fun) {
					evts.splice(i, 1);
				}
			}
			return this;
		},
		/**
		 * 发射事件
		 * @param {Object} evtName 事件名称
		 * [@param..] 发射事件参数
		 */
		emit: function(evtName) {
			var args = Array.prototype.slice.call(arguments),
				evtName = args.shift(),
				evts = this._get(evtName),
				delArr = [];
			for (var i = 0; i < evts.length; i++) {
				var evt = evts[i];
				var next = evt.fun.apply(evt.scope, args);
				evt.once && delArr.push(evt);
				if (false === next) {
					break;
				}
			}
			for (var i = 0; i < delArr.length; i++) {
				var evt = delArr[i]
				this.un(evt.evtName, evt.scope, evt.fun);
			}
			return this;
		},
		/**
		 * 中断冒泡
		 */
		stopEvent: false,
		/**
		 * 取消默认行为
		 * @param {Object} evtName 事件名称
		 */
		cancelDefault: function(evtName) {
			this.bindedElement['on' + evtName] = False;
		}
	};

	var _type = function(element, type) {
		if (type == 'keypress' && (navigator.appVersion.match(/Konqueror|Safari|KHTML/) || element.attachEvent)) {
			return 'keydown';
		}
		return type;
	};

	/**
	 * 监听元素
	 * @param {Object} element 被监听的元素
	 * @param {Object} type 事件名称
	 * @param {Object} callback 响应函数
	 * @param {Object} useCapture 是否只在捕获阶段处理事件
	 */
	exports.observeElement = function(element, type, callback, useCapture) {
		useCapture = useCapture || false;
		type = _type(element, type);
		if (element.addEventListener) {
			element.addEventListener(type, callback, useCapture)
		} else {
			element.attachEvent('on' + type, callback);
		}
	};

	/**
	 * 停止监听元素
	 * @param {Object} element 被监听的元素
	 * @param {Object} type 事件名称
	 * @param {Object} callback 响应函数
	 * @param {Object} useCapture 是否只在捕获阶段处理事件
	 */
	exports.stopObserveElement = function(element, type, callback, useCapture) {
		type = _type(element, type);
		element.removeEventListener && element.removeEventListener(type, callback, useCapture);
		element.detachEvent && element.detachEvent('on' + type, callback);
	};

	/**
	 * 停止事件冒泡
	 * @param {Object} evt 事件对象
	 */
	exports.stopEvent = function(evt) {
		try {
			evt.cancelBubble = true;
			evt.stopPropagation && evt.stopPropagation();
		} catch (e) {}
	};

	/**
	 * 阻止事件默认行为
	 * @param {Object} evt 事件对象
	 */
	exports.preventDefault = function(evt) {
		try {
			evt.returnValue = false;
			evt.preventDefault && evt.preventDefault();
		} catch (e) {}
	};

	/**
	 * 从某个元素开始，上级父元素遍历，寻找元素
	 * @param {Object} element 起始元素
	 * @param {Object} callback 遍历回调，参数为当前遍历的元素
	 * @param {Object} top 终止元素
	 */
	exports.findElement = function(element, callback, top) {
		while (element.parentNode) {
			if (callback(element)) {
				return element;
			}
			if (top == element) {
				return null;
			}
			element = element.parentNode;
		}
		return null;
	};


	/**
	 * 获得事件源
	 * @param {Object} event 事件对象
	 */
	var getSrcElement = exports.getSrcElement = function(evt) {
		return evt.srcElement || evt.target;
	};

	//位置信息
	var positionInfo = exports.positionInfo = function(evt) {
		evt.xy = {
			x: evt.clientX,
			y: evt.clientY
		};
		evt.wheelStep = evt.wheelDelta ? (evt.wheelDelta / 120) : (-evt.detail / 3);
	};

	/**
	 * 销毁监听器
	 * @param {Object} element 绑定事件的元素
	 */
	exports.destroy = function(element) {
		var events = eventsMap[element.event_id];
		events && events.destroy();
	};

	//绑定
	var bind = function(_name, eventManager) {
		return function(evt) {
			evt = evt || _window.event;
			evt.manager = {
				eventName: _name,
				event: eventManager,
				element: eventManager.bindedElement,
				src: getSrcElement(evt)
			};
			eventManager.stopEvent && exports.stopEvent(evt);
			eventManager.emit(_name, evt);
		}
	};

	/**
	 * 监听元素
	 * @param {Object} element 绑定事件的元素
	 * @param {Object} stop 是否中断事件冒泡
	 */
	exports.listen = function(element, stop) {
		if ('string' == typeof element) {
			element = _window.document.getElementById(element);
		}
		var events = eventsMap[element.event_id],
			be = exports.BROWSER_EVENTS;
		if (!events) {
			events = new exports.Events;
			events.bindedElement = element;
			element.event_id = events.id;
			for (var i = 0; i < be.length; i++) {
				var fun = bind(be[i], events);
				events.listenerList.push({
					name: be[i],
					fun: fun
				});
				exports.observeElement(element, be[i], fun);
			}
			for (var i = 0; i < exports.POSITION_EVENTS.length; i++) {
				events.on(exports.POSITION_EVENTS[i], events, positionInfo);
			}
		}
		events.stopEvent = stop;
		return events;
	};

	//-----------------------------------------模块-----------------------------------------//

	if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
		//node.js
		module.exports = exports;
	} else if (typeof define === 'function' && define.cmd) {
		//CommonJS
		define("NEvents",[],function(require, _exports, module) {
			module.exports = exports;
		});
	} else {
		//window
		_window.NimanEvents = exports;
	}
})(this);

/**
 * 路由器
 */
;(function(_window) {
	var oldIE = false,
		nav = _window['navigator'];

	if (nav) {
		var userAgent = nav.userAgent.toLowerCase();
		oldIE = /msie [6789]/g.test(userAgent);
	}

	var nextFrame = (function() { //动画
			return _window.requestAnimationFrame ||
				_window.webkitRequestAnimationFrame ||
				_window.mozRequestAnimationFrame ||
				_window.oRequestAnimationFrame ||
				_window.msRequestAnimationFrame ||
				function(callback) {
					return setTimeout(callback, 1);
				};
		})(),
		cancelFrame = (function() {
			return _window.cancelRequestAnimationFrame ||
				_window.webkitCancelAnimationFrame ||
				_window.webkitCancelRequestAnimationFrame ||
				_window.mozCancelRequestAnimationFrame ||
				_window.oCancelRequestAnimationFrame ||
				_window.msCancelRequestAnimationFrame ||
				clearTimeout;
		})(),
		animationMap = {},
		count = 0,
		next = function() {
			var _o;
			for (var i in animationMap) {
				_o = animationMap[i]();
			}
			nextFrame(next);
		},
		nextId;

	/**
	 * 动画
	 */
	var Animation = function(callback) {
		if (callback) {
			this.setCallback(callback);
		}
	};

	Animation.prototype = {
		start: function() { //开始播放动画
			if (0 == count) {
				nextId = nextFrame(next);
			}
			if (this.callback && !this.running) {
				count++;
				animationMap[count] = this.callback;
				this.index = count;
				this.running = true;
			}
		},
		running: false,
		stop: function() { //停止播放动画
			if (this.running) {
				count--;
				delete animationMap[this.index];
				this.running = false;
			}
			if (0 == count) {
				cancelFrame(nextId);
			}
		},
		setCallback: function(callback) { //播放回调
			this.callback = callback;
		}
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

	var currentUrl = _window.location.href,
		observeElement = function(_element, type, callback) {
			if (_element.addEventListener) {
				_element.addEventListener(type, callback)
			} else {
				_element.attachEvent('on' + type, callback);
			}
		},
		stopObserveElement = function(_element, type, callback) {
			_element.removeEventListener && _element.removeEventListener(type, callback);
			_element.detachEvent && _element.detachEvent('on' + type, callback);
		};

	function NRouter(container) {
		var self = this;
		if ('string' == typeof container) {
			container = document.getElementById(container);
		}
		self.container = container;
		container.style.overflow = "hidden";
		if ("" == container.style.position) {
			container.style.position = 'relative';
		}

		self.page1 = document.createElement('div');
		self._initStyle(self.page1.style);

		self.page2 = document.createElement('div');
		self._initStyle(self.page2.style);
		self.page2.style.left = '100%';

		self.routeMap = {};

		self.currentInfo = {};

		self.animation = new Animation();

		self._onHashChange = function() {
			if (!self.shadowRouter) {
				var _url = self.getRouteUrl();
				self.route(_url, null, 0);
			}
		};

		observeElement(_window, 'hashchange', self._onHashChange);

	}

	/*
	 * matchUri:
	 * translateTime:
	 * context
	 * init:(dom,ready())
	 * afterAppend:(dom,url)
	 * afterShow:(dom,url)
	 * from right|left|top|bottom
	 * route(url,from,time)
	 */

	var isNoValue = function(value) {
		return null == value || 'undefined' == typeof value;
	}

	var doNothing = function() {};

	NRouter.prototype = {
		defaultTranslateTime: 300,
		useTransition: true,
		shadowRouter: false,
		_initStyle: function(style) {
			style.position = 'absolute';
			style.left = '0%';
			style.top = '0%';
			style.width = '100%';
			style.height = '100%';
			style.overflow = "hidden";
		},
		onHash: function(fun) {
			stopObserveElement(_window, 'hashchange', self._onHashChange);
			observeElement(_window, 'hashchange', fun);
		},
		/**
		 * 设置默认URL，未明确指定URL时跳转到这个URL
		 * @param {Object} defaultUrl 默认URL
		 */
		setDefaultUrl: function(defaultUrl) {
			this.currentInfo.defaultUrl = defaultUrl;
		},
		getRouteUrl: function() {
			return _window.location.hash.replace('#', '');
		},
		/**
		 * 增加路由表
		 * @param {Object} matchUrl 匹配的URL
		 * @param {Object} obj 操作列表
		 */
		addRouteMap: function(matchUrl, obj) {
			if (!this.currentInfo.defaultUrl) {
				this.currentInfo.defaultUrl = matchUrl;
			}
			obj.matchUrl = matchUrl;

			obj.firstAppend = obj.firstAppend || doNothing;
			obj.afterAppend = obj.afterAppend || doNothing;

			obj.firstShow = obj.firstShow || doNothing;
			obj.afterShow = obj.afterShow || doNothing;

			obj.beforeRemove = obj.beforeRemove || doNothing;

			obj.translateTime = ('undefined' != typeof obj.translateTime) ? obj.translateTime : this.defaultTranslateTime;
			this.routeMap[matchUrl] = obj;
		},
		_animationTransform: function(o) {
			var translateTime = o.translateTime,
				thisPage = o.thisPage,
				nextPage = o.nextPage,
				transformStyle = o.transformStyle,
				thisPageToValue = o.thisPageToValue,
				nextPageFromValue = o.nextPageFromValue,
				nextPageToValue = o.nextPageToValue,
				startTime,
				self = this,
				_p0 = nextPageFromValue == '-100%' ? '-' : '',
				_p1 = thisPageToValue == '-100%' ? '-' : '',
				_is100 = nextPageFromValue == '100%' || nextPageFromValue == '-100%';

			if (0 == translateTime) {
				thisPage.style[transformStyle] = thisPageToValue;
				nextPage.style[transformStyle] = nextPageToValue;
				return;
			}
			var step = 100 / translateTime;
			self.animation.setCallback(function() {
				var during = new Date().getTime() - startTime;
				if (during >= translateTime) {
					thisPage.style[transformStyle] = thisPageToValue;
					nextPage.style[transformStyle] = nextPageToValue;
					self.animation.stop();
				}
				var changeValue = step * during;
				if (changeValue > 100) {
					changeValue = 100;
				} else if (changeValue < 0) {
					changeValue = 0;
				}
				if (_is100) {
					nextPage.style[transformStyle] = _p0 + (100 - changeValue) + '%';
				} else {
					nextPage.style[transformStyle] = changeValue + '%';
				}
				thisPage.style[transformStyle] = _p1 + changeValue + '%';
			});
			startTime = new Date().getTime();
			self.animation.start();
		},
		changePage: function(thisPage, nextPage) {

		},
		transform: function(thisPage, nextPage, translateTime, from) {
			//从右边开始滑动
			var thisPageToValue = '-100%',
				nextPageFromValue = '100%';
			//左右滑动还是上下滑动	
			var transformStyle = new RegExp('left|right').test(from) ? 'left' : 'top';
			//左右滑动时，top为 0%，上下滑动时left为 0%
			var anotherStyle = new RegExp('left|right').test(from) ? 'top' : 'left';

			//从左边开始滑动
			if (transformStyle == from) {
				thisPageToValue = '100%';
				nextPageFromValue = '-100%';
			}
			var _from = function() {
				nextPage.style[transformStyle] = nextPageFromValue;
				nextPage.style[anotherStyle] = '0%';
			};

			if (transformStyle && this.useTransition && !oldIE) {
				nextPage.style.transition = transformStyle + ' 0ms';
				thisPage.style.transform = 'translateZ(0px)';
				_from();
				setTimeout(function() {
					thisPage.style.transition = transformStyle + ' ' + translateTime + 'ms';
					nextPage.style.transition = transformStyle + ' ' + translateTime + 'ms';
					thisPage.style[transformStyle] = thisPageToValue;
					nextPage.style[transformStyle] = '0%';
				}, 1);
			} else if (transformStyle) {
				_from();
				this._animationTransform({
					translateTime: translateTime,
					thisPage: thisPage,
					nextPage: nextPage,
					transformStyle: transformStyle,
					thisPageToValue: thisPageToValue,
					nextPageFromValue: nextPageFromValue,
					nextPageToValue: nextPageToValue
				});
			}
			_from = null;
		},
		removeRouteMap: function(matchUrl) {
			var obj = this.routeMap[matchUrl];
			delete obj.container;
			delete obj.hasInit;
		},
		destroy: function() {
			for (var k in this.routeMap) {
				this.removeRouteMap(k);
			}
			stopObserveElement(_window, 'hashchange', self._onHashChange);
			self._onHashChange = null;
		},
		isTranslating: function() {
			return this.currentInfo.translating;
		},
		/**
		 * 跳转到指定URL
		 * @param {Object} url 跳转的URL
		 * @param {Object} from 起始方向 left|right|top|bottom 默认right
		 * @param {Object} time 动画时间
		 */
		route: function(url, from, time) {
			var self = this;
			if (isNoValue(url) && !self.shadowRouter) {
				url = self.getRouteUrl();
			}
			if ("" === url && self.currentInfo.defaultUrl) {
				url = self.currentInfo.defaultUrl;
			}
			if (self.currentInfo.currentUrl == url || self.currentInfo.translating) {
				return false;
			}
			for (var k in self.routeMap) {
				if (new RegExp(k, 'g').test(url)) {
					if (!this.shadowRouter) {
						_window.location.hash = url;
					}
					self.currentInfo.currentUrl = url;
					var obj = self.routeMap[k];
					if (self.currentInfo.currentRouter == obj) {
						obj.afterShow(obj.container, url);
						return false;
					}
					if (isNoValue(time)) {
						time = obj.translateTime;
					}
					if (isNoValue(from)) {
						from = 'right';
					}
					if (!obj.hasInit) {
						obj.readyState = new StateAction(obj);
						obj.hasInit = true;
						obj.container = document.createElement('div');
						self._initStyle(obj.container.style);
						if (obj.init) {
							obj.init(obj.container, function() {
								obj.readyState.setOk();
							});
						} else {
							obj.readyState.setOk();
						}
					}
					obj.readyState.ok(function() {
						self.currentInfo.translating = true;
						self.nextPage = (self.currentPage == self.page1) ? self.page2 : self.page1;
						var thisPage = self.currentPage,
							currentObj = self.currentInfo.currentRouter;
						if (self.currentPage && 0 == time) {

							currentObj.beforeRemove(currentObj.container);

							thisPage.removeChild(currentObj.container);
							self.container.removeChild(thisPage);

							self.nextPage.style.top = '0px';
							self.nextPage.style.left = '0px';

							self.nextPage.appendChild(obj.container);
							self.container.appendChild(self.nextPage);

							if (obj.firstAppend) {
								obj.firstAppend(obj.container, url);
								obj.firstAppend = null;
							}
							obj.afterAppend(obj.container, url);

							if (obj.firstShow) {
								obj.firstShow(obj.container, url);
								obj.firstShow = null;
							}
							obj.afterShow(obj.container, url);

							self.currentPage = self.nextPage;
							self.currentInfo.currentRouter = obj;
							self.currentInfo.translating = false;

							return;
						}
						self.nextPage.appendChild(obj.container);
						self.container.appendChild(self.nextPage);
						if (obj.firstAppend) {
							obj.firstAppend(obj.container, url);
							obj.firstAppend = null;
						}
						obj.afterAppend(obj.container, url);
						if (self.currentPage) {
							self.transform(thisPage, self.nextPage, time, from);
							setTimeout(function() {
								currentObj.beforeRemove(currentObj.container);
								thisPage.removeChild(currentObj.container);
								self.container.removeChild(thisPage);
								if (obj.firstShow) {
									obj.firstShow(obj.container, url);
									obj.firstShow = null;
								};
								obj.afterShow(obj.container, url);
								self.currentInfo.translating = false;
							}, time + 20);
						} else {
							if (obj.firstShow) {
								obj.firstShow(obj.container, url);
								obj.firstShow = null;
							}
							obj.afterShow(obj.container, url);
							self.currentInfo.translating = false;
						}
						self.currentPage = self.nextPage;
						self.currentInfo.currentRouter = obj;
					});
					return true;
				}
			}
			return false;
		}
	};

	//-----------------------------------------模块-----------------------------------------//

	if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
		//node.js
		module.exports = NRouter;
	} else if (typeof define === 'function' && define.cmd) {
		//CommonJS
		define("NRouter",[],function(require, exports, module) {
			module.exports = NRouter;
		});
	} else {
		//window
		_window.NimanRouter = NRouter;
	}
})(this);

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
			request.open("POST", url, param.async);
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
	} else if (typeof define === 'function' && define.cmd) {
		//CommonJS
		define("NAjax",[],function(require, exports, module) {
			module.exports = NAjax;
		});
	} else {
		//window
		_window.NimanAjax = NAjax;
	}
})(this);

/**
 * DOM选择器
 */
;
(function(_window) {

	//Array遍历
	Array.prototype.forEach = Array.prototype.forEach ||
		function(fun) {
			for (var i = 0; i < this.length; i++) {
				var re = fun(this[i], i, this);
				if (false == re) {
					break;
				}
			}
		};

	var _type = function(element, type) {
		if (type == 'keypress' && (navigator.appVersion.match(/Konqueror|Safari|KHTML/) || element.attachEvent)) {
			return 'keydown';
		}
		return type;
	};

	//判断是否是DOM
	var isDom = function(obj) {
		if ((undefined != window['Element'] && obj instanceof window['Element']) ||
			(navigator && new RegExp('msie [67]', 'g').test(navigator.userAgent.toLowerCase()) && 'object' == typeof obj)) {
			return true;
		}
		return false;
	};

	/**
	 * 统一将类数组转变为数组
	 */
	function toArr(_arr) {
		var re = [];
		for (var i = 0; i < _arr.length; i++) {
			re.push(_arr[i]);
		}
		return re;
	};

	//遍历DOM
	var traversalDomNode = function(doms, callback) {
		doms = doms instanceof Array ? doms : [doms];
		var children = [];
		doms.forEach(function(brother) {
			callback(brother);
			children = children.concat(toArr(brother.childNodes));
		});
		children.length > 0 && traversalDomNode(children, callback);
	};

	//添加移除class
	var className = function(dom, name, add) {
		var clsNames = dom.className = dom.className || ' ';
		clsNames = clsNames.split(' ');
		clsNames.forEach(function(v, i) {
			v == name && (clsNames[i] = '');
		})
		dom.className = clsNames.join(' ');
		if (add) {
			dom.className = (dom.className + ' ' + name).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
		}
	};

	//格式化过滤条件
	var formatFilter = function(_filter) {
		return _filter.replace(/^\w+$/g, 'tagName=' + _filter.toUpperCase()).replace(/^\./, 'className=').replace(/^\#/, 'id=').replace(/\[|\]/g, '').split('=');
	};

	//定义NDomQuery
	function NDomQuery(domList) {
		domList = domList || [document];
		domList = ((domList instanceof Array) || (domList instanceof NDomQuery)) ? domList : [domList];
		this.domList = domList;
		this.length = this.domList.length;
		for (var i = 0; i < this.domList.length; i++) {
			this[i] = this.domList[i];
		}
	};

	var _oldStr = null;

	var emitClick = (function() {
		if (document.dispatchEvent) {
			return function(dom) {
				var _evt = document.createEvent('Event');
				_evt.initEvent('click', true, true);
				dom.dispatchEvent(_evt);
			};
		}

		if (document.createElement('div').click) {
			return function(dom) {
				dom.click();
			};
		}

		return function() {

		};
	})();

	/**
	 * 使用Sizzle引擎作为选择器引擎
	 * @param {Object} Sizzle Sizzle引擎
	 */
	NDomQuery.setSizzle = function(Sizzle) {
		var fn = NDomQuery.prototype;
		if (!_oldStr) {
			_oldStr = fn._str;
			fn._str = function(filter) {
				var returnDomList = [];
				this.domList.forEach(function(dom) {
					returnDomList = returnDomList.concat(Sizzle(filter, dom));
				});
				return returnDomList;
			};
		}
	};

	/**
	 * 移除Sizzle引擎
	 */
	NDomQuery.removeSizzle = function() {
		if (_oldStr) {
			NDomQuery.prototype._str = _oldStr;
			_oldStr = null;
		}
	};

	NDomQuery.prototype = {
		_observeElement: function(_element, type, callback, useCapture) {
			useCapture = useCapture || false;
			type = _type(_element, type);
			if (_element.addEventListener) {
				_element.addEventListener(type, callback, useCapture)
			} else {
				_element.attachEvent('on' + type, callback);
			}
		},
		_stopObserveElement: function(_element, type, callback, useCapture) {
			useCapture = useCapture || false;
			type = _type(_element, type);
			_element.removeEventListener && _element.removeEventListener(type, callback, useCapture);
			_element.detachEvent && _element.detachEvent('on' + type, callback);
		},
		_QueryMap: {
			tagName: function(domList, v, tempDomlist) {
				domList.forEach(function(_dom) {
					traversalDomNode(_dom, function(child) {
						var tagName = child.tagName && child.tagName.toUpperCase();
						tagName == v.toUpperCase() && tempDomlist.push(child);
					});
				});
			},
			className: function(domList, v, tempDomlist) {
				domList.forEach(function(_dom) {
					traversalDomNode(_dom, function(child) {
						var classNames = (child.className || '').split(' ');
						for (var i = 0; i < classNames.length; i++) {
							if (classNames[i] == v) {
								tempDomlist.push(child);
								break;
							}
						}
					});
				});
			},
			id: function(domList, v, tempDomlist) {
				domList.forEach(function(_dom) {
					traversalDomNode(_dom, function(child) {
						var id = child.getAttribute && child.getAttribute('id');
						id == v && tempDomlist.push(child);
					});
				});
			}
		},
		_str: function(filter) {
			var returnDomList = [],
				self = this;
			var filters = filter.split(' ');
			var domList = [].concat(this.domList);
			filters.forEach(function(_filter) {
				_filter = formatFilter(_filter);
				var k = _filter[0],
					v = _filter[1],
					l = _filter.length;
				var tempDomlist = [],
					search;
				for (var _k in self._QueryMap) {
					if (new RegExp(_k, 'g').test(k)) {
						search = self._QueryMap[k];
						break;
					}
				}
				//属性查询
				if (!search) {
					search = function(domList, v, tempDomlist) {
						domList.forEach(function(_dom) {
							traversalDomNode(_dom, function(child) {
								if (child.getAttribute) {
									var _v = child.getAttribute(k);
									if ((2 == l && v == _v) || (1 == l && 'null' != typeof _v)) {
										tempDomlist.push(child);
									}
								}
							})
						});
					};
				}
				search(domList, v, tempDomlist);
				domList = tempDomlist;
			});
			return domList;
		},
		_getFilteredDomList: function(filter) {
			if (filter instanceof NDomQuery) {
				return [].concat(filter.domList);
			}
			if ('string' == typeof filter) {
				return this._str(filter);
			} else if (isDom(filter)) {
				return [filter];
			} else if (filter instanceof Array) {
				return filter;
			} else if ('function' == typeof filter) {
				return this._fun(filter);
			}
			return [];
		},
		_fun: function(fun) {
			var returnDomList = [];
			this.domList.forEach(function(_dom) {
				traversalDomNode(_dom, function(child) {
					if (fun(child)) {
						returnDomList.push(child);
					}
				});
			});
			return returnDomList;
		},
		find: function(filter) {
			return new NDomQuery(this._getFilteredDomList(filter));
		},
		each: function(callback) {
			for (var i = 0; i < this.length; i++) {
				if (false === callback.apply(this[i], [i, this[i]])) {
					break;
				}
			}
			return this;
		},
		attr: function(k, v) {
			if ('undefined' == typeof this[0]) {
				return;
			}
			if ('undefined' == typeof v) {
				return this[0] && this[0].getAttribute && this[0].getAttribute(k);
			}
			this.each(function(i, dom) {
				dom.setAttribute && dom.setAttribute(k, v);
			});
			return this;
		},
		prop: function(k, v) {
			if ('undefined' == typeof this[0]) {
				return;
			}
			if ('undefined' == typeof v) {
				return this[0][k];
			}
			this.each(function(i, dom) {
				dom[k] = v;
			});
			return this;
		},
		css: function(k, v) {
			if ('undefined' == typeof v) {
				var _v = this[0].style && this[0].style[k];
				_v = _v ? _v : 'auto';
				return _v;
			}
			this.each(function(i, dom) {
				dom.style[k] = v;
			});
			return this;
		},
		addClass: function(name) {
			this.each(function(i, dom) {
				className(dom, name, true);
			});
			return this;
		},
		removeClass: function(name) {
			this.each(function(i, dom) {
				className(dom, name);
			});
			return this;
		},
		hasClass: function(str) {
			var has=false;
			this.each(function(i, dom) {
				if (new RegExp('(\\s+|^)'+str+'(\\s+|$)', 'g').test(dom.className)) {
					has = true;
				}
			});
			return has;
		},
		//绑定事件
		bind: function(evt, cbk) {
			var self = this;
			this.each(function(i, dom) {
				self._observeElement(dom, evt, cbk);
			});
			return this;
		},
		//解除绑定
		unbind: function(evt, cbk) {
			var self = this;
			this.each(function(i, dom) {
				self._stopObserveElement(dom, evt, cbk);
			});
			return this;
		},
		click: function(cbk) {
			if ('function' == typeof cbk) {
				this.bind('click', cbk);
			} else {
				this.each(function(i, dom) {
					emitClick(dom);
				});
			}
		},
		value: function(value) {
			if ('undefined' == typeof this[0]) {
				return;
			}
			if ('undefined' == typeof value) {
				return this[0].value;
			}
			this.prop('value', value);
			return this;
		},
		show: function(value) {
			this.css('display', '');
			return this;
		},
		hide: function(value) {
			this.css('display', 'none');
			return this;
		},
		toggle: function() {
			this.each(function(i, dom) {
				dom.style.display = dom.style.display == 'none' ? '' : 'none'
			});
			return this;
		}
	};

	/**
	 * 根据选择器，返回NDomQuery对象
	 * @param {Object} filter 元素或选择器
	 */
	NDomQuery.$ = function(filter) {
		if (isDom(filter) || document == filter) {
			return new NDomQuery(filter);
		}
		return new NDomQuery().find(filter);
	};

	if ('function' !== typeof _window.$) {
		_window.$ = NDomQuery.$;
	}

	if (_window.Sizzle) {
		NDomQuery.setSizzle(_window.Sizzle);
	}

	//-----------------------------------------模块-----------------------------------------//

	if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
		//node.js
		module.exports = NDomQuery;
	} else if (typeof define === 'function' && define.cmd) {
		//CommonJS
		define("NDomQuery",[],function(require, exports, module) {
			module.exports = NDomQuery;
		});
	} else {
		//window
		_window.NimanDomQuery = NDomQuery;
	}

})(this);

/**
 * Promise规范
 */
;
(function(_context) {

	var NPromise, toArr, NPromiseCore;

	toArr = function(obj) {
		var arr = [];
		for (var i = 0; i < obj.length; i++) {
			arr.push(obj[i]);
		}
		return arr;
	};

	NPromiseCore = function() {
		this.state = 'unfulfilled';
		this.thenList = [];
		this.params = [];
	};
	
	NPromiseCore.prototype = {
		_complete: function() {
			var self = this;
			setTimeout(function() {
				var _o, state = self.state;
				while (_o = self.thenList.shift()) {
					var re, err = null,
						isPromise = false,
						next = _o.nextPromise;
					if ('function' == typeof _o[state]) {
						try {
							re = _o[state].apply(null, self.params);
						} catch (e) {
							err = e;
						}
						if (isPromise = (re && 'function' == typeof re.then)) {
							(function(_o) {
								re.then(function(p) {
									next._resolve(p);
								}, function(p) {
									next._reject(p);
								});
							})(_o);
						}
						if (err) {
							next._reject(err);
						} else if (!isPromise) {
							next._resolve(re);
						}
					} else {
						next['resolved' == state ? '_resolve' : '_reject'].apply(next, self.params);
					}
				}
			}, 0);
		},
		_then: function(fun1, fun2) {
			var nextPromise = new NPromiseCore();
			this.thenList.push({
				resolved: fun1,
				rejected: fun2,
				nextPromise: nextPromise
			});
			//如果不是初始状态，执行完成动作
			'unfulfilled' != this.state && this._complete();
			return nextPromise;
		},
		_change: function(type, params) {
			//只有初始状态才进一步改变状态
			if (this.state !== 'unfulfilled') {
				return;
			}
			this.state = type;
			this.params = params;
			this._complete();
		},
		_resolve: function(param) {
			this._change('resolved', [param]);
			return this;
		},
		_reject: function(param) {
			this._change('rejected', [param]);
			return this;
		}
	};

	NPromise = function(fun) {
		var core;
		if (fun instanceof NPromiseCore) {
			core = fun;
		} else if (fun instanceof Function) {
			core = new NPromiseCore();
			fun(function(param) {
				core._resolve(param);
			}, function(param) {
				core._reject(param);
			});
		} else {
			throw new Error('Promise constructor takes a function argument');
		}

		this.then = function(fun1, fun2) {
			var _nextCore = new NPromiseCore();
			core._then(function(param) {
				_nextCore._resolve(param);
			}, function(param) {
				_nextCore._reject(param);
			});
			var _next = _nextCore._then(fun1, fun2);
			var next = new NPromise(_next);
			return next;
		}

		this['catch'] = function(fun2) {
			return this.then(null, fun2);
		}
	};

	NPromise.all = function(list) {
		var core = new NPromiseCore();
		var ok = 0,
			allOk = list.length,
			_promise = new NPromise(core),
			reList = [],
			anyReject = false;
		if (!list || list.length == 0) {
			core._resolve();
		}
		for (var i = 0; i < list.length; i++) {
			var prms = list[i];
			(function(i) {
				prms.then(function(p) {
					ok++;
					reList[i] = p;
					if (ok == allOk) {
						core._resolve(reList)
					}
				}, function(p) {
					core._reject(p);
				});
			})(i);
		};
		return _promise;
	};

	NPromise.resolve = function(p) {
		var core = new NPromiseCore();
		var _promise = new NPromise(core);
		if (p && 'function' == typeof p.then) {
			p.then(function(p) {
				core._resolve(p);
			}, function(p) {
				core._reject(p);
			});
		} else {
			core._resolve(p);
		}
		return _promise;
	};

	NPromise.reject = function(p) {
		var core = new NPromiseCore();
		var _promise = new NPromise(core);
		if (p && 'function' == typeof p.then) {
			p.then(function(p) {
				core._resolve(p);
			}, function() {
				core._reject(p);
			});
		} else {
			core._reject(p);
		}
		return _promise;
	};

	NPromise.cast = function(p) {
		if (p && 'function' == typeof p.then) {
			return p;
		};
		var core = new NPromiseCore();
		var _promise = new NPromise(core);
		core._resolve(p);
		return new NPromise(core);
	};

	NPromise.race = function(list) {
		var core = new NPromiseCore();
		var _promise = new NPromise(core);
		var anyChange = false;
		for (var i = 0; i < list.length; i++) {
			list[i].then(function(p) {
				(!anyChange) && core._resolve(p);
				anyChange = true;
			}, function(p) {
				(!anyChange) && core._reject(p);
				anyChange = true;
			});
		}
		return _promise;
	};

	if (_context.Promise) {
		_context.Promise.NimanPromise = NPromise;
	} else {
		NPromise.NimanPromise = NPromise;
		_context.Promise = NPromise;
	}

	//-----------------------------------------模块-----------------------------------------//

	if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
		//node.js
		module.exports = NPromise;
	} else if (typeof define === 'function' && define.cmd) {
		//CommonJS
		define("NPromise",[],function(require, exports, module) {
			module.exports = NPromise;
		});
	} else {
		//window
		_context.NimanPromise = NPromise;
	}

})(this);

/**
 * 工具包
 */
;
(function(_window) {

	var exports = {};

	//用for(property in object)迭代object属性时，IE不包括 toString属性，判断是否包含toString属性
	var hasToString = function(obj) {
		var sourceIsEvt = typeof _window.Event == "function" && obj instanceof _window.Event;
		return !sourceIsEvt && obj.hasOwnProperty && obj.hasOwnProperty("toString");
	};

	/**
	 * 去掉字符串首尾空格
	 */
	!String.prototype.trim && (String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, '');
	});

	//Array遍历
	!Array.prototype.forEach && (Array.prototype.forEach = function(fun) {
		for (var i = 0; i < this.length; i++) {
			var re = fun(this[i], i, this);
			if (false == re) {
				break;
			}
		}
	});

	/**
	 * 继承
	 * @param {Object} fun
	 */
	Function.prototype.extendFrom = function(fun) {
		var _t = function() {};
		_t.prototype = fun.prototype;
		this.prototype = new _t;
		return this;
	};

	/**
	 * UUID
	 * @param {Object} prefix 前缀
	 */
	exports.createId = function(prefix) {
		prefix = prefix || '';
		//http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/873856#873856
		var s = [],
			hexDigits = "0123456789ABCDEF";
		for (var i = 0; i < 32; i += 1) {
			s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
		}
		return prefix + s.join("");
	};


	var hasCloned = function(track, v) {
		for (var i = 0; i < track.length; i++) {
			if (v === track[i].src) {
				return track[i].clone;
			}
		}
		return null;
	};

	/**
	 * 深克隆
	 * @param {Object} obj 克隆对象
	 */
	var clone = exports.clone = function(obj, _track) {
		var track = _track || [];
		var cloneObj, type;
		if (obj instanceof Array) {
			cloneObj = [];
			type = 'array';
		} else if ('object' == typeof obj && null != obj) {
			cloneObj = {};
			type = 'object';
		} else {
			return obj;
		}
		track.push({
			src: obj,
			clone: cloneObj
		});
		if ('object' == type) {
			for (var k in obj) {
				if (!hasCloned(track, obj[k])) {
					cloneObj[k] = clone(obj[k], track);
				}
			}
		} else if ('array' == type) {
			for (var i = 0; i < obj.length; i++) {
				if (!hasCloned(track, obj[i])) {
					cloneObj[i] = clone(obj[i], track);
				}
			}
		}
		return cloneObj;
	};

	/**
	 * 将后续对象的属性混入第一个对象
	 */
	exports.mix = function() {
		var objs = Array.prototype.slice.call(arguments);
		var a = objs.shift();
		for (var i = 0; i < objs.length; i++) {
			var b = objs[i];
			for (var k in b) {
				a[k] = b[k];
			}
			if (hasToString(b)) {
				a.toString = b.toString;
			}
		}
		return a
	};

	/**
	 * 判断一个值是否是 undefined|null|0|空串
	 * @param {Object} value
	 */
	exports.isBlank = function(value) {
		return ('undefined' == typeof value || '' === value || null == value || 0 === value.length);
	};

	exports.toArr = function(_arr) {
		var re = [];
		for (var i = 0; i < _arr.length; i++) {
			re.push(_arr[i]);
		}
		return re;
	};

	var _E = exports.Emitter = function() {
		this.emitterMap = {};
		this.contextInfo = {};
		this.listenerList = [];
		this.emitQueue = [];
	};

	_E.prototype = {
		_get: function(evtName) {
			return this.emitterMap[evtName] = this.emitterMap[evtName] || [];
		},
		destroy: function() {
			this.emitterMap = null;
			this.listenerList = null;
		},
		/**
		 * 监听事件
		 * @param {Object} evtName 事件名称
		 * @param {Object} scope 上下文，this指代对象
		 * @param {Object} fun 事件响应方法
		 * @param {Object} once 是否是一次性事件
		 */
		on: function(evtName, scope, fun, once) {
			var evts = this._get(evtName);
			evts.push({
				evtName: evtName,
				scope: scope,
				fun: fun,
				once: once
			});
			return this;
		},
		/**
		 * 解除监听事件
		 * @param {Object} evtName 事件名称
		 * @param {Object} scope 上下文，this指代对象
		 * @param {Object} fun 事件响应方法
		 */
		un: function(evtName, scope, fun) {
			var evts = this._get(evtName);
			for (var i = 0; i < evts.length; i++) {
				var evt = evts[i];
				if (evt.scope == scope && evt.fun == fun) {
					evts.splice(i, 1);
				}
			}
			return this;
		},
		_doEmit: function() {
			var args;
			while (args = this.emitQueue.pop()) {
				this.emitting = true;
				var evtName = args.shift(),
					evts = this._get(evtName),
					delArr = [];
				for (var i = 0; i < evts.length; i++) {
					var evt = evts[i];
					var next = evt.fun.apply(evt.scope, args);
					evt.once && delArr.push(evt);
					if (false === next) {
						break;
					}
				}
				for (var i = 0; i < delArr.length; i++) {
					var evt = delArr[i]
					this.un(evt.evtName, evt.scope, evt.fun);
				}
			}
			this.emitting = false;
		},
		/**
		 * 发射事件
		 * @param {Object} evtName 事件名称
		 * [@param..] 发射事件参数
		 */
		emit: function() {
			var args = exports.toArr(arguments);
			this.emitQueue.push(args);
			if (!this.emitting) {
				this._doEmit();
			}
			return this;
		}
	};

	_E.setPromise = function(_Promise) {
		_E.prototype.call = function(eventName) {
			var success = exports.createId('$successEvent_');
			var fail = exports.createId('$failEvent_');
			var me = this;
			var args = Array.prototype.slice.call(arguments);

			var successFun = function() {
				resolve.apply(null, Array.prototype.slice.call(arguments));
				me.un(fail, me, failFun);
			};

			var failFun = function() {
				reject.apply(null, Array.prototype.slice.call(arguments));
				me.un(success, me, successFun);
			};

			return new _Promise(function(resolve, reject) {
				me.on(success, this, successFun, true);
				me.on(fail, this, failFun, true);
				args.push(success);
				args.push(fail);
				me.emit.apply(me, args);

			});
		};
	}

	if (_window.Promise) {
		_E.setPromise(_window.Promise);
	}




	//-----------------------------------------模块-----------------------------------------//

	if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
		//node.js
		module.exports = exports;
	} else if (typeof define === 'function' && define.cmd) {
		//CommonJS
		define("NUtils",[],function(require, _exports, module) {
			module.exports = exports;
		});
	} else {
		//window
		_window.NimanUtils = exports;
	}
})(this);

/** 
 *  ViewModel
 *
 * */
;
(function(_window) {

	/**
	 * 统一将类数组转变为数组
	 */
	function toArr(_arr) {
		var re = [];
		for (var i = 0; i < _arr.length; i++) {
			re.push(_arr[i]);
		}
		return re;
	};

	//绑定字符串转成Map
	function toDataBindMap(data_bind) {
		if (null == data_bind) {
			return '';
		}
		var bindMap = {},
			data_binds = data_bind.split(';'),
			type, i = 0;
		for (; i < data_binds.length; i++) {
			type = data_binds[i].split(':')[0];
			bindMap[type] = data_binds[i].replace(type + ':', '')
		}
		return bindMap;
	};

	//遍历DOM
	function traversalBindDomNode(doms, scope, callback) {
		doms = doms instanceof Array ? doms : [doms];
		var children = [],
			ignore, dom, i, bindMap;
		for (i = 0; i < doms.length; i++) {
			dom = doms[i];
			ignore = false;
			data_bind = dom.getAttribute && dom.getAttribute('data-bind');
			if (data_bind) {
				bindMap = toDataBindMap(data_bind);
				//忽略with节点下子节点的index操作
				ignore = callback.apply(scope, [dom, bindMap]);
			}
			//dom.ignore：忽略子节点，通常该节点的子节点有其它特殊处理。
			if (true !== ignore && true !== dom.ignore) {
				children = children.concat(toArr(dom.childNodes));
			}
		}
		children.length > 0 && traversalBindDomNode(children, scope, callback);
	};

	//清除子节点
	function clearChildNodes(dom) {
		var type = dom.tagName && dom.tagName.toUpperCase(),
			length;
		switch (type) {
			case 'TABLE':
			case 'THEAD':
			case 'TBODY':
				length = dom.rows.length;
				for (var i = 0; i < length; i++) {
					dom.deleteRow(0);
				}
				break;
			case 'TR':
				length = dom.cells.length;
				for (var i = 0; i < length; i++) {
					dom.deleteCell(0);
				}
				break;
			default:
				dom.innerHTML = '';
		}
	};

	//解决一些事件监听问题
	var _type = function(element, type) {
		if (type == 'keypress' && (navigator.appVersion.match(/Konqueror|Safari|KHTML/) || element.attachEvent)) {
			return 'keydown';
		}
		return type;
	};

	//需要克隆的自定义属性。
	var cloneProperty = ['_eachId', '_dataWith', '_dataTemplate',
		'_isWith', '_dataSelectedPath', '_dataEventInfo'
	];

	//包含自定义属性的克隆。旧IE的table克隆可能会有问题
	function cloneNode(dom) {
		var clone;
		if ('FORM ' == (dom.tagName && dom.tagName.toUpperCase())) {
			clone = _window.document.createElement('form'); //opera的form克隆有BUG
		} else {
			clone = dom.cloneNode(false);
		}
		var children = toArr(dom.childNodes);
		for (var i = 0; i < children.length; i++) {
			//旧IE?
			clone.appendChild(cloneNode(children[i]));
		}
		for (var i = 0; i < cloneProperty.length; i++) {
			if (dom[cloneProperty[i]]) {
				clone[cloneProperty[i]] = dom[cloneProperty[i]];
			}
		}
		return clone;
	};

	//根据数据路径获取数据
	function getData(data, path, dom, notCall) {
		//如果是$root,忽略前面的路径
		var index = path.indexOf('$root');
		if (index > -1) {
			path = path.substr(index + 5);
		}
		//遇到$parent，吃掉父节点
		while (path.indexOf('$parent') > -1) {
			path = path.replace(/\.\w+(\[\d+\])+\.\$parent/g, '');
		}
		//数组和对象统一处理
		path = path.replace(/\[/g, '.').replace(/\]/g, '');
		//去掉开头多余的.
		path = path.replace(/^\.+/g, '');
		//如果是根节点，直接返回
		if ("" === path) {
			return {
				parent: null,
				name: '',
				data: data
			};
		}

		var _paths = path.split(".");
		var _data = data,
			parent = null,
			name;

		for (var i = 0; i < _paths.length; i++) {
			name = _paths[i];
			parent = _data;
			if (null === parent || undefined === parent || undefined === parent[name]) {
				return {
					parent: parent,
					data: undefined,
					name: name
				};
			}
			_data = parent[name];
			//作为事件绑定的时候不调用函数
			if ('function' == typeof _data && !notCall) {
				_data = _data(dom, 'get');
			}
		}

		return {
			parent: parent,
			name: name,
			data: _data
		};
	};

	//清除list模板节点
	function clearEach(dom) {
		traversalBindDomNode(dom, null, function(_dom, bindMap) {
			for (var k in bindMap) {
				if ('each' == k) {
					clearChildNodes(_dom);
					return;
				}
			}
		});
	};

	//对旧IE的兼容
	var isOldIE = /msie [678]/g.test(_window.navigator.userAgent.toLowerCase());

	//停止事件冒泡
	function stopEvent(event) {
		try {
			event.cancelBubble = true;
			event.stopPropagation && event.stopPropagation();
		} catch (e) {}
	};

	var idIndex = 0;

	var arrFuns = ['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat'];

	/**
	 * 判断对象是否是数组或类数组
	 * @param {Object} value
	 */
	function isArray(value) {
		if (undefined == value || null == value) {
			return false;
		}
		if (value instanceof Array) {
			return true;
		}
		if (undefined !== value.length) {
			for (var i = 0; i < arrFuns.length; i++) {
				if ('function' != typeof arrFuns[i]) {
					return false;
				}
			}
			return true;
		}
		return false;
	};

	/**
	 * 可监听对象，当属性发生变化时，通知视图，在IE9+版本有效
	 */
	function ObserveAbleObject() {
		this.hasObservedProp = {};
	};

	ObserveAbleObject.prototype = {
		/**
		 * 数组模式
		 */
		shiftToArr: function() {
			var self = this;
			this.arrayMode = true;
			for (var i = 0; i < arrFuns.length; i++) {
				this[arrFuns[i]] = (function(funName) {
					return function() {
						return self.onArrCall && self.onArrCall(funName, toArr(arguments));
					}
				})(arrFuns[i]);
			}
			this.observe('length');
		},
		/**
		 * 对象模式
		 */
		unshiftFromArr: function() {
			if (!this.arrayMode) {
				return;
			}
			this.arrayMode = false;
			for (var i = 0; i < arrFuns.length; i++) {
				delete this[arrFuns[i]];
			}
		},
		/**
		 * 添加可监听属性
		 * @param {Object} name
		 */
		observe: function(name) {
			if (this.hasObservedProp[name]) {
				return;
			}
			this.hasObservedProp[name] = 1;
			var self = this;
			Object.defineProperty(this, name, {
				set: function(value) {
					self.onSet && self.onSet(name, value);
				},
				get: function() {
					if (self.onGet) {
						return self.onGet(name)
					}
					return null;
				}
			});
		}
	};

	/**
	 * 数据遍历
	 * @param {Object} data
	 * @param {Object} callback
	 * @param {Object} _path
	 */
	function traversalData(data, callback, _path) {
		var path = _path || "";
		for (var k in data) {
			callback(data[k], path, k);
			if ('object' == typeof data[k]) {
				traversalData(data[k], callback, path + "." + k);
			}
		}
		if (isArray(data)) {
			callback(data.length, path, 'length');
		}
	};

	//ViewModel
	function NViewModel(element) {
		if ('string' == typeof element) {
			element = document.getElementById(element);
		}
		this.id = idIndex++;
		this.element = element;
		this.elementTemplate = cloneNode(element);
		this.templateId = 0;
		this.domId = 0;
		this.templates = {};
		this.domList = {};
		this.domTable = {};
		this._buildChange();
		this._init();
	};

	NViewModel.prototype = {
		reflushAll: false,
		changeEventProxy: true,
		buildModel: function(data) {
			if ('function' != typeof Object.defineProperty || isOldIE) {
				this.bind(data);
				return data;
			}
			var self = this;
			var model = new ObserveAbleObject();
			//数据路径
			var observeAbleObjectMap = self.observeAbleObjectMap = {};

			function buildModel(_data, _path, _name) {
				var path = _path + '.' + _name;
				var obsObj = observeAbleObjectMap[_path];

				var oldValue = getData(data, _path).data;

				if (!obsObj) {
					obsObj = observeAbleObjectMap[_path] = new ObserveAbleObject();

					obsObj.onGet = function(name) {

						var value = getData(data, _path + '.' + name, null, true).data;

						if (new RegExp('boolean|number|string|function').test(typeof value) || null == value || undefined == value) {
							return value;
						}

						var obsObj = observeAbleObjectMap[_path + '.' + name];
						if (obsObj) {
							return obsObj;
						}

						if ('length' == name && this.arrayMode) {
							var arr = getData(data, _path).data;
							if (arr) {
								return arr.length;
							}
							return;
						}

						obsObj = observeAbleObjectMap[_path + '.' + name] = new ObserveAbleObject();
						if (isArray(value)) {
							obsObj.shiftToArr();
							obsObj.onArrCall = function(funName, args) {
								var arr = getData(data, _path + '.' + name).data;
								if (arr && arr[funName]) {
									var re = arr[funName].apply(arr, args);
								}
								self.reflush();
								return re;
							};
						}
						traversalData(value, buildModel, _path + '.' + name);
						return obsObj;
					};

					obsObj.onSet = function(name, value) {
						if ('object' == typeof value || isArray(value)) {
							//							for (var k in observeAbleObjectMap) {
							//								var __path = _path.replace(/\./g, '\\.');
							//								if (new RegExp("^" + __path, 'g').test(k)) {
							//									delete observeAbleObjectMap[k];
							//								}
							//							}
							traversalData(value, buildModel, _path + '.' + name);
						}
						self._setter(_path + '.' + name, null, value);
						self.reflush();
					};

				}

				if (isArray(oldValue)) {
					obsObj.shiftToArr();
					obsObj.onArrCall = function(name, args) {
						var arr = getData(data, _path).data;
						if (arr && arr[name]) {
							var re = arr[name].apply(arr, args);
						}
						if (name != 'concat') {
							self.reflush();
						}
						return re;
					};
				} else {
					obsObj.unshiftFromArr();
					delete obsObj.onArrCall;
				}

				obsObj.observe(_name);
			}
			traversalData(data, buildModel);

			this.bind(data);

			return this.model = observeAbleObjectMap[""];
		},
		_deleteNode: function(_dom) {
			if (undefined !== _dom.domId) {
				delete this.domTable[this.getDataInfo(_dom, "").basePath][_dom.domId];
			}
			this._stopObserve(_dom)
			_dom.parentNode.removeChild(_dom);
		},
		//删除节点以及节点下的数组
		deleteArrNode: function(dom) {
			var removeList = [],
				removeNode;
			//遍历每个子节点的子节点，如果仍包含数组，提取出来
			traversalBindDomNode(dom, this, function(_dom2, bindMap) {
				if (bindMap.each) {
					removeList.push(_dom2);
				}
			});
			//每个包含数组的节点
			while (removeNode = removeList.pop()) {
				var index = removeNode._dataIndex || 0;
				//得到数组子节点数组				
				var list = this._getDomlist(removeNode),
					children, _dom;
				while (children = list.shift()) {
					while (_dom = children.shift()) {
						this._deleteNode(_dom);
					}
				}
			}
			this._deleteNode(dom);
		},
		_content: function(dom, k, param) {
			var _dataPath = this._getDataPath(dom, param);
			var isHtml = new RegExp('^html', "g").test(k),
				isTemplate = new RegExp('Template$', "g").test(k),
				isValue = new RegExp('^value$', "g").test(k),
				inner = "",
				info = getData(this.data, _dataPath, dom),
				_data = info.data,
				obj = _data;
			if (isTemplate && 'object' == typeof obj) {
				obj = dom._dataTemplate.replace(/\$\{S*(\w|\.)+\}/g, function(m1) {
					var k = m1.replace(/^\$\{S*|\}$/g, ''),
						v = getData(obj, k, dom).data;
					return v == undefined ? '' : v;
				});
			}

			obj = undefined == obj ? "" : obj;

			var _dataValueInfo = dom._dataValueInfo || (dom._dataValueInfo = {});

			if (isValue) {

				dom._dataValue = obj;
				if (_dataValueInfo.value != obj) {
					dom.value = obj;
					_dataValueInfo.value = obj;
				}
			} else {
				if (_dataValueInfo.inner != obj) {
					if (isHtml) {
						dom.innerHTML = obj;
					} else {
						dom.innerText = obj;
						dom.textContent = obj;
					}
					_dataValueInfo.inner = obj;
				}
			}

			var pnd = dom.parentNode;
			var isBlank = this._isBlank;
			if ((dom.tagName.toUpperCase() == 'SELECT' || dom.tagName.toUpperCase() == 'DATALIST') && dom.options.length == 0) {
				this._setter(_dataPath, dom, dom.value);
			}
			if (isValue && dom.tagName.toUpperCase() == 'OPTION' && pnd && (pnd.tagName.toUpperCase() == 'SELECT' || pnd.tagName.toUpperCase() == 'DATALIST')) {
				if (dom.value === pnd._dataValue) {
					pnd.value = dom.value;
				} else if (!pnd._dataValue && !pnd.value && pnd.options[0] == dom) {
					//IE下动态生成OPTION，SELECT不赋值。
					pnd.value = dom.value;
				}
				var dataInfo = this.getDataInfo(pnd);
				var _path = dataInfo.path + '.' + toDataBindMap(pnd.getAttribute('data-bind')).value;
				this._setter(_path, pnd, pnd.value);
			}
		},
		_isBlank: function(value) {
			return ('undefined' === typeof value || '' === value || null == value || 0 === value.length);
		},
		_attrStyleProp: function(dom, k, param) {
			var attrs = param.replace(/\{|\}/g, '').split(',');
			var isAttr = new RegExp('^attr$', "g").test(k);
			var isStyle = new RegExp('^style$', "g").test(k);
			var isProperty = new RegExp('^prop$', "g").test(k);

			var _dataValueInfo = dom._dataValueInfo || (dom._dataValueInfo = {});

			_dataValueInfo.attr = _dataValueInfo.attr || (_dataValueInfo.attr = {});
			_dataValueInfo.prop = _dataValueInfo.prop || (_dataValueInfo.prop = {});
			_dataValueInfo.style = _dataValueInfo.style || (_dataValueInfo.style = {});

			for (var i = 0; i < attrs.length; i++) {
				var kv = attrs[i].split(':');
				var _k = kv[0];
				var _kv1 = kv[1];
				var _dataPath = this._getDataPath(dom, _kv1);
				var _v = getData(this.data, _dataPath, dom).data;
				if ('undefined' == typeof _v) {
					continue;
				}
				if (isAttr) {
					if (_dataValueInfo.attr[_k] != _v) {
						dom.setAttribute(_k, _v);
						_dataValueInfo.attr[_k] = _v;
					}
				} else if (isStyle) {
					if (_dataValueInfo.style[_k] != _v) {
						dom.style[_k] = _v;
						_dataValueInfo.style[_k] = _v;
					}
				} else if (isProperty) {
					if (_dataValueInfo.prop[_k] != _v) {
						dom[_k] = _v;
						_dataValueInfo.prop[_k] = _v;
					}
				}
			}
		},
		_afterRender: function(dom, k, param) {
			var _dataPath = this._getDataPath(dom, param);
			var data = getData(this.data, _dataPath, dom, true);
			data && ('function' == typeof data.data) && data.data(dom, 'afterRender');
		},
		_event: function(dom, k, param) {
			var attrs = param.replace(/\{|\}/g, '').split(',');
			for (var i = 0; i < attrs.length; i++) {
				var kv = attrs[i].split(':');
				var _k = kv[0];
				var _kv1 = kv[1];
				var notCall = true;
				if (new RegExp('\\(\\)$').test(_kv1)) {
					notCall = false;
				}
				var _dataPath = this._getDataPath(dom, _kv1);
				var _dataInfo = getData(this.data, _dataPath, dom, notCall);
				var _v = _dataInfo.data;
				if (!_v) {
					return;
				}

				var onEvent = (function(__dom, __v) {
					return function(evt) {
						var src = evt.srcElement || evt.target;
						__v(__dom, 'event', evt);
					};
				})(dom, _v);

				var _dataEventInfo = dom._dataEventInfo = dom._dataEventInfo || [],
					has = false;

				for (var i = 0; i < _dataEventInfo.length; i++) {
					if (_k == _dataEventInfo[i].name) {
						has = true;
						break;
					}
				}

				if (!has) {
					dom._dataEventInfo.push({
						name: _k,
						callback: onEvent
					});
					this._observeElement(dom, _k, onEvent);
				}
			}
		},
		_observeElement: function(_element, type, callback, useCapture) {
			useCapture = useCapture || false;
			type = _type(_element, type);
			if (_element.addEventListener) {
				_element.addEventListener(type, callback, useCapture)
			} else {
				_element.attachEvent('on' + type, callback);
			}
		},
		_stopObserveElement: function(_element, type, callback, useCapture) {
			useCapture = useCapture || false;
			type = _type(_element, type);
			_element.removeEventListener && _element.removeEventListener(type, callback, useCapture);
			_element.detachEvent && _element.detachEvent('on' + type, callback);
		},
		_stopObserve: function(stopDom) {
			var info;
			stopDom = stopDom || this.element;
			traversalBindDomNode(stopDom, this, function(_dom, bindMap) {
				if (_dom._dataEventInfo) {
					var _evtInfo;
					while (_evtInfo = _dom._dataEventInfo.pop()) {
						this._stopObserveElement(_dom, _evtInfo.name, _evtInfo.callback);
					}
				}
			});
		},
		//设置数据
		_setter: function(path, dom, value) {
			var info = getData(this.data, path, dom, true);
			var parent = info.parent;
			var data = info.data;
			if (null != parent) {
				if ('function' == typeof data) {
					data(dom, 'set', value);
				} else {
					parent[info.name] = value;
				}
			}
		},
		_buildChange: function() {
			var self = this;
			this._change = function(evt) {
				if (self.reflushing) {
					return;
				}
				evt = evt || _window.event;
				var src = evt.srcElement || evt.target;
				var data_bind = src.getAttribute('data-bind');
				if (!data_bind) {
					return;
				}
				var bindMap = toDataBindMap(data_bind);
				var _dataPath = self._getDataPath(src, bindMap.value);
				var tagName = src.tagName.toUpperCase();
				var inputType = src.getAttribute('type');
				var isTextInput = !new RegExp('radio|checkbox', 'g').test(inputType) && new RegExp('INPUT|TEXTAREA', 'g').test(tagName);
				if (isTextInput || 'SELECT' == tagName) {
					self._setter(_dataPath, src, src.value);
				}
				self.reflush();
				stopEvent(evt);
			}
		},
		_init: function() {
			this._observeElement(this.element, 'change', this._change);
			var templates = this.templates;
			traversalBindDomNode(this.element, this, function(_dom, bindMap) {
				for (var k in bindMap) {
					if ('with' == k || 'each' == k) {
						_dom._dataWith = bindMap[k];
					}
					if ('each' == k) {
						_dom._eachId = this.templateId++;
						templates[_dom._eachId] = {
							dom: _dom
						};
					} else if ('with' == k) {
						_dom._isWith = true;
					}
					if ('innerHTML' === k) {
						_dom._dataTemplate = bindMap[k];
					}
					if ('templateId' === k && undefined == bindMap.innerHTML) {
						_dom._dataTemplate = document.getElementById(bindMap[k]).innerHTML;
					}
					if (new RegExp('Template$', "g").test(k) && undefined == _dom._dataTemplate) {
						_dom._dataTemplate = _dom.innerHTML;
					}
				}
			});
			for (var k in templates) {
				var cloneDom = cloneNode(templates[k].dom)
					//清除子节点下的each子节点
				clearEach(toArr(cloneDom.childNodes));
				templates[k].dom = cloneDom;
				cloneDom = null;
			}
			clearEach(this.element);
		},
		bind: function(data) {
			this.data = data;
			this.reflush();
		},
		/**
		 * 获取数据相关信息
		 */
		getDataInfo: function(dom, param, isEach) {
			var index;
			var _dataPath = "",
				theIndex,
				start = '',
				origin = dom,
				firstWith = false;
			if (undefined != param && '' !== param) {
				start = _dataPath = param;
			}
			var regstr = start.replace(".", "\\.");
			//
			if (!isEach && undefined != dom._dataIndex) {
				theIndex = dom._dataIndex;
				start = _dataPath = dom._dataIndex + '.' + _dataPath;
			}
			/**
			 * 当前节点包含了each信息，但调用此方法
			 * 不是为了获取当前Dom节点each的数组信息，而是为绑定数据时，
			 * 从parent节点开始计算路径
			 */
			if (!isEach && dom._dataWith) {
				dom = dom.parentNode;
			}
			do {
				if (dom._dataWith) {
					/**
					 * 以初始节点的父节点为起点判断_dataWith
					 */
					if (dom !== origin) {
						firstWith = true;
					}

					_dataPath = dom._dataWith + '.' + _dataPath;
					if (undefined != dom._dataIndex) {
						theIndex = dom._dataIndex;
						_dataPath = dom._dataIndex + '.' + _dataPath;
					}
				}
				/**
				 * 当前节点在数组中，但是dom本身并不包含_dataIndex信息，取最近父节点的index
				 */
				else if (undefined == theIndex && undefined != dom._dataIndex) {
					theIndex = dom._dataIndex;
					_dataPath = dom._dataIndex + '.' + _dataPath;
				}
				/**
				 * 如果出现$root，则无需继续判断
				 */
				if ((index = _dataPath.indexOf('$root')) > -1) {
					_dataPath = _dataPath.substr(index + 5);
					/**
					 * 在第一个数组出现前就遇见$root，则_dataIndex是无效属性
					 */
					if (!firstWith && undefined !== theIndex) {
						_dataPath = _dataPath.replace(new RegExp(regstr + "[\\.]?$", "g"), param);
					}
					break;
				}
			}
			while (dom && dom != this.element && (dom = dom.parentNode));
			_dataPath = _dataPath.replace(/\.$/g, '');

			return {
				basePath: _dataPath.replace(new RegExp("[\\.]?" + regstr + "[\\.]?$", "g"), ""),
				path: _dataPath,
				index: theIndex
			};
		},
		_getDataPath: function(dom, param, isEach) {
			var data = this.getDataInfo(dom, param, isEach);
			return data.path;
		},
		_getDomlist: function(_dom, _dataPath) {
			if (undefined == _dataPath) {
				_dataPath = this.getDataInfo(_dom, "", true).path;
			}
			var id = _dom.domId;
			return this.domList[id] = this.domList[id] || [];
		},
		_fun: function(dom, param) {
			var _dataPath = this._getDataPath(dom, param);
			var dataInfo = getData(this.data, _dataPath, dom);
			var fun = dataInfo.data;
			if (fun) {
				return fun.apply(dataInfo.parent, [dom, _dataPath]);
			}
			return true;
		},
		reflushWhenOld: function(reflushDom) {
			if (isOldIE || !Object.defineProperty) {
				this.reflush(reflushDom);
			}
		},
		reflush: function(reflushDom) {
			this.reflushing = true;
			var data = this.data;
			if (this.reflushAll) {
				reflushDom = this.element;
			} else {
				reflushDom = reflushDom || this.element;
			}
			traversalBindDomNode(reflushDom, this, function(_dom, bindMap) {
				var tagName = _dom.tagName.toUpperCase();
				var basePath = this.getDataInfo(_dom, "").basePath;
				if (undefined == _dom.domId) {
					_dom.domId = this.domId++;
				}
				if (!this.domTable[basePath]) {
					this.domTable[basePath] = {}
				}
				if (!this.domTable[basePath][_dom.domId]) {
					this.domTable[basePath][_dom.domId] = _dom;
				}
				if (bindMap['fun'] && (false === this._fun(_dom, bindMap['fun']))) {
					return;
				}
				for (var k in bindMap) {
					if ('each' == k) {
						var pathInfo = this.getDataInfo(_dom, "", true);
						var _dataPath = pathInfo.path;
						var list = getData(data, _dataPath, _dom).data;
						if (!list) {
							list = [];
						}
						//数组模板
						var templateInfo = this.templates[_dom._eachId];
						var domList = this._getDomlist(_dom, _dataPath);
						var difference = list.length - domList.length;
						var nodes, evtInfo;
						if (difference > 0) {
							for (var i = 0; i < difference; i++) {
								var clone = cloneNode(templateInfo.dom);
								var children = toArr(clone.childNodes);
								for (var j = 0; j < children.length; j++) {
									_dom.appendChild(children[j]);
								}
								clone = null;
								domList.push(children);
							}
						}
						if (difference < 0) {
							//需要删除的节点
							for (var i = 0; i < -difference; i++) {
								//子节点数组
								var _deleteDomChlidren = domList.pop();
								for (var j = 0; j < _deleteDomChlidren.length; j++) {
									this.deleteArrNode(_deleteDomChlidren[j]);
								}
							}
						}
						for (var i = 0; i < list.length; i++) {
							var childNodes = domList[i];
							traversalBindDomNode(childNodes, this, function(_dom2, bindMap) {
								_dom2._dataIndex = i;
								return _dom2._isWith;
							});
						}
					} else if (new RegExp('^text$|^html$|^textTemplate$|^htmlTemplate$|^value$', "g").test(k)) {
						this._content(_dom, k, bindMap[k]);
					} else if (new RegExp('^attr$|^style$|^prop$', "g").test(k)) {
						this._attrStyleProp(_dom, k, bindMap[k]);
					} else if ('event' === k) {
						this._event(_dom, k, bindMap[k]);
					}
				}
				if (new RegExp('INPUT|SELECT|TEXTAREA', 'g').test(tagName) && (isOldIE || !this.changeEventProxy)) {
					//旧IE的change不冒泡
					var name = 'change';
					_dom._dataEventInfo = _dom._dataEventInfo || [];
					_dom._dataEventInfo.push({
						name: name,
						callback: this._change
					});
					this._stopObserveElement(_dom, name, this._change);
					this._observeElement(_dom, name, this._change);
				}
				if (bindMap.afterRender) {
					this._afterRender(_dom, k, bindMap.afterRender);
				}
			});
			this.reflushing = false;
		},
		/**
		 * 获取数据
		 * @param {Object} param
		 */
		getValue: function(dom) {
			var info = this.getDataInfo(dom);
			return getData(this.data, info.path, dom).data;
		},
		/**
		 * 销毁对象
		 */
		destroy: function() {
			this._stopObserve();
			this.element = null;
			this.templates = null;
			this.domList = null;
			this.elementTemplate = null;
			this.hasDestroyed = true;
		}
	};

	//-----------------------------------------模块-----------------------------------------//

	if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
		//node.js
		module.exports = NViewModel;
	} else if (typeof define === 'function' && define.cmd) {
		//CommonJS
		define("NViewModel",[],function(require, exports, module) {
			module.exports = NViewModel;
		});
	} else {
		//window
		_window.NimanViewModel = NViewModel;
	}

})(this);

/**
 * DOM拖拽
 */
;
(function(_window) {
	var factory = function(NEvents) {

		var oldIE = false, //旧版IE
			nav = _window['navigator'],
			rnd = Math.round,
			disableSelect = '.ds_' + rnd(Math.random() * 1e6), //不可选样式名
			doc = _window.document,
			of = nav && /opera|firefox/g.test(nav.userAgent.toLowerCase()),
			className = function(dom, name, add) { //添加移除class
				var clsNames = dom.className = dom.className || ' ';
				clsNames = clsNames.split(' ');
				for (var i = 0; i < clsNames.length; i++) {
					clsNames[i] == name && (clsNames[i] = '');
				}
				dom.className = clsNames.join(' ');
				if (add) {
					dom.className = (dom.className + ' ' + name).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
				}
			},
			nextFrame = (function() { //动画
				return _window.requestAnimationFrame ||
					_window.webkitRequestAnimationFrame ||
					_window.mozRequestAnimationFrame ||
					_window.oRequestAnimationFrame ||
					_window.msRequestAnimationFrame ||
					function(callback) {
						return setTimeout(callback, 1);
					};
			})(),
			animationMap = {},
			count = 0,
			next = function() {
				var _o;
				for (var i in animationMap) {
					_o = animationMap[i]();
				}
				animationPlaying && nextFrame(next);
			},
			animationPlaying = false,
			dummyStyle = doc.createElement('div').style;

		if (nav && /msie [678]/g.test(nav.userAgent.toLowerCase())) {
			oldIE = true;
		}

		if (of) {
			var style = doc.createElement('style');
			style.innerHTML = disableSelect + ' { -moz-user-select: none; }';
			var head = doc.getElementsByTagName('head')[0] || doc.documentElement;
			head.appendChild(style);
		}

		/**
		 * 动画
		 */
		var Animation = function(callback) {
			if (callback) {
				this.setCallback(callback);
			}
		};

		Animation.prototype = {
			start: function() { //开始播放动画
				if (this.playing) {
					return;
				}
				if (0 == count) {
					nextFrame(next);
					animationPlaying = true;
				}
				if (this.callback && !this.playing) {
					count++;
					animationMap[count] = this.callback;
					this.index = count;
					this.playing = true;
				}
			},
			playing: false,
			stop: function() { //停止播放动画
				if (this.playing) {
					count--;
					delete animationMap[this.index];
					this.playing = false;
				}
				if (0 == count) {
					animationPlaying = false;
				}
				if (this.onStop) {
					this.onStop();
				}
			},
			setCallback: function(callback) { //播放回调
				this.callback = callback;
			},
			removeCallback: function(callback) { //播放回调
				this.callback = null;
			}
		};

		var _vendor = (function() {
				var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'];
				for (var i = 0; i < vendors.length; i++) {
					var t = vendors[i] + 'ransform';
					if (t in dummyStyle) {
						return vendors[i].substr(0, vendors[i].length - 1);
					}
				}
				return false;
			})(),
			cssVendor = _vendor ? '-' + _vendor.toLowerCase() + '-' : '',
			prefixStyle = function(style) {
				if (_vendor === '') return style;
				style = style.charAt(0).toUpperCase() + style.substr(1);
				return _vendor + style;
			},
			transform = prefixStyle('transform'),
			transitionProperty = prefixStyle('transitionProperty'),
			transitionDuration = prefixStyle('transitionDuration'),
			transformOrigin = prefixStyle('transformOrigin'),
			transitionTimingFunction = prefixStyle('transitionTimingFunction'),
			transitionDelay = prefixStyle('transitionDelay'),
			transitionendEventName = (function() {
				if (_vendor === false) return false;
				var transitionEnd = {
					'': 'transitionend',
					'webkit': 'webkitTransitionEnd',
					'Moz': 'transitionend',
					'O': 'otransitionend',
					'ms': 'MSTransitionEnd'
				};
				return transitionEnd[_vendor];
			})();

		NEvents.transform = transform;
		NEvents.transformOrigin = transformOrigin;
		NEvents.oldIE = oldIE;
		NEvents.Animation = Animation;

		var fn = NEvents.Events.prototype;

		fn.buildDragger = function() {
			if (!this.dragger) {
				this.dragger = new Dragger(this);
			}
			return this;
		};

		fn.setContainer = function(container) {
			if (this.dragger) {
				this.dragger.setContainer(container);
			}
		};

		var oldOn = fn.on;
		fn.on = function(evtName) {
			if (new RegExp('^\\$dragstart$|^\\$dragging$|^\\$dragend$|^\\$inertiaend$', 'g').test(evtName)) {
				this.buildDragger();
			}
			return oldOn.apply(this, arguments);
		};

		function Dragger(core) {
			this.core = core;
			this.info = {
				hasDown: false,
				lastXY: {
					x: 0,
					y: 0
				}
			};
			var self = this;
			self.docMove = function(evt) {
				NEvents.positionInfo(evt);
				self._mousemove(evt);
			};
			self.docUp = function(evt) {
				NEvents.positionInfo(evt);
				self._mouseup(evt);
			};
			this.points = [];
			this.init(true);

			var self = this;

			function _callback() {
				var now = new Date().getTime();
				self.info.lastTime = self.info.lastTime || now;
				var time = now - self.info.lastTime;
				self.info.lastTime = now;
				var speed = self.info.speed - self.deceleration * time;

				if (speed <= 0) {
					self.animation.stop();
					self._afterInertiaStop();
					self.core.emit('$inertiaend', {});
					return;
				}
				var dd = (self.info.speed + speed) / 2 * time;
				var distance = self.info.distance = rnd(self.info.distance + dd);
				var dx = rnd(self.info.a / self.info.c * distance);
				var dy = rnd(self.info.b / self.info.c * distance);
				var xy = self.info.currentXY = {
					x: self.info.lastXY.x + dx,
					y: self.info.lastXY.y + dy
				};
				self.info.speed = speed;
				self._setPosition({
					inertia: true
				}, xy);
			};
			this.animation = new Animation(_callback);
		};

		NEvents.handler.Dragger = Dragger;

		Dragger.prototype = {
			//开启惯性效果
			isInertia: true,
			//用CSS3的transform
			useTransform: true,
			//统计时间，用于计算速度
			delay: 200,
			//统计点，用于计算速度
			nbPoints: 100,
			//阻力
			deceleration: 0.002,
			//可拖拽
			dragAble: true,
			//事件容器
			container: doc,
			//名字
			name: 'Dragger',
			//初始化
			init: function(listen) {
				var _on = listen ? 'on' : 'un',
					_event = NEvents.listen(this.container);

				_event[_on]('mousedown', this, this._mousedown);
				_event[_on]('mousemove', this, this._mousemove);
				_event[_on]('mouseup', this, this._mouseup);

				_event[_on]('touchstart', this, this._touchstart);
				_event[_on]('touchmove', this, this._touchmove);
				_event[_on]('touchend', this, this._touchend);

				_event[_on]('$movestart', this, this._dragstart);

			},
			_domSelectAble: function(emt, able) {
				if (of) {
					//able为true时清除样式，为false时添加样式
					className(emt, disableSelect, !able);
				} else {
					emt.onselectstart = function() {
						return able;
					};
				}
			},
			//拖拽时不可选中
			_selectAble: function(able) {
				this._domSelectAble(this.core.bindedElement, able);
				this._domSelectAble(this.container, able);
				this._domSelectAble(doc, able);
			},
			_mousedown: function(evt) {
				this._down(evt, {
					x: evt.clientX,
					y: evt.clientY
				});
			},
			_touchstart: function(evt) {
				var tts = evt.targetTouches;
				this._down(evt, {
					x: tts[0].clientX,
					y: tts[0].clientY
				});
			},
			_isParent: function(dom) {
				var pnt = dom,
					bdmt = this.core.bindedElement;
				if (pnt == bdmt) {
					return true;
				}
				while (pnt = pnt.parentNode) {
					if (pnt == bdmt) {
						return true;
					}
				}
				return false;
			},
			_down: function(evt, xy) {
				if (!this._isParent(NEvents.getSrcElement(evt))) {
					return;
				}
				if (this.info.inertiaMoving) {
					this._inertiaStop();
				}
				this._afterInertiaStop();
				if (this.container != doc) {
					var docEvent = NEvents.listen(doc);
					docEvent.on('mousemove', this, this.docMove);
					docEvent.on('mouseup', this, this.docUp);
				}
				this.info.downXY = xy;
				this.info.hasDown = true;
				this._selectAble(false);
			},
			_mousemove: function(evt) {
				this._move(evt, {
					x: evt.clientX,
					y: evt.clientY
				})
			},
			_touchmove: function(evt) {
				var tts = evt.targetTouches;
				this._move(evt, {
					x: tts[0].clientX,
					y: tts[0].clientY
				});
			},
			beforeMove: function(evt, xy) {
				return true;
			},
			_isMutiTouch: function(evt) {
				var tts = evt.touches;
				if (!tts || tts.length < 2) {
					return false;
				}
				for (var i = 0; i < tts.length; i++) {
					if (!this._isParent(tts[i].target)) {
						return false;
					}
				}
				return true;
			},
			_move: function(evt, xy) {
				if (!this.beforeMove(evt, xy) || (evt && this._isMutiTouch(evt))) {
					return;
				}
				if (this.info.dragstart) {
					if (this.isInertia) {
						this.points.unshift({
							x: xy.x,
							y: xy.y,
							tick: new Date().getTime()
						});
						if (this.points.length > this.nbPoints) {
							this.points.pop();
						}
					}
					this._setPosition(evt, xy);
				}
			},
			_mouseup: function(evt) {
				this._up(evt);
			},
			_touchend: function(evt) {
				this._up(evt);
			},
			_up: function(evt) {
				if (this.info.hasDown) {
					this.info.hasDown = false;
					this._dragend(evt);
					if (this.container != doc) {
						var docEvent = NEvents.listen(doc);
						docEvent.un('mousemove', this, this.docMove);
						docEvent.un('mouseup', this, this.docUp);
					}
				}
				this._selectAble(true);
			},
			_initStartXY: function() {
				var _style = this.core.bindedElement.style;
				_style[transitionTimingFunction] = "";
				_style[transitionDuration] = "";
				if (this.useTransform && !oldIE) {
					var teansXY = _style[transform].replace(/translate\(|\)/g, "").split(",");
					if (2 == teansXY.length) {
						this.info.teansX = parseInt(teansXY[0]);
						this.info.teansY = parseInt(teansXY[1]);
					} else {
						this.info.teansX = 0;
						this.info.teansY = 0;
					}
					this.info.lastPosition = {
						x: this.info.teansX,
						y: this.info.teansY
					}
				} else {
					this.info.left = parseInt((_style.left + "").replace("px", "")) || 0;
					this.info.top = parseInt((_style.top + "").replace("px", "")) || 0;
					this.info.lastXY = this.info.lastPosition = {
						x: this.info.left,
						y: this.info.top
					}
				}
			},
			_dragstart: function(evt) {
				if (!this.info.hasDown) {
					return;
				}
				this._initStartXY();
				this.info.dragstart = true;
				this.core.emit('$dragstart', evt);
			},
			_dragend: function(evt) {
				this.info.lastXY = this.info.lastPosition;
				if (this.info.dragstart) {
					this.info.dragstart = false;
					if (this.isInertia) {
						this.info.lastTime = 0;
						this.info.inertiaMoving = false;
						this.info.speed = 0;
						this.info.distance = 0;
						this._inertiaStart();
						this.points = [];
					}
					this.core.emit('$dragend', evt);
				}
			},
			_setXY: function(dx, dy) {
				if (isNaN(dx) || isNaN(dy)) {
					return;
				}
				var _style = this.core.bindedElement.style;
				if (this.useTransform && !oldIE) {
					dx = rnd(dx + this.info.teansX);
					dy = rnd(dy + this.info.teansY);
					_style[transform] = 'translate(' + dx + 'px,' + dy + 'px)  translateZ(0px)';
				} else {
					dx = rnd(dx + this.info.left);
					dy = rnd(dy + this.info.top);
					_style.left = dx + 'px';
					_style.top = dy + 'px';
				}
			},
			_setPosition: function(evt, xy) {
				if (!this.dragAble || !xy || !this.info.downXY) {
					return;
				}
				this._setXY(xy.x - this.info.downXY.x, xy.y - this.info.downXY.y);
				this.info.lastPosition = xy;
				evt.currentXY = xy;
				this.core.emit('$dragging', evt);
			},
			setContainer: function(container) {
				if ('string' == typeof container) {
					container = _window.document.getElementById(container);
				}
				this.init(false);
				this.container = container;
				this.init(true);
			},
			_inertiaStart: function() {
				var last, now = new Date().getTime();
				for (var i = 0, l = this.points.length, point; i < l; i++) {
					point = this.points[i];
					if (now - point.tick > this.delay) {
						break;
					}
					last = point;
				}
				if (!last) {
					this.core.emit('$inertiaend', {});
					return;
				}
				var start = this.points[0];
				var time = start.tick - last.tick;
				this.info.a = start.x - last.x;
				this.info.b = start.y - last.y;
				var c = this.info.c = Math.sqrt(Math.pow(this.info.a, 2) + Math.pow(this.info.b, 2));

				if (0 == c || isNaN(c)) {
					this.core.emit('$inertiaend', {});
					return;
				}
				this.info.speed = this.info.v = this.info.c / time;
				this.info.distance = 0;
				this.info.inertiaMoving = true;
				this.animation.start();
			},
			_afterInertiaStop: function() {
				this.info.lastTime = 0;
				this.info.inertiaMoving = false;
				this.info.speed = 0;
				this.info.distance = 0;
				this.points = [];
			},
			_inertiaStop: function() {
				this.animation.stop();
				var _style = this.core.bindedElement.style;
				_style[transitionTimingFunction] = "";
				_style[transitionDuration] = "";
				this._setPosition({
					inertia: true
				}, this.info.currentXY);
				this._afterInertiaStop();
			},
			destroy: function() {
				this.init(false);
				this.animation.stop();
			}
		};

		var _forMobileDraggerOn = false,
			_forMobileDragger = function(evt) {
				if (!new RegExp('INPUT|SELECT|BUTTON|TEXTAREA').test(evt.manager.src.tagName.toUpperCase())) {
					NEvents.preventDefault(evt);
				}
			};

		/**
		 * 移动端拖拽，取消Dom touchstart默认动作
		 * @param {Object} on 打开或关闭 true|false
		 * @param {Object} dom 取消的默认动作dom,默认document
		 */
		NEvents.forMobileDragger = function(on, dom) {
			if (_forMobileDraggerOn && on) {
				return;
			}
			_forMobileDraggerOn = on;
			on = on ? 'on' : 'un';
			NEvents.listen(dom || document)[on]('touchstart', null, _forMobileDragger);
		};

	};

	//-----------------------------------------模块-----------------------------------------//

	if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
		//node.js
		var NEvents = require('NEvents');
		factory(NEvents);
		module.exports = NEvents;
	} else if (typeof define === 'function' && define.cmd) {
		//CommonJS
		define("Dragger",["NEvents"],function(require, exports, module) {
			var NEvents = require('NEvents');
			factory(NEvents);
			module.exports = NEvents;
		});
	} else {
		//window
		factory(_window.NimanEvents);
	}
})(this);

/**
 *	手勢指令
 */
;
(function(_window) {

	function factory(NEvents) {
		var abs = Math.abs,
			doc = _window.document,
			mix = function(a, b) {
				for (var k in b) {
					a[k] = b[k];
				}
				return a;
			};

		function Gesture(core) {
			this.core = core;
			this.info = {
				hasDown: false,
				lastXY: {
					x: 0,
					y: 0
				},
				lastUp: 0
			};
			this.init(true);
			var self = this;
			self.docUp = function(evt) {
				self._mouseup(evt);
			};
		};

		Gesture.prototype = {
			//两次单击时间必须大于400ms
			durationClick: 400,
			//时间大余这个值，才可能触发taphold;小于这个值，才可能触发swipe
			durationThreshold: 1000,
			//水平拖曳距离超过这个值时才可能触发 swipe 事件
			horizontalDistanceThreshold: 75,
			//垂直拖曳距离小于这个值时才可能触发 swipe 事件
			verticalDistanceThreshold: 30,
			//容器，默认是document，用于处理监听对象之外的鼠标放开事件。
			container: doc,
			//判断是否移动误差值
			deviation: 5,
			init: function(listen) {
				var _on = listen ? 'on' : 'un',
					_event = this.core;

				_event[_on]('mousedown', this, this._mousedown);
				_event[_on]('mousemove', this, this._mousemove);
				_event[_on]('mouseup', this, this._mouseup);

				_event[_on]('touchstart', this, this._touchstart);
				_event[_on]('touchmove', this, this._touchmove);
				_event[_on]('touchend', this, this._touchend);

				_event[_on]('gesturestart', this, this._gesturestart);
				_event[_on]('gesturechange', this, this._gesturechange);
				_event[_on]('gestureend', this, this._gestureend);

				_event[_on]('orientationchange', this, this._orientationchange);
			},
			_isParent: function(dom) {
				var pnt = dom,
					bdmt = this.core.bindedElement;
				if (pnt == bdmt) {
					return true;
				}
				while (pnt = pnt.parentNode) {
					if (pnt == bdmt) {
						return true;
					}
				}
				return false;
			},
			_isGesture: function(evt) {
				var tts = Array.prototype.slice.call(evt.touches);
				for (var i = 0; i < tts.length; i++) {
					if (!this._isParent(tts[i].target)) {
						return false;
					}
				}
				return true;
			},
			_bulidTargetTouches: function(evt) {
				//var tts = evt.targetTouches,
				var tts = evt.touches,
					_tts = [],
					i;
				for (i = 0; i < tts.length; i++) {
					_tts.push({
						x: tts[i].clientX,
						y: tts[i].clientY
					})
				}
				return _tts;
			},
			_mousedown: function(evt) {
				this._down(evt, [{
					x: evt.clientX,
					y: evt.clientY
				}]);
			},
			_mousemove: function(evt) {
				this._move(evt, [{
					x: evt.clientX,
					y: evt.clientY
				}]);
			},
			_mouseup: function(evt) {
				this._up(evt, [{
					x: evt.clientX,
					y: evt.clientY
				}]);
			},
			_touchstart: function(evt) {
				this._down(evt, this._bulidTargetTouches(evt));
			},
			_touchmove: function(evt) {
				this._move(evt, this._bulidTargetTouches(evt));
			},
			_touchend: function(evt) {
				this._up(evt, this._bulidTargetTouches(evt));
			},
			_gesturestart: function(evt) {

			},
			_gesturechange: function(evt) {

			},
			_gestureend: function(evt) {},
			_orientationchange: function(evt) {},
			_getDistance: function(xy0, xy1) {
				return Math.sqrt(Math.pow(xy0.x - xy1.x, 2) + Math.pow(xy0.y - xy1.y, 2));
			},
			_down: function(evt, xys) {
				if (1 == xys.length) {
					this._reset(evt, xys);
				}
				var info = this.info,
					self = this;
				info.hasDown = true;
				info.downTime = new Date().getTime();
				info.downXYs = xys;
				if (xys.length > 1 && this._isGesture(evt)) {
					info.startDistance = this._getDistance(xys[0], xys[1]);
					this.core.emit('$gesturestart', evt);
				}
				NEvents.listen(doc).on('mouseup', this, this.docUp);
				if (this.container != doc) {
					NEvents.listen(this.container).on('mouseup', this, this.docUp);
				}
				var _evt = mix({}, evt);
				info.holdTimeout = setTimeout(function() {
					self.core.emit('$taphold', _evt);
				}, this.durationThreshold);
			},
			_move: function(evt, xys) {
				var time = new Date().getTime(),
					info = this.info;
				if (!info.hasDown) {
					return;
				}
				if (xys.length > 1 && this._isGesture(evt)) {
					this.core.emit('$gesturechange', evt);
					if (2 == xys.length) {
						this._scale(evt, xys);
					}
				}
				if (1 == xys.length && !info.swiped) {
					this._swipe(evt, xys, time);
					if (!info.hasMove) {
						info.hasMove = abs(info.downXYs[0].x - xys[0].x) > this.deviation ||
							abs(info.downXYs[0].y - xys[0].y) > this.deviation;
						if (info.hasMove) {
							clearTimeout(info.holdTimeout);
						}
					}
				}
			},
			_reset:function(){
				var info = this.info;
				info.hasDown = false;
				info.swiped = false;
				info.hasMove = false;
				clearTimeout(info.holdTimeout);
				NEvents.listen(doc).un('mouseup', this, this.docUp);

				if (this.container != doc) {
					NEvents.listen(this.container).un('mouseup', this, this.docUp);
				}
			},
			_up: function(evt, xys) {
				var info = this.info;
				var time = new Date().getTime();
				if (time-info.lastUp  < this.durationClick) {
					clearTimeout(info.holdTimeout);
					return;
				}
				info.lastUp = time;
				if (!info.hasMove && time - info.downTime < this.durationThreshold) {
					this.core.emit('$sclick', evt);
				}
				this._reset();
			},
			_swipe: function(evt, xys, time) {
				var info = this.info,
					downXYs = info.downXYs,
					dx = xys[0].x - downXYs[0].x,
					dy = xys[0].y - downXYs[0].y,
					swiped = true,
					swipeType;

				swiped = swiped && time - info.downTime < this.durationThreshold;
				var swipedX = swiped && (abs(dx) > this.horizontalDistanceThreshold) && (abs(xys[0].y - downXYs[0].y) < this.verticalDistanceThreshold);
				var swipedY = swiped && (abs(dy) > this.horizontalDistanceThreshold) && (abs(xys[0].x - downXYs[0].x) < this.verticalDistanceThreshold);

				if (swipedX || swipedY) {
					info.swiped = true;
					if (swipedX) {
						swipeType = dx < 0 ? 'left' : 'right';
					} else {
						swipeType = dy < 0 ? 'top' : 'bottom';
					}
					evt.swipeType = swipeType;

					this.core.emit('$swipe', evt);
					this.core.emit('$swipe' + swipeType, evt);
				}
			},
			_scale: function(evt, xys, time) {
				evt.scale = this._getDistance(xys[0], xys[1]) / this.info.startDistance;
				this.core.emit('$scale', evt);
			},
			setContainer: function(container) {
				if ('string' == typeof container) {
					container = _window.document.getElementById("container");
				}
				this.container = container;
			}
		};

		NEvents.handler.Gesture = Gesture;

		NEvents.useGesture = true;
		var _NEventsConstructor = NEvents.Events;
		var _NewNEvents = NEvents.Events = function() {
			_NEventsConstructor.apply(this, arguments);
			if (NEvents.useGesture) {
				this.gesture = new Gesture(this);
			}
		};

		//继承NEvents
		var _t = function() {};
		_t.prototype = _NEventsConstructor.prototype;
		_NewNEvents.prototype = new _t;
	};

	//-----------------------------------------模块-----------------------------------------//

	if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
		//node.js
		var NEvents = require('NEvents');
		factory(NEvents);
		module.exports = NEvents
	} else if (typeof define === 'function' && define.cmd) {
		//CommonJS
		define("Gesture",["NEvents"],function(require, exports, module) {
			var NEvents = require('NEvents');
			factory(NEvents);
			module.exports = NEvents;
		});
	} else {
		//window
		factory(_window.NimanEvents);
	}
})(this);

/**
 * 模拟滚动条
 */
(function(_window) {

	var factory = function(NEvents, Dragger) {

		var rnd = Math.round,
			/**
			 *用于计算当前位置和最近的DOM元素的距离
			 */
			getDistance = function(x1, y1, x2, y2) {
				return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
			},
			/**
			 * 计算页面可以滚动的范围，不超过padding
			 */
			getLimit = function(dx, dy, self) {
				var padding = self.info.padding,
					size = self.info.size,
					minX, minY;

				minX = (size.outWidth - size.inWidth * self.zoom);
				(minX > padding.left) && (minX = padding.left);
				(dx > padding.left) && (dx = padding.left);
				(dx < minX - padding.right) && (dx = minX - padding.right);

				minY = (size.outHeight - size.inHeight * self.zoom);
				(minY > padding.top) && (minY = padding.top);
				(dy > padding.top) && (dy = padding.top);
				(dy < minY - padding.bottom) && (dy = minY - padding.bottom);

				return {
					dx: dx,
					dy: dy
				};
			},
			/**
			 * JarKaiScroll构造器
			 * @param {Object} outDom 容器元素
			 * @param {Object} inDom 页面元素
			 */
			JarKaiScroll = function(outDom, inDom) {

				if ('string' == typeof outDom) {
					outDom = document.getElementById(outDom);
				}
				if ('' == outDom.style.position) {
					outDom.style.position = 'relative';
				}
				this.outDom = outDom;

				if ('string' == typeof inDom) {
					inDom = document.getElementById(inDom);
				}
				if ('' == inDom.style.position) {
					inDom.style.position = 'relative';
				}
				this.dom = inDom;

				NEvents.forMobileDragger(true, outDom);

				this.tempDiv = document.createElement('div');
				this.info = {
					/**
					 * 页面和容器之间的最大的空白
					 */
					padding: {
						top: 0,
						right: 0,
						bottom: 0,
						left: 0
					},
					/**
					 * 页面当前位置
					 */
					offsetXY: {
						x: 0,
						y: 0
					},
					/**
					 * 横滚动条位置
					 */
					scrollLeft: 0,
					/**
					 * 纵滚动条位置
					 */
					scrollTop: 0
				};
				/**
				 * 滚动条圆角
				 */
				this.scrollCss += 'border-radius:' + rnd(this.scrollWidth / 2) + 'px';

				var self = this,
					events = NEvents.listen(inDom).buildDragger();
				events.buildDragger();
				this.core = events;
				this.dragger = events.dragger;
				/**
				 * 重写dragger设置方位的方法，包含scroll位置的计算和拖拽范围的计算
				 * @param {Object} dx
				 * @param {Object} dy
				 */
				events.dragger._setXY = function(dx, dy) {
					if (isNaN(dx) || isNaN(dy) || !self.scrollAble) {
						return;
					}
					var dom = this.core.bindedElement,
						_style = dom.style,
						dXY, scrollLeft, scrollTop, info = self.info,
						size = info.size,
						css3Type = self.useTransform && !NEvents.oldIE;
					//用临时节点时，Dom可能不在Dom树内

					if (css3Type) {
						dx = rnd(dx + this.info.teansX);
						dy = rnd(dy + this.info.teansY);
						dXY = getLimit(dx, dy, self);
						if (dom.parentNode) {
							_style[NEvents.transform] = 'translate(' + dXY.dx + 'px,' + dXY.dy +
								'px) ' + info.translateZ + ' scale(' + self.zoom + ') ';
							_style[NEvents.transformOrigin] = self.transformOrigin;
						}
					} else {
						dx = rnd(dx + this.info.left);
						dy = rnd(dy + this.info.top);
						dXY = getLimit(dx, dy, self);
						if (dom.parentNode) {
							_style.left = dXY.dx + 'px';
							_style.top = dXY.dy + 'px';
						}
					}
					/**
					 * 页面位置
					 */
					self.info.offsetXY = {
						x: dXY.dx,
						y: dXY.dy
					};
					/**
					 * 移动滚动条
					 */
					self._moveScroll();
					self.core.emit('$scrolling', {});
				};
				this.animation = new NEvents.Animation();
				/**
				 * 拖拽开始时显示滚动条
				 */
				events.on('$dragstart', this, this._hideScroll);

				/**
				 * 1 惯性运动结束时，隐藏滚动条
				 * 2 开启分页功能惯性运动结束时，计算应该停留的DOM的位置。
				 */
				events.on('$inertiaend', this, this._inertiaend);
				/**
				 * 创建滚动条
				 */
				this.xScroll = document.createElement('div');
				this.yScroll = document.createElement('div');

				events.on('$down', this, this.reflush);

				this.reflush();
			};


		JarKaiScroll.prototype = {
			//缩放比例
			zoom: 1,
			//定点滚动的默认滚动时间（毫秒）
			scrollTime: 300,
			//显示横滚动条
			showXScroll: true,
			//显示总滚动条
			showYScroll: true,
			//通过临时DOM节点提升性能
			useTempDiv: false,
			//用TranslateZ提升效果
			useTranslateZ: true,
			//可以滚动
			scrollAble: true,
			//缩放起点
			transformOrigin: '0 0',
			//是否用CSS3的transform
			useTransform: true,
			//滚动条的zindex
			scrollZindex: 100,
			//滚动条样式
			scrollCss: 'background-color:#000000;border:solid 1px #FFFFFF;position:absolute;z-index:100;display:none;opacity:0;transition:opacity 300ms;',
			//滚动条宽度
			scrollWidth: 3,
			//滚动条透明度
			scrollOpacity: 0.4,
			/**
			 * 销毁滚动条对象
			 */
			destroy: function() {

				this.core.un('$inertiaend', this, this._inertiaend);
				this.core.un('$dragging', this, this._onNextPageEvent);
				this.core.un('$dragstart', this, this._hideScroll);
				this.core.un('$down', this, this.reflush);

				NEvents.forMobileDragger(false, this.outDom);

				if (this.xScroll.parentNode) {
					this.outDom.removeChild(this.xScroll);
				}
				if (this.yScroll.parentNode) {
					this.outDom.removeChild(this.yScroll);
				}

				this.xScroll = null;
				this.yScroll = null;
			},
			/**
			 * 移动滚动条
			 */
			_moveScroll: function() {
				var info = this.info,
					size = info.size,
					offsetXY = info.offsetXY,
					css3Type = self.useTransform && !NEvents.oldIE,
					scrollLeft, scrollTop;
				/**
				 *横滚动条
				 */
				if (this.showXScroll) {
					scrollLeft = info.scrollLeft = -rnd(offsetXY.x * size.outWidth / size.inWidth) / this.zoom;
					if (css3Type) {
						this.xScroll.style[NEvents.transform] = 'translate(' +
							scrollLeft + 'px,' + 0 + 'px)' + info.translateZ;
					} else {
						this.xScroll.style.left = scrollLeft + 'px';
					}
				}
				/**
				 * 纵滚动条
				 */
				if (this.showYScroll) {
					scrollTop = info.scrollTop = -rnd(offsetXY.y * size.outHeight / size.inHeight) / this.zoom;
					if (css3Type) {
						this.yScroll.style[NEvents.transform] = 'translate(' + 0 + 'px,' +
							scrollTop + 'px)' + info.translateZ;
					} else {
						this.yScroll.style.top = scrollTop + 'px';
					}
				}
			},
			/**
			 * 非滚动状态下隐藏滚动条
			 */
			_hideScroll: function(evt, hide) {
				var opacity = hide ? 0 : this.scrollOpacity;
				this.xScroll.style.opacity = opacity;
				this.yScroll.style.opacity = opacity;
			},
			/**
			 * 惯性运动结束事件
			 */
			_inertiaend: function() {
				this._hideScroll(null, true);
				this._scrollToElement(this._near(this.info.offsetXY));
			},
			/**
			 * 滚动到某个元素
			 * @param {Object} info
			 * @param {Object} time
			 */
			_scrollToElement: function(info, time) {
				var padding = this.info.padding,
					x, y;
				if (info) {
					x = info.left + padding.left;
					y = info.top + padding.top;
					this.scrollTo.apply(this, [x, y, time]);
					this.info.currentElementIndex = info.index;
				}
			},
			/**
			 * 播放滚动动画
			 * @param {Object} endX
			 * @param {Object} endY
			 * @param {Object} playTime
			 */
			_playAnimation: function(endX, endY, playTime) {
				var startXY = {
						x: this.info.offsetXY.x,
						y: this.info.offsetXY.y
					},
					distance = {
						x: endX - startXY.x,
						y: endY - startXY.y
					},
					self = this,
					startTime = new Date().getTime(),
					callback = function() {
						var time = new Date().getTime() - startTime,
							scale = time / playTime,
							dx = distance.x * scale,
							dy = distance.y * scale;
						if (time >= playTime) {
							dx = distance.x;
							dy = distance.y;
							self.dragger.dragAble = true;
							self.animation.stop();
							self.animation.removeCallback();
						}
						self.dragger._setXY(dx, dy);
					};
				this.animation.setCallback(callback);
				this.animation.start();
			},
			/**
			 * 播放缩放动画
			 * @param {Object} zoom
			 * @param {Object} playTime
			 */
			_playZoomAnimation: function(zoom, playTime) {
				var self = this,
					startZoom = this.zoom,
					dZoom = zoom - startZoom,
					startTime = new Date().getTime(),
					callback = function() {
						var time = new Date().getTime() - startTime;
						self.zoom = dZoom * time / playTime + startZoom;
						if (time >= playTime) {
							self.zoom = zoom;
							self.dragger.dragAble = true;
							self.animation.stop();
							self.animation.removeCallback();
							self._initXYScroll();
							self._snap();
						}
						self.dragger._setXY(0, 0);
					};
				this.animation.setCallback(callback);
				this.animation.start();
			},
			/**
			 * 读取下一个页面动画
			 */
			_onNextPageEvent: function() {
				var nextPage = this.info.nextPage,
					offsetXY = this.info.offsetXY,
					size = this.info.size,
					next = false;
				next = next || ('bottom' == nextPage.type && (nextPage.threshold >= size.inHeight + offsetXY.y - size.outHeight));
				next = next || ('right' == nextPage.type && (nextPage.threshold >= size.inWidth + offsetXY.x - size.outWidth));
				if (next) {
					nextPage.callback(this.info.resetState);
					this.core.un('$dragging', this, this._onNextPageEvent);
					this.info.resetStateOn = false;
				}
			},
			/**
			 * 计算元素位置
			 * @param {Object} el
			 * @param {Object} i
			 */
			_offset: function(el, i) {
				var left = el.offsetLeft,
					top = el.offsetTop,
					width = el.offsetWidth,
					height = el.offsetHeight,
					zoom = this.zoom;

				while ((el = el.parentNode) && el != this.dom) {
					left += el.offsetLeft;
					top += el.offsetTop;
				}

				left *= zoom;
				top *= zoom;
				width *= zoom;
				height *= zoom;

				return {
					left: -left,
					top: -top,
					right: left + width,
					bottom: top + height,
					index: i
				};
			},
			/**
			 * 寻找最近的元素
			 * @param {Object} xy
			 */
			_near: function(xy) {
				var domList, snapBounds, inIt, i, info, info2, distance, distance2,
					padding = this.info.padding,
					left, top, deviation;

				if (!this.info.snapFilter) {
					return null;
				}

				snapBounds = this.info.snapBounds;
				left = xy.x - padding.left;
				top = xy.y - padding.top;
				shortest = null;
				distance = Infinity;

				for (i = 0; i < snapBounds.length; i++) {
					info = snapBounds[i];
					distance2 = getDistance(left, top, info.left, info.top);
					if (distance2 < distance) {
						distance = distance2;
						shortest = info;
					}
				}

				return shortest;
			},
			/**
			 * 计算列表中每个元素的位置
			 */
			_snap: function() {
				var domList, snapBounds, _filter;

				if (!(_filter = this.info.snapFilter)) {
					this.info.snapBounds = null;
					return;
				}

				snapBounds = this.info.snapBounds = [];
				domList = _filter();

				for (var i = 0; i < domList.length; i++) {
					snapBounds.push(this._offset(domList[i], i));
				}
			},
			/**
			 * 初始化滚动条
			 */
			_initXYScroll: function() {
				var info = this.info,
					size = info.size,
					xStyle = this.xScroll.style,
					yStyle = this.yScroll.style,
					xWidth = Math.round(Math.pow(size.outWidth, 2) / size.inWidth) / this.zoom,
					yHeight = Math.round(Math.pow(size.outHeight, 2) / size.inHeight) / this.zoom;

				xStyle.cssText = this.scrollCss;
				xStyle.left = '0px';
				xStyle.bottom = '0px';
				xStyle.width = xWidth + 'px';
				xStyle.height = this.scrollWidth + 'px';

				yStyle.cssText = this.scrollCss;
				yStyle.right = '0px';
				yStyle.top = '0px';
				yStyle.height = yHeight + 'px';
				yStyle.width = this.scrollWidth + 'px';

				/**
				 * 移动滚动条，使之符合当前页面位置
				 */
				this._moveScroll();

				if (xWidth < size.outWidth) {
					xStyle.display = 'block';
				}
				if (yHeight < size.outHeight) {
					yStyle.display = 'block';
				}

			},
			/**
			 * 设置触发读取下一页的位置
			 * @param {Object} type 滚动方向bottom|right
			 * @param {Object} threshold 触发位置
			 * @param {Object} callback 回调函数
			 */
			nextPage: function(type, threshold, callback) {
				this.info.nextPage = {
					type: type,
					threshold: threshold,
					callback: callback,
					state: false,
				};

				this.core.un('$dragging', this, this._onNextPageEvent);

				if (!this.info.resetState) {
					var self = this;
					var resetState = this.info.resetState = function() {
						self.core.on('$dragging', self, self._onNextPageEvent);
					};
					this.info.resetStateOn = true;
					resetState();
				}
			},
			config: function(key, value) {
				if (undefined !== key) {
					this[key] = value;
				}
			},
			/**
			 * 自定义元素选择器
			 * @param {Object} filter
			 */
			snap: function(filter) {
				var self = this,
					_filter;
				if ('string' == typeof filter) {
					_filter = function() {
						return self.dom.ownerDocument.getElementsByTagName(filter);
					}
				} else {
					_filter = filter;
				}
				this.info.snapFilter = _filter;
				this._snap();
			},
			/**
			 * 强制重置状态，监听下一页事件
			 */
			resetState: function() {
				if (this.info.resetState && (!this.info.resetStateOn)) {
					this.info.resetStateOn = true;
					this.info.resetState();
				}
			},
			/**
			 * 缩放
			 * @param {Object} zoom 缩放比例
			 * @param {Object} time 动画时间
			 * @param {Object} oldZoomFun 是否采用普通动画，默认是CSS3动画
			 */
			zoomTo: function(zoom, time, oldZoomFun) {
				if (this.animation.playing) {
					return;
				}
				time = undefined == time ? this.scrollTime : time;
				this.dragger._initStartXY();
				var css3Type = (this.dragger.useTransform && !NEvents.oldIE);
				if (0 === time || !css3Type) {
					this.zoom = zoom;
					this.dragger._setXY(0, 0);
					this._initXYScroll();
					this._snap();
				} else {
					this._playZoomAnimation(zoom, time);
				}

				if (!css3Type) {
					oldZoomFun(zoom);
				}
			},
			/**
			 * 显示滚动条
			 * @param {Object} x 显示水平滚动条
			 * @param {Object} y 显示垂直滚动条
			 */
			showScroll: function(x, y) {
				this.showXScroll = x;
				this.showYScroll = y;
			},
			/**
			 * 滚动到目标位置
			 * @param {Object} x X轴
			 * @param {Object} y Y轴
			 * @param {Object} time 时间
			 */
			scrollTo: function(x, y, time) {
				if (this.animation.playing) {
					return;
				}
				this.reflush();
				if (this.dragger.info.inertiaMoving) {
					this.dragger._inertiaStop();
				}
				if (undefined == time) {
					time = 1;
				}
				this.dragger._initStartXY();
				this.dragger.dragAble = false;
				this._playAnimation(x, y, time);
			},
			/**
			 * 滚动到某个元素
			 * @param {Object} index 序号
			 * @param {Object} time 时间
			 */
			scrollToElement: function(index, time) {
				if (this.animation.playing) {
					return;
				}
				var info = this.info,
					snapBounds, boundsInfo;
				if (info.snapFilter && (snapBounds = info.snapBounds) && (boundsInfo = snapBounds[index])) {
					this._scrollToElement(boundsInfo, time);
				}
			},
			/**
			 * 设置边框空白
			 * @param {Object} top
			 * @param {Object} right
			 * @param {Object} bottom
			 * @param {Object} left
			 */
			padding: function(top, right, bottom, left) {
				this.info.padding = {
					top: top,
					right: right,
					bottom: bottom,
					left: left
				};
			},
			/**
			 * 监听事件
			 * @param {Object} evtName
			 * @param {Object} scope
			 * @param {Object} callback
			 */
			on: function(evtName, scope, callback) {
				this.dragger.core.on(evtName, scope, callback);
			},
			/**
			 * 解除监听
			 * @param {Object} evtName
			 * @param {Object} scope
			 * @param {Object} callback
			 */
			un: function(evtName, scope, callback) {
				this.dragger.core.un(evtName, scope, callback);
			},
			/**
			 * 发射事件
			 */
			emit: function() {
				var core = this.dragger.core;
				core.emit.apply(core, arguments);
			},
			/**
			 * 刷新，重新初始化
			 */
			reflush: function() {
				var info = this.info,
					size;

				if ('' == this.outDom.style.position) {
					this.outDom.style.position = 'relative';
				}

				if (this.showXScroll && !this.xScroll.parentNode) {
					this.outDom.appendChild(this.xScroll);
				} else if (!this.showXScroll && this.xScroll.parentNode) {
					this.outDom.removeChild(this.xScroll);
				}

				if (this.showYScroll && !this.yScroll.parentNode) {
					this.outDom.appendChild(this.yScroll);
				} else if (!this.showYScroll && this.yScroll.parentNode) {
					this.outDom.removeChild(this.yScroll);
				}

				if (this.useTranslateZ) {
					this.info.translateZ = ' translateZ(0px) ';
				} else {
					this.info.translateZ = '';
				}

				size = this.info.size = {
					outHeight: this.outDom.offsetHeight,
					outWidth: this.outDom.offsetWidth,
					inHeight: this.dom.offsetHeight,
					inWidth: this.dom.offsetWidth,
				};
				this._initXYScroll();
				var outDisplay = this.outDom.style.display;
				this.outDom.style.display = 'none';
				this.outDom.style.display = outDisplay;
				if (this.useTempDiv) {
					//移除节点再加入，可提升性能					
					this.outDom.replaceChild(this.tempDiv, this.dom);
					this.outDom.replaceChild(this.dom, this.tempDiv);
				}
			}
		};

		JarKaiScroll.NEvents = JarKaiScroll;
		JarKaiScroll.Dragger = Dragger;

		return JarKaiScroll;
	};

	if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
		//node.js
		var NEvents = require('NEvents');
		module.exports = factory(NEvents, require('Dragger'));
	} else if (typeof define === 'function' && define.cmd) {
		//CommonJS
		define("Scroll",["NEvents","Dragger"],function(require, exports, module) {
			var NEvents = require('NEvents');
			module.exports = factory(NEvents, require('Dragger'));
		});
	} else {
		//window
		_window.JarKaiScroll = factory(_window.NimanEvents, _window.NimanDragger);
	}
})(this);

