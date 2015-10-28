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
	} else if (typeof define === 'function') {
		//CommonJS
		define(function(require, _exports, module) {
			module.exports = exports;
		});
	} else {
		//window
		_window.NimanUtils = exports;
	}
})(this);