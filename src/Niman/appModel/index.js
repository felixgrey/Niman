function createFetcher(url, defaultInfo = {}) {
  const {
    beforeSend,
    afterResult,
    extendInfo,
    onError,
  } = defaultInfo;

  let info = {
    beforeSend,
    afterResult,
    extendInfo,
    onError,
  }

  let doStop = null;

  const stop = (...args) => {
    doStop(...args);
  }

  const onStop = (callback) => {
    doStop = callback;
  }

  const doFetch = (data, info = {}) => {

    info = {
      ...defaultInfo,
      ...info,
      onStop
    }

    return Promise.resolve(createFetcher.doFetch(data, info));
  }
  
  doFetch.stop = stop;

  return doFetch;
}

createFetcher.doFetch = () => {};
