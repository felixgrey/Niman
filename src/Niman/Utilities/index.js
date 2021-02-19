import deepClone from './clone.js';

const none = Function.prototype;

let errorLog = none;
let devLog = none;
let debugLog = none;

if (process.env.NODE_ENV === 'development') {
  errorLog = console.error;
  devLog = console.log;
}

if (process.env.DEBUG) {
  debugLog = console.log;
}

function delay(time) {
  return new Promise(r => {
    setTimeout(() => r(time), time);
  });
}

function callbackToPromise(method, ...args) {
  return new Promise(resolve => {
    let result;
    args.push((...subArgs) => {
      resolve({
        args: subArgs,
        result
      });
    });
    result = method(...args);
  });
}

export {
  errorLog,
  devLog,
  debugLog,
  deepClone,
  delay,
  callbackToPromise
}
