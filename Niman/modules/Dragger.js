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
	} else if (typeof define === 'function') {
		//CommonJS
		define(function(require, exports, module) {
			var NEvents = require('NEvents');
			factory(NEvents);
			module.exports = NEvents;
		});
	} else {
		//window
		factory(_window.NimanEvents);
	}
})(this);