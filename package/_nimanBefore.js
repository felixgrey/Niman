exports.loader = "../Niman/Niman.js";

var jarkaiUrl = '../JarKai',
	NimanUrl = '../Niman',
	nimanModulesUrl = NimanUrl + "/modules",
	nimanPluginUrl = NimanUrl + "/plugin",
	outPutUrl = "../temp";

exports.output = outPutUrl + '/NimanTemp.js';

exports.modules = {
	Sizzle: "../Sizzle/sizzle.js",
};