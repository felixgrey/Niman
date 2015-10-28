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
			path = path.replace(/\.\w+(\[\d+\])*\.\$parent/g, '');
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
			parent2 = parent;
			parent = _data;
			if (parent instanceof Array && isNaN(parseInt(name))) {
				if (parent2) {
					_data = parent2[name];
				}
				continue;
			}
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
	} else if (typeof define === 'function') {
		//CommonJS
		define(function(require, exports, module) {
			module.exports = NViewModel;
		});
	} else {
		//window
		_window.NimanViewModel = NViewModel;
	}

})(this);