var fs = require("fs");
var path = require("path");
var url = require("url");
var querystring = require('querystring');

var mimeTypeMap = {
	"-1": "text/html",
	"-2": "application/octet-stream",
	"-3": "application/x-",
	/******************************************/
	"json": "text/html",
	"jsonp": "application/x-javascript",
	"js": "application/x-javascript",
	"html": "text/html",
	"css": "text/css",
	"txt": "text/plain",
	"htm": "text/html",
	"bmp": "image/bmp",
	"gif": "image/gif",
	"jpe": "image/jpeg",
	"jpeg": "image/jpeg",
	"jpg": "image/jpeg",
	"png": "image/png",
	"ico": "image/ico",
	"icon": "image/ico",
	"svg": "image/svg+xml",
	"apk": "application/vnd.android.package-archive",
	/******************************************/
	"301": "application/x-301",
	"323": "text/h323",
	"906": "application/x-906",
	"907": "drawing/907",
	"tif": "application/x-tif",
	"001": "application/x-001",
	"a11": "application/x-a11",
	"acp": "audio/x-mei-aac",
	"ai": "application/postscript",
	"aif": "audio/aiff",
	"aifc": "audio/aiff",
	"aiff": "audio/aiff",
	"anv": "application/x-anv",
	"asa": "text/asa",
	"asf": "video/x-ms-asf",
	"asp": "text/asp",
	"asx": "video/x-ms-asf",
	"au": "audio/basic",
	"avi": "video/avi",
	"awf": "application/vnd.adobe.workflow",
	"biz": "text/xml",
	"bot": "application/x-bot",
	"c4t": "application/x-c4t",
	"c90": "application/x-c90",
	"cal": "application/x-cals",
	"cat": "application/vnd.ms-pki.seccat",
	"cdf": "application/x-netcdf",
	"cdr": "application/x-cdr",
	"cel": "application/x-cel",
	"cer": "application/x-x509-ca-cert",
	"cg4": "application/x-g4",
	"cgm": "application/x-cgm",
	"cit": "application/x-cit",
	"class": "java/*",
	"cml": "text/xml",
	"cmp": "application/x-cmp",
	"cmx": "application/x-cmx",
	"cot": "application/x-cot",
	"crl": "application/pkix-crl",
	"crt": "application/x-x509-ca-cert",
	"csi": "application/x-csi",
	"cut": "application/x-cut",
	"dbf": "application/x-dbf",
	"dbm": "application/x-dbm",
	"dbx": "application/x-dbx",
	"dcd": "text/xml",
	"dcx": "application/x-dcx",
	"der": "application/x-x509-ca-cert",
	"dgn": "application/x-dgn",
	"dib": "application/x-dib",
	"dll": "application/x-msdownload",
	"doc": "application/msword",
	"dot": "application/msword",
	"drw": "application/x-drw",
	"dtd": "text/xml",
	"dwf": "application/x-dwf",
	"dwg": "application/x-dwg",
	"dxb": "application/x-dxb",
	"dxf": "application/x-dxf",
	"edn": "application/vnd.adobe.edn",
	"emf": "application/x-emf",
	"eml": "message/rfc822",
	"ent": "text/xml",
	"epi": "application/x-epi",
	"eps": "application/postscript",
	"etd": "application/x-ebx",
	"exe": "application/x-msdownload",
	"fax": "image/fax",
	"fdf": "application/vnd.fdf",
	"fif": "application/fractals",
	"fo": "text/xml",
	"frm": "application/x-frm",
	"g4": "application/x-g4",
	"gbr": "application/x-gbr",
	"gl2": "application/x-gl2",
	"gp4": "application/x-gp4",
	"hgl": "application/x-hgl",
	"hmr": "application/x-hmr",
	"hpg": "application/x-hpgl",
	"hpl": "application/x-hpl",
	"hqx": "application/mac-binhex40",
	"hrf": "application/x-hrf",
	"hta": "application/hta",
	"htc": "text/x-component",
	"htt": "text/webviewhtml",
	"htx": "text/html",
	"icb": "application/x-icb",
	"iff": "application/x-iff",
	"ig4": "application/x-g4",
	"igs": "application/x-igs",
	"iii": "application/x-iphone",
	"img": "application/x-img",
	"ins": "application/x-internet-signup",
	"isp": "application/x-internet-signup",
	"IVF": "video/x-ivf",
	"java": "java/*",
	"jfif": "image/jpeg",

	"jsp": "text/html",
	"la1": "audio/x-liquid-file",
	"lar": "application/x-laplayer-reg",
	"latex": "application/x-latex",
	"lavs": "audio/x-liquid-secure",
	"lbm": "application/x-lbm",
	"lmsff": "audio/x-la-lms",
	"ls": "application/x-javascript",
	"ltr": "application/x-ltr",
	"m1v": "video/x-mpeg",
	"m2v": "video/x-mpeg",
	"m3u": "audio/mpegurl",
	"m4e": "video/mpeg4",
	"mac": "application/x-mac",
	"man": "application/x-troff-man",
	"math": "text/xml",
	"mdb": "application/x-mdb",
	"mfp": "application/x-shockwave-flash",
	"mht": "message/rfc822",
	"mhtml": "message/rfc822",
	"mi": "application/x-mi",
	"mid": "audio/mid",
	"midi": "audio/mid",
	"mil": "application/x-mil",
	"mml": "text/xml",
	"mnd": "audio/x-musicnet-download",
	"mns": "audio/x-musicnet-stream",
	"mocha": "application/x-javascript",
	"movie": "video/x-sgi-movie",
	"mp1": "audio/mp1",
	"mp2": "audio/mp2",
	"mp2v": "video/mpeg",
	"mp3": "audio/mp3",
	"mp4": "video/mpeg4",
	"mpa": "video/x-mpg",
	"mpd": "application/vnd.ms-project",
	"mpe": "video/x-mpeg",
	"mpeg": "video/mpg",
	"mpg": "video/mpg",
	"mpga": "audio/rn-mpeg",
	"mpp": "application/vnd.ms-project",
	"mps": "video/x-mpeg",
	"mpt": "application/vnd.ms-project",
	"mpv": "video/mpg",
	"mpv2": "video/mpeg",
	"mpw": "application/vnd.ms-project",
	"mpx": "application/vnd.ms-project",
	"mtx": "text/xml",
	"mxp": "application/x-mmxp",
	"net": "image/pnetvue",
	"nrf": "application/x-nrf",
	"nws": "message/rfc822",
	"odc": "text/x-ms-odc",
	"out": "application/x-out",
	"p10": "application/pkcs10",
	"p12": "application/x-pkcs12",
	"p7b": "application/x-pkcs7-certificates",
	"p7c": "application/pkcs7-mime",
	"p7m": "application/pkcs7-mime",
	"p7r": "application/x-pkcs7-certreqresp",
	"p7s": "application/pkcs7-signature",
	"pc5": "application/x-pc5",
	"pci": "application/x-pci",
	"pcl": "application/x-pcl",
	"pcx": "application/x-pcx",
	"pdf": "application/pdf",
	"pdx": "application/vnd.adobe.pdx",
	"pfx": "application/x-pkcs12",
	"pgl": "application/x-pgl",
	"pic": "application/x-pic",
	"pko": "application/vnd.ms-pki.pko",
	"pl": "application/x-perl",
	"plg": "text/html",
	"pls": "audio/scpls",
	"plt": "application/x-plt",
	"pot": "application/vnd.ms-powerpoint",
	"ppa": "application/vnd.ms-powerpoint",
	"ppm": "application/x-ppm",
	"pps": "application/vnd.ms-powerpoint",
	"ppt": "application/x-ppt",
	"pr": "application/x-pr",
	"prf": "application/pics-rules",
	"prn": "application/x-prn",
	"prt": "application/x-prt",
	"ps": "application/postscript",
	"ptn": "application/x-ptn",
	"pwz": "application/vnd.ms-powerpoint",
	"r3t": "text/vnd.rn-realtext3d",
	"ra": "audio/vnd.rn-realaudio",
	"ram": "audio/x-pn-realaudio",
	"ras": "application/x-ras",
	"rat": "application/rat-file",
	"rdf": "text/xml",
	"rec": "application/vnd.rn-recording",
	"red": "application/x-red",
	"rgb": "application/x-rgb",
	"rjs": "application/vnd.rn-realsystem-rjs",
	"rjt": "application/vnd.rn-realsystem-rjt",
	"rlc": "application/x-rlc",
	"rle": "application/x-rle",
	"rm": "application/vnd.rn-realmedia",
	"rmf": "application/vnd.adobe.rmf",
	"rmi": "audio/mid",
	"rmj": "application/vnd.rn-realsystem-rmj",
	"rmm": "audio/x-pn-realaudio",
	"rmp": "application/vnd.rn-rn_music_package",
	"rms": "application/vnd.rn-realmedia-secure",
	"rmvb": "application/vnd.rn-realmedia-vbr",
	"rmx": "application/vnd.rn-realsystem-rmx",
	"rnx": "application/vnd.rn-realplayer",
	"rp": "image/vnd.rn-realpix",
	"rpm": "audio/x-pn-realaudio-plugin",
	"rsml": "application/vnd.rn-rsml",
	"rt": "text/vnd.rn-realtext",
	"rtf": "application/x-rtf",
	"rv": "video/vnd.rn-realvideo",
	"sam": "application/x-sam",
	"sat": "application/x-sat",
	"sdp": "application/sdp",
	"sdw": "application/x-sdw",
	"sit": "application/x-stuffit",
	"slb": "application/x-slb",
	"sld": "application/x-sld",
	"slk": "drawing/x-slk",
	"smi": "application/smil",
	"smil": "application/smil",
	"smk": "application/x-smk",
	"snd": "audio/basic",
	"sol": "text/plain",
	"sor": "text/plain",
	"spc": "application/x-pkcs7-certificates",
	"spl": "application/futuresplash",
	"spp": "text/xml",
	"ssm": "application/streamingmedia",
	"sst": "application/vnd.ms-pki.certstore",
	"stl": "application/vnd.ms-pki.stl",
	"stm": "text/html",
	"sty": "application/x-sty",	
	"swf": "application/x-shockwave-flash",
	"tdf": "application/x-tdf",
	"tg4": "application/x-tg4",
	"tga": "application/x-tga",
	"tiff": "image/tiff",
	"tld": "text/xml",
	"top": "drawing/x-top",
	"torrent": "application/x-bittorrent",
	"tsd": "text/xml",
	"uin": "application/x-icq",
	"uls": "text/iuls",
	"vcf": "text/x-vcard",
	"vda": "application/x-vda",
	"vdx": "application/vnd.visio",
	"vml": "text/xml",
	"vpg": "application/x-vpeg005",
	"vsd": "application/x-vsd",
	"vss": "application/vnd.visio",
	"vst": "application/x-vst",
	"vsw": "application/vnd.visio",
	"vsx": "application/vnd.visio",
	"vtx": "application/vnd.visio",
	"vxml": "text/xml",
	"wav": "audio/wav",
	"wax": "audio/x-ms-wax",
	"wb1": "application/x-wb1",
	"wb2": "application/x-wb2",
	"wb3": "application/x-wb3",
	"wbmp": "image/vnd.wap.wbmp",
	"wiz": "application/msword",
	"wk3": "application/x-wk3",
	"wk4": "application/x-wk4",
	"wkq": "application/x-wkq",
	"wks": "application/x-wks",
	"wm": "video/x-ms-wm",
	"wma": "audio/x-ms-wma",
	"wmd": "application/x-ms-wmd",
	"wmf": "application/x-wmf",
	"wml": "text/vnd.wap.wml",
	"wmv": "video/x-ms-wmv",
	"wmx": "video/x-ms-wmx",
	"wmz": "application/x-ms-wmz",
	"wp6": "application/x-wp6",
	"wpd": "application/x-wpd",
	"wpg": "application/x-wpg",
	"wpl": "application/vnd.ms-wpl",
	"wq1": "application/x-wq1",
	"wr1": "application/x-wr1",
	"wri": "application/x-wri",
	"wrk": "application/x-wrk",
	"ws": "application/x-ws",
	"ws2": "application/x-ws",
	"wsc": "text/scriptlet",
	"wsdl": "text/xml",
	"wvx": "video/x-ms-wvx",
	"xdp": "application/vnd.adobe.xdp",
	"xdr": "text/xml",
	"xfd": "application/vnd.adobe.xfd",
	"xfdf": "application/vnd.adobe.xfdf",
	"xhtml": "text/html",
	"xls": "application/x-xls",
	"xlw": "application/x-xlw",
	"xml": "text/xml",
	"xpl": "audio/scpls",
	"xq": "text/xml",
	"xql": "text/xml",
	"xquery": "text/xml",
	"xsd": "text/xml",
	"xsl": "text/xml",
	"xslt": "text/xml",
	"xwd": "application/x-xwd",
	"x_b": "application/x-x_b",
	"sis": "application/vnd.symbian.install",
	"sisx": "application/vnd.symbian.install",
	"x_t": "application/x-x_t",
	"ipa": "application/vnd.iphone",
	"xap": "application/x-silverlight-app"
};

