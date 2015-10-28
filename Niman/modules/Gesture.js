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