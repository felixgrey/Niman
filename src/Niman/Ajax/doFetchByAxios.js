import axios from 'axios';
import AjaxInterface from './AjaxInterface';

const axiosTimeout = 60 * 60 * 1000;

const ABORT_REQUEST = `$$abort_${Date.now()}`;

export default function doFetch(info) {
  let { baseURL, url, method, beforeRequest, afterResponse, extInfo, data, setStopCallback } = info;

  if (method !== 'post') {
    url = AjaxInterface.paramToQuery(url, data);
  }

  if (extInfo.query) {
    url = AjaxInterface.paramToQuery(url, extInfo.query);
  }

  const stopManager = axios.CancelToken.source();

  let axiosConfig = {
    method,
    headers: {
      // "accept": 'application/json',
      // "Accept-Encoding": 'gzip, deflate',
      // "Accept-Language": 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
      // "Cache-Control": 'no-cache',
      // "Connection": 'keep-alive',
      // "Content-Type": 'application/json',
      // "Pragma": 'no-cache',
    },
    baseURL,
    url,
    data,
    timeout: axiosTimeout,
    cancelToken: stopManager.token,
  };

  setStopCallback(() => {
    stopManager.cancel(ABORT_REQUEST);
  });

  return axios(beforeRequest(axiosConfig)).catch(e => {
    if (e.message === ABORT_REQUEST) {
      return null;
    }

    return Promise.reject(e);
  });
}