var WebServer = function(_Promise) {
	this.MyPromise = _Promise;
	this.config = {
		defaultPage: 'index.html',
		charset: 'utf-8',
		basePath: ''
	};
	this.fileCache = {};
};

WebServer.prototype = {
	useCache: true,
	setBasePath: function(basePath) {
		basePath = new RegExp('/$', 'g').test(basePath) ? basePath : basePath + '/';
		this.config.basePath = basePath;
	},
	setCharset: function(charset) {
		this.config.charset = charset;
	},
	setJsonGetter: function(jsonGetter) {
		this.config.jsonGetter = jsonGetter;
	},
	setDefaultPage: function(defaultPage) {
		this.config.defaultPage = defaultPage;
	},
	onErr: function(onErr) {
		this.config.onErr = onErr;
	},
	doFilter: function(param) {
		param.resolve();
	},
	doRequest: function(_url, getParam, postParam, req, res) {
		res.headerObject = {};

		if ('/' == _url) {
			_url += this.config.defaultPage;
		}

		var mimeType = mimeTypeMap['-1'],
			charset = this.config.charset,
			self = this,
			isJsonp = false,
			isJson = false;

		for (var k in mimeTypeMap) {
			if (new RegExp('\\.' + k + '$').test(_url.toLowerCase())) {
				mimeType = mimeTypeMap[k];
				if ('jsonp' == k) {
					isJsonp = true;
				} else if ('json' == k) {
					isJson = true;
				}
				break;
			}
		}
		new self.MyPromise(function(resolve, reject) {
			self.doFilter({
				url: _url,
				getParam: getParam,
				postParam: postParam,
				req: req,
				res: res,
				mimeType: mimeType,
				resolve: resolve,
				reject: reject
			});
		}).then(function() {
			res.headerObject['Content-Type'] = mimeType + ';charset=' + charset;
			res.writeHead(200, res.headerObject);
			if (isJson || isJsonp) {
				self.doJson(_url, getParam, postParam, req, res, isJsonp);
			} else {
				self.doOpenFile(_url, getParam, postParam, req, res, mimeType);
			}
		})['catch'](function(err) {
			if (304 == err) {
				res.writeHead(304);
				res.end();
				return;
			} else if (false === err) {
				return;
			}
			if (!err.myErrorCode) {
				err.myErrorCode = 403;
				err.myErrorMsg = '403: forbidden.';
			}
			self.doErr(err, req, res);
		});
	},
	doErr: function(err, req, res) {
		var onErr = this.config.onErr;
		err = err || {};
		if (onErr) {
			onErr(err, req, res);
		} else {
			console.log('doErr : ',err.stack||err);
			res.writeHead(err.myErrorCode || 500, res.headerObject);
			res.end(err.myErrorMsg || '500: server err');
		}
	},
	doJson: function(_url, getParam, postParam, req, res, isJsonp) {

		var callback = getParam.callback || 'callback',
			jsonGetter = this.config.jsonGetter,
			cookie = parseCookie(req.headers.cookie);
		self = this;

		if (jsonGetter) {
			new this.MyPromise(function(resolve, reject) {
				jsonGetter({
					url: _url,
					getParam: getParam,
					postParam: postParam,
					resolve: resolve,
					reject: reject,
					req: req,
					res: res,
					cookie: cookie
				});
			}).then(function(obj) {
				var reText = JSON.stringify(obj);
				reText = isJsonp ? callback + '(' + reText + ')' : reText;
				res.end(reText);
			})['catch'](function(err) {
				if (304 == err) {
					res.writeHead(304);
					res.end();
					return;
				}
				err = err || {};
				err.myErrorCode = err.myErrorCode || 500;
				err.myErrorMsg = err.myErrorMsg || '500: server err.';
				self.doErr(err, req, res);
			});
		} else {
			self.doErr({
				myErrorCode: 500,
				myErrorMsg: '500: server err,No jsonGetter.'
			}, req, res);
		}
	},
	doOpenFile: function(_url, getParam, postParam, req, res, mimeType) {

		var filePath = this.config.basePath + _url,
			charset = this.config.charset,
			isText = new RegExp('text|javascript').test(mimeType),
			self = this,
			lastModifyTime = req.headers["if-modified-since"];

		if (self.useCache) {
			var dataInfo = self.fileCache[_url];
			if (dataInfo) {
				if (dataInfo.time == lastModifyTime) {
					res.writeHead(304);
					res.end();
				} else {
					res.headerObject['Last-Modified'] = dataInfo.time;
					res.writeHead(200, res.headerObject);
					res.end(dataInfo.data);
				}
				return;
			}
		}

		new this.MyPromise(function(resolve, reject) {
			fs.stat(filePath, function(err, data) {
				if (err) {
					reject(err);
					return;
				}
				resolve(data);
			});
		}).then(function(data) {
			if (data.mtime.getTime() == lastModifyTime && self.useCache) {
				res.writeHead(304);
				res.end();
				return self.MyPromise.reject(304);
			}
			return data.mtime.getTime();
		}).then(function(time) {
			return new self.MyPromise(function(resolve, reject) {
				var cbk = function(err, data) {
					if (err) {
						reject(err);
						return;
					}
					resolve({
						data: data,
						time: time
					});
				};

				if (isText) {
					fs.readFile(filePath, charset, cbk);
				} else {
					fs.readFile(filePath, cbk);
				}

			});
		}).then(function(obj) {
			if (self.useCache) {
				self.fileCache[_url] = obj;
			} else {
				res.headerObject['Cache-Control'] = 'no-cache';
			}
			res.writeHead(200, res.headerObject);
			res.end(obj.data);
		})['catch'](function(err) {
			if (304 == err) {
				return;
			}
			if (34 == err.errno) {
				err.myErrorCode = 404;
				err.myErrorMsg = '404: file not found.';
			} else {
				err.myErrorCode = 500;
				err.myErrorMsg = '500: server err,file load err';
			}
			self.doErr(err, req, res);
		});
	},
	route: function(req, res) {
		req.myUrl = req.myUrl || req.url;
		var post = '',
			self = this;
		req.on('data', function(chunk) {
			post += chunk;
		});

		new this.MyPromise(function(resolve, reject) {
			req.on('end', function() {
				var urlInfo = url.parse(req.myUrl, true);
				resolve({
					url: urlInfo.pathname,
					getParam: urlInfo.query,
					postParam: querystring.parse(post),
					post: post,
					req: req,
					res: res
				});
			});
		}).then(function(params) {
			self.doRequest(params.url, params.getParam, params.postParam, params.req, params.res);
		})['catch'](function(err) {
			self.doErr({
				myErrorCode: 500,
				myErrorMsg: '500: server err,route err.',
			}, req, res);
		});
	}
};

WebServer.mimeTypeMap = mimeTypeMap;

function parseCookie(cookie) {
	cookie = cookie || '';
	var maps = cookie.split('; ');
	var map = {};
	for (var i = 0; i < maps.length; i++) {
		var kv = maps[i].split('=');
		map[kv[0]] = kv[1];
	}
	return map;
};

function proxyRequest(opt,req, res) {

	opt.method=req.method;
	opt.path=req.url;
	opt.headers=req.headers;

	var request = http.request(opt, function(response) {
		var headers = {};
		for (var k in response.headers) {
			headers[k] = response.headers[k];
		}
		headers['Access-Control-Allow-Origin'] = '*';
		res.writeHead(200, headers);
		response.on('data', function(d) {
			res.write(d)
		}).on('end', function(d) {
			res.end(d);

		});
	});
	req.pipe(request);
}

WebServer.parseCookie = parseCookie;

WebServer.proxyRequest=proxyRequest;

module.exports = WebServer;