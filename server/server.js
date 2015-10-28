var http = require('http');

var WebServer = require('./WebServer');
var NPromise = require('../Niman/modules/NPromise');

var server = new http.Server();
var webServer = new WebServer(NPromise);

webServer.setBasePath(__dirname.replace('server', ''));

webServer.useCache = false;

webServer.setDefaultPage('/test/Events/index.html');

webServer.setJsonGetter(function(param) {
	
});

webServer.doFilter = function(param) {

	param.resolve();
};

server.on('request', function(req, res) {
	try {
		webServer.route(req, res);
	} catch (err) {
		res.writeHead(500);
		console.log(err);
		res.end('500: server err ,' + JSON.stringify(err));
	}
});

server.listen(3000);