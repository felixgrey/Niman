
var jarkaiUrl = '../JarKai',
	NimanUrl = '../Niman',
	nimanModulesUrl = NimanUrl + "/modules",
	nimanPluginUrl = NimanUrl + "/plugin",
	outPutUrl = "../single";

exports.output = outPutUrl + '/JarKaiScroll.js';

exports.outputMin =outPutUrl + '/JarKaiScroll.min.js';

exports.modules = {
    //*************框架模块*******************************//
    //事件管理器
    NEvents: nimanModulesUrl + "/NEvents.js",
    //拖拽事件
    Dragger: nimanModulesUrl + "/Dragger.js",
    //滚动条页面
    Scroll: jarkaiUrl + "/UI/Scroll.js"
};

exports.combination=true;

exports.appendString="if(typeof define === 'function'){define(function(require){return require('Scroll');});}";
