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


if(typeof define === 'function'){define(function(require){return require('Scroll');});}


/*SINGLE_DEFINE_BEGIN*/if(typeof define === 'function'){define(function(){});}/*SINGLE_DEFINE_END*/

