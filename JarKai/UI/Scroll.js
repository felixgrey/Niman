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
	} else if (typeof define === 'function') {
		//CommonJS
		define(function(require, exports, module) {
			var NEvents = require('NEvents');
			module.exports = factory(NEvents, require('Dragger'));
		});
	} else {
		//window
		_window.JarKaiScroll = factory(_window.NimanEvents, _window.NimanDragger);
	}
})(this);