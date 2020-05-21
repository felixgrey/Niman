function isNvl(value) {
  return value === undefined || value === null;
}

function isEmpty(value) {
  return isNvl(value) || value === '';
}

function isBlank(value) {
  return isEmpty(value) || (`${value}`).trim() === '';
}

function isNoNum(value) {
  return isBlank(value) || isNaN(+value);
}

function sameFun(a) {
  return a;
}

function objFun() {
  return {};
}

function udFun() {}

function errorLog(...args) {
  global.console && global.console.error && global.console.error(...args);
}

export {
  isNvl,
  isEmpty,
  isBlank,
  isNoNum,

  sameFun,
  objFun,
  udFun,

  errorLog
}
