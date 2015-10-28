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
	} else if (typeof define === 'function') {
		//CommonJS
		define(function(require, exports, module) {
			module.exports = NRouter;
		});
	} else {
		//window
		_window.NimanRouter = NRouter;
	}
})(this);