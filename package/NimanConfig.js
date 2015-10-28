exports.loader = "../temp/NimanTemp.js";



var jarkaiUrl = '../JarKai',
	NimanUrl = '../Niman',
	nimanModulesUrl = NimanUrl + "/modules",
	nimanPluginUrl = NimanUrl + "/plugin",
	outPutUrl = "../single";

exports.output = outPutUrl + '/Niman.single.js';

exports.outputMin = outPutUrl + '/Niman.single.min.js';

exports.modules = {
	//*************框架模块*******************************//
	//整合插件，整合已有模块，强化功能
	NCombinationPlugin: nimanPluginUrl + "/NCombination.js",
	//文本模板加载插件
	Text: nimanPluginUrl + '/Text.js',
	//CSS加载插件
	CSS: nimanPluginUrl + '/CSS.js',
	//Cookie工具
	NCookies: nimanModulesUrl + "/NCookies.js",
	//事件管理器
	NEvents: nimanModulesUrl + "/NEvents.js",
	//路由器
	NRouter: nimanModulesUrl + "/NRouter.js",
	//Ajax
	NAjax: nimanModulesUrl + "/NAjax.js",
	//Dom选择器
	NDomQuery: nimanModulesUrl + "/NDomQuery.js",
	//Promise规范实现
	NPromise: nimanModulesUrl + "/NPromise.js",
	//工具包
	NUtils: nimanModulesUrl + "/NUtils.js",
	//ViewModel
	NViewModel: nimanModulesUrl + "/NViewModel.js",
	//拖拽事件
	Dragger: nimanModulesUrl + "/Dragger.js",
	//手势指令
	Gesture: nimanModulesUrl + "/Gesture.js",
	//滚动条页面
	Scroll: jarkaiUrl + "/UI/Scroll.js"
};