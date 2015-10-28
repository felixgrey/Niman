var fs = require("fs");

var argv = process.argv,
	config;

if (argv.length < 3) {
	config = require("./config");
} else {
	config = require(argv[2]);
}

/**
 * Promise规范
 */
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
				if (_o[state]) {
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

var charset = config.charset || 'utf-8';

var readFile = function(filePath) {
	return new NPromise(function(resolve, reject) {
		fs.readFile(filePath, charset, function(err, data) {
			if (err) {
				reject(err);
				return;
			}
			resolve(data);
		});
	});
};

var writeFile = function(name, text) {
	return new NPromise(function(resolve, reject) {
		fs.writeFile(name, text, charset, function(err) {
			if (err) {
				reject(err);
				return;
			}
			resolve(0);
		});
	});
};

var moduleMap = {};

function getDependencies(moduleName, _track) {
	var track = _track || [moduleName];
	if (moduleMap[moduleName]) {
		var _dependencies = moduleMap[moduleName].dependencies;
		for (var i = 0; i < _dependencies.length; i++) {
			track.push(_dependencies[i]);
			getDependencies(_dependencies[i], track);
		}
	}
	return track;
}


var singleText = "";
if (undefined != config.loader && null != config.loader) {
	var next = readFile(config.loader).then(function(data) {
		singleText += data + '\n\n';
	})
} else {
	next = NPromise.resolve();
}



var cssMap = {};
var singleCSS = "";


function buildTemplate(data) {
	data = data.replace(/\\/g, '\\\\');
	data = data.replace(/"/g, '\\"');
	data = data.replace(new RegExp('\r', 'g'), '');
	data = data.replace(new RegExp('\n', 'g'), '"\n+"');
	data = data.replace(/^\r|^\n|\r$|\n$/g, '');
	data = '"' + data + '"';
	return data;
};

for (var k in config.modules) {
	var name = k;
	var path = config.modules[k];
	if (new RegExp("\\.js$", "g").test(path)) {
		(function(_name, _path) {
			next = next.then(function() {
				return readFile(_path)
			}).then(function(data) {
				moduleMap[_name] = {
					name: _name,
					data: data
				}
			}).catch(function(err) {
				console.log("JS读取异常", err);
			});
		})(name, path);
	}
	if (new RegExp("\\.css$", "g").test(path)) {
		(function(_name, _path) {
			next = next.then(function() {
				return readFile(_path)
			}).then(function(data) {
				singleCSS += data + "\n\n";
			}).catch(function(err) {
				console.log("CSS读取异常", err);
			});
		})(name, path);
	}
	if (new RegExp('\\.tpl|\\.htm$|\\.html$|\\.template$|\\.txt$').test(path)) {
		(function(_name, _path) {
			next = next.then(function() {
				return readFile(_path)
			}).then(function(data) {
				singleText += 'define("' + _name + '",[],function(){\n return ' + buildTemplate(data) + ';\n});\n\n'
			}).catch(function(err) {
				console.log("模板读取异常", err);
			});
		})(name, path);
	}
};


var REQUIRE_REG = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g;
var getdependencies = function(text) {
	var temp = {},
		require = [],
		k;
	text.replace(/\\\\/g, "").replace(REQUIRE_REG, function(m, m1, m2) {
		if (m2) {
			temp[m2] = 1;
		}
	});
	for (k in temp) {
		require.push(k);
	}
	return require;
};

var defineRegExp = /define\s*\(function\s*\(/g;

function readDependencies() {
	var squeue = [],
		dependency;
	for (var k in moduleMap) {
		moduleMap[k].dependencies = getdependencies(moduleMap[k].data)
	}
	for (var k in moduleMap) {
		var dependencies = getDependencies(k)
		while (dependency = dependencies.pop()) {
			if (!moduleMap[dependency]) {
				//console.log(dependency);
				continue;
			}
			if (!moduleMap[dependency].hasOut) {
				moduleMap[dependency].hasOut = true;
				squeue.push(dependency);
			}
		}
	}

	for (var i = 0; i < squeue.length; i++) {
		var name = squeue[i];
		var info = moduleMap[squeue[i]];
		var data = info.data;
		var dependenciesStr = '"' + info.dependencies.join('","') + '"';

		if ('""' == dependenciesStr) {
			dependenciesStr = '';
		}
		var _data = data.replace(/(typeof define\s*==(=)?\s*['"]function['"])|(['"]function['"]\s*==(=)?\s*typeof define)/g, "typeof define === 'function' && define.cmd")
		var newDefine = 'define("' + name + '",[' + dependenciesStr + '],function(';
		singleText += _data.replace(defineRegExp, newDefine) + '\n\n';
	}

};

var singleModuleDefine = "/*SINGLE_DEFINE_BEGIN*/if(typeof define === 'function'){define(function(){});}/*SINGLE_DEFINE_END*/";

next.then(function() {
		readDependencies();
		if (undefined != config.appendString) {
			singleText += '\n' + config.appendString + '\n\n';
		}

	}).then(function() {
	singleText=singleText.replace(/\/\*SINGLE_DEFINE_BEGIN\*\//g,'/*').replace(/\/\*SINGLE_DEFINE_END\*\//g,'*/');
	if(config.combination){
		singleText+='\n'+singleModuleDefine+ '\n\n';
	}

	if (config.output) {
		writeFile(config.output, singleText).then(function() {
			console.log("js done!");
		});
	}

	if (config.outputCSS) {
		writeFile(config.outputCSS, singleCSS).then(function() {
			console.log("css done!");
		});
	}

	if (config.outputCSSMin) {
		var CleanCSS = require('clean-css');
		var minified = new CleanCSS().minify(singleCSS).styles;
		writeFile(config.outputCSSMin, minified).then(function() {
			console.log("mincss done!");
		});
	}

	if (config.outputMin) {

		var UglifyJS = require("uglify-js");
		var result = UglifyJS.minify(singleText, {
			fromString: true
		});

		next.then(function() {
			writeFile(config.outputMin, result.code).then(function() {
				console.log("minjs done!");
			})
		});
	}
}).catch(function(err) {
	console.log(err);
});