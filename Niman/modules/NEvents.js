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
	} else if (typeof define === 'function') {
		//CommonJS
		define(function(require, _exports, module) {
			module.exports = exports;
		});
	} else {
		//window
		_window.NimanEvents = exports;
	}
})(this);