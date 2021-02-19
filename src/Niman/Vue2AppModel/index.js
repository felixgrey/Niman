import Ajax from '../Ajax/index.js';
import doFetch from '../Ajax/doFetchByAxios.js';
import StateProxy from '../StateProxy/index.js';

import {
  getMenuData,
  getNavMenu
} from '../NavMenu';

import 'echarts';
import ECharts from 'vue-echarts/components/ECharts.vue';

import myEcharts from '../ECharts/index.js';

import * as utilities from '../Utilities/index.js';
import * as dataTools from '../Data/index.js';
import * as formTools from '../Form/index.js';

import '../Theme/common.css';
import '../Theme/elementUI.css';

// 全局状态
const globalState = new StateProxy({
  menu: false,
  collapsed: true,
  header: true,
});

export {
  globalState
}

export default function(Vue, opt = {}) {
  
  // StateProxy.bindVue2(Vue);

  const {
    prefix = 'my-',
      router = [],
      errorPage = {},
      loginPage = '',
      useAuthority = true,
      navMenuConfig,
  } = opt;

  Vue.$$getNavMenu = (authList = null) => {

    const info = navMenuConfig || {
      baseField: 'key',
      childrenField: 'routes',
    };

    return getNavMenu(router, authList, info);
  }

  // 加载Echarts
  Vue.component(prefix + 'echarts', ECharts);

  // 常用图表
  Vue.$$classicECharts = Vue.prototype.$$classicECharts = myEcharts;

  // 全局状态和事件总线实例
  Vue.$$globalState = Vue.prototype.$$globalState = globalState;

  // 状态代理
  Vue.$$StateProxy = Vue.prototype.$$StateProxy = StateProxy;

  // 数据请求
  Vue.$$Ajax = Vue.prototype.$$Ajax = Ajax;

  // 用Axios实现数据请求
  Ajax.doFetch = doFetch;
  Ajax.onError = (err) => {
    console.error(err);
  };

  // 返回数据的结构
  Ajax.defaultConfing.getResult = res => {
    let {
      code = 0,
        msg = '',
        value = null,
        // data = null
    } = res.data || {};

    if (code !== 0) {
      console.error(msg);
    }

    return value;
  }

  Ajax.defaultConfing.baseURL = '';

  if (Ajax.baseURL === "http://localhost:8000") {
    Ajax.defaultConfing.baseURL = 'http://10.9.43.8:8080';
    // FetchManager.defaultConfing.baseURL = 'http://10.9.43.4:8080';
  }

  const tools = Object.assign({}, utilities, dataTools, formTools);

  // 工具
  for (let name in tools) {
    Vue[`$$${name}`] = Vue.prototype[`$$${name}`] = tools[name];
  }
}
