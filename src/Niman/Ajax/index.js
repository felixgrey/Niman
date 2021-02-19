import Ajax from './AjaxInterface.js';
import doFetch from './doFetchByAxios.js';

// 用Axios实现数据请求
Ajax.doFetch = doFetch;
Ajax.onError = err => {
  console.error(err);
};

// 异常返回默认值
Ajax.defaultConfing.getResultOnError = a => ([]);

// 返回数据的结构
Ajax.defaultConfing.getResult = res => {
  let {
    response = 'success',
      error = null,
      ok = null,
  } = res.data || {};

  if (response !== 'success') {
    console.error({
      response,
        error,
        ok,
    });
    // alert('ajax:' + error);
    return null;
  }

  return ok;
};

Ajax.defaultConfing.baseURL = '';

// alert(Ajax.baseURL)

// if (Ajax.baseURL === 'http://localhost:3000') {
//   Ajax.defaultConfing.baseURL = 'http://10.9.43.140:8089';
//   Ajax.defaultConfing.baseURL = 'http://172.21.136.9:14271';
  // Ajax.defaultConfing.baseURL = 'https://tpaservice-gs-test-value.living-space.cn';

// }

export default Ajax;
