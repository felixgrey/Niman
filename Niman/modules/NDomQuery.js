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
	} else if (typeof define === 'function') {
		//CommonJS
		define(function(require, exports, module) {
			module.exports = NDomQuery;
		});
	} else {
		//window
		_window.NimanDomQuery = NDomQuery;
	}

})(this);