const none = Function.prototype;
const same = a => a;

let stopKey = 1;

const FormData = global.FormData;
const encodeURIComponent = global.encodeURIComponent || same;

function createStopHandle(stopMap) {
  const myStopKey = stopKey++;

  let hasStop = false;
  let runStop = none;
  let onStop = none;

  return (stopMap[myStopKey] = {
    setStopCallback(callback = none) {
      runStop = callback;
    },
    onStop(callback = none) {
      onStop = callback;
    },
    doStop() {
      if (!stopMap[myStopKey]) {
        return;
      }
      runStop();
      onStop();
      delete stopMap[myStopKey];
    },
  });
}

function paramToQuery(url = '', param = {}) {
  url = url.split('#');
  let query = [];
  for (const q in param) {
    const v = param[q];
    if (v !== undefined && v !== null) {
      query.push(`${q}=${encodeURIComponent(v)}`);
    }
  }
  query = (url[0].indexOf('?') === -1 ? '?' : '&') + query.join('&') + (url.length > 1 ? '#' : '');
  url.splice(1, 0, query);
  return url.join('');
}

const baseURL = (() => {
  const {
    protocol = '', hostname = '', port = ''
  } = global.location || {};
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
})();

function fetchQueue(list, callback) {
  let next = Promise.resolve();

  for (let i = 0; i < list.length; i++) {
    next = next.then(data => {
      return callback(list[i], data, i);
    });
  }

  return next;
}

let id = 1;

export default class Ajax {
  constructor(fetcherConfig) {
    this.id = id++;
    this.fetcherConfig = fetcherConfig;
    this.fetching = {};
    this.stopMap = {};
    this.destroyed = false;
    this.fetchMethodNames = [];

    for (let name in fetcherConfig) {
      if (name.indexOf('$') === 0 || name.indexOf('_') === 0) {
        continue;
      }

      this.fetchMethodNames.push(name);
      this[name] = (data, currentExtInfo = {}) => {
        return this.fetch(name, data, currentExtInfo);
      };
    }
  }

  fetchQueue(...args) {
    return fetchQueue(...args);
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    Object.values(this.stopMap).forEach(handle => handle.doStop());

    this.stopMap = null;
    this.fetching = null;
    this.fetcherConfig = null;
    this.fetchMethodNames = null;
  }

  $destroy() {
    this.destroy();
  }

  isFetching(name) {
    if (this.destroyed) {
      return false;
    }

    if (name !== undefined) {
      return this.fetching[name];
    }

    for (let theName in this.fetching) {
      if (this.fetching[theName]) {
        return true;
      }
    }

    return false;
  }

  fetch(name, data, currentExtInfo = {}) {
    if (this.destroyed) {
      const reject = Promise.reject({
        success: false,
        msg: 'Ajax has destroyed.',
      });

      reject.stop = none;

      return reject;
    }

    const myConfig = this.fetcherConfig[name];

    if (!myConfig) {
      const reject = Promise.reject({
        success: false,
        msg: 'unknown fetcher: ' + name,
      });

      reject.stop = none;

      return reject;
    }

    const {
      setStopCallback,
      onStop,
      doStop
    } = createStopHandle(this.stopMap);

    let postData = null;
    let dataType = null;

    const useFormData = data && (data.$form === true);

    if (useFormData || (data instanceof FormData)) {
      if (useFormData) {
        postData = new FormData();

        for (let key in data) {
          if (key === '$form') {
            continue;
          }

          const value = data[key];
          if (Array.isArray(value)) {
            for (let v of value) {
              postData.append(key, v);
            }
          } else {
            postData.append(key, value);
          }
        }
      } else {
        postData = data;
      }
      dataType = 'FormData';
    } else {
      try {
        postData = JSON.parse(JSON.stringify(data));
        dataType = 'JSON';
      } catch (e) {}
    }

    const postExtinfo = Object.assign({}, Ajax.defaultConfing.extInfo, myConfig.extInfo, currentExtInfo);
    const mixedConfig = Object.assign({
        extInfo: postExtinfo,
        data: postData,
        setStopCallback,
        dataType,
      },
      Ajax.defaultConfing,
      myConfig
    );

    if (!this.fetching[name]) {
      this.fetching[name] = 0;
    }

    this.fetching[name]++;

    onStop(() => {
      this.fetching[name]--;
    });

    mixedConfig.originUrl = mixedConfig.url;
    if (!mixedConfig.fullUrl) {
      mixedConfig.url = mixedConfig.baseURL + mixedConfig.url;
    }

    const getResult = mixedConfig.getResult;
    const getResultOnError = mixedConfig.getResultOnError;

    delete mixedConfig.getResult;
    delete mixedConfig.getResultOnError;

    let doFetch;

    if (mixedConfig.mock) {
      doFetch = new Promise((resolve, reject) => {
        const mock = mixedConfig.mock;

        setTimeout(() => {
          if (mock.hasOwnProperty('error')) {
            reject(mock.error);
          } else {
            if (mock.getRes) {
              resolve(mock.getRes(mixedConfig));
            } else {
              resolve(mock.res || {});
            }
          }
        }, mock.lag || 0);
      });
    } else {
      doFetch = Promise.resolve(Ajax.doFetch(mixedConfig));
    }

    const next = doFetch
      .then(res => {
        const result = getResult(res, mixedConfig);
        mixedConfig.success(result, mixedConfig);
        return result;
      })
      .catch(e => {
        Ajax.onError(this.id, e);
        return getResultOnError(e);
      })
      .finally(() => {
        doStop();
      });

    next.stop = doStop;

    return next;
  }
}

Ajax.doFetch = function(config) {
  console && console.log(config);
  return {};
};

Ajax.onError = function(id, e) {
  console && console.log(id, e);
};

Ajax.baseURL = baseURL;

Ajax.defaultConfing = {
  baseURL,
  method: 'get',
  beforeRequest: same,
  afterResponse: same,
  getResult: same,
  getResultOnError: () => null,
  extInfo: {},
  success: none,
};

Ajax.paramToQuery = paramToQuery;

Ajax.fetchQueue = fetchQueue;
