# Niman
定位：按需取用，灵活组合，移动优先的Js工具包。

##名称由来
Niman是《星球大战》中七种光剑格斗风格中的第六种，是一种将已有风格的基本招式整合到一起的风格。
相应的，Niman框架是一种将常见框架的主要功能提取成模块并整合到一起的框架。

Niman相关：http://starwars.wikia.com/wiki/Form_VI:_Niman

扩展功能模块放在JarKai文件夹内，在《星球大战》中Jar'Kai通常指的是双持光剑版的Niman。

Jar'Kai相关：http://starwars.wikia.com/wiki/Jar%27Kai

##版本：0.1 

0.2版将采用全新的开发工具和软件结构，并且不再支持旧浏览器。
0.2版开发项目：https://github.com/felixgrey/NimanLib

##包含模块

###Niman.js
js模块加载器，支持CommonJS规范，支持插件。

###NDomQuery.js
类似JQuery的DOM检索模块，包含了最基本的DOM检索和操作API

###NViewModel.js
一个迷你型的ViewModel框架。

###NEvents.js
事件管理模块，包含DOM事件的监听、触发以及对触屏事件的优化和自定义事件的支持。

###Dragger.js
DOM拖拽功能，支持惯性拖拽，支持旧浏览器，依赖NEvents.js。

###Gesture.js
手势指令，包括上下左右滑动，长按事件，依赖NEvents.js。

###Scroll.js
模拟Scroll模块，功能类似iScroll，并且还包含分页加载数据功能，依赖Dragger.js。

###NAjax.js
Ajax模块，支持Ajax和JSONP请求，若浏览器支持Promise规范，则返回Promise对象。

###NCookies.js
Cookies读写工具。

###NPromise.js
Promise规范实现，兼容Chrome内置的Promise实现。

###NRouter.js
提供单页面应用路由功能。

###NUtils.js
常用工具包

###插件
CSS.js：模块加载器可以加载CSS文件。

Text.js：模块加载器可以加载文本。

NCombination.js：整合模块，自动识别已经加载的相关功能和模块，并整合强化。

###SimplePackage.js
基于Nodejs的打包工具，打包和压缩模板、js、css文件。
依赖uglify-js、clean-css模块。










