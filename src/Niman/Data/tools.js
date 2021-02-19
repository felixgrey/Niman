function isNvl(v) {
  return v === undefined || v === null;
};

function isEmpty(v) {
  return isNvl(v) || `${v}` === '';
};

function isBlank(v) {
  return isEmpty(v) || `${v}`.trim() === '';
}

function isNoNum(v) {
  return isBlank(v) || isNaN(+v);
}

function _createGetterSetter(inputType) {
  let getValue = (item, key) => {
    return item[key];
  }

  let setValue = (item, key, value) => {
    item[key] = value;
    return item;
  }

  if (inputType === Map) {
    getValue = (item, key) => {
      return item.get(key);
    }

    setValue = (item, key, value) => {
      item.set(key, value);
      return item;
    }

  }

  return {
    getValue,
    setValue,
  }
}

function createDecodeMap(list = [], extend = {}) {
  const {
    baseField = 'label',
      valueField = null,
      inputType = Array,
      outputType = Object,
  } = extend;

  const {
    getValue,
    setValue,
  } = _createGetterSetter(outputType);

  let newBlankOutput = () => ({});
  if (outputType === Map) {
    newBlankOutput = () => {
      return new Map();
    }
  }

  if (inputType === Set) {
    list = Array.from(list.values())
  }

  if (!isBlank(valueField)) {
    return list.reduce(function(a, b) {
      // b[baseField]
      const bField = getValue(b, baseField);
      // b[valueField]  
      const bValue = getValue(b, valueField);

      return setValue(a, bField, bValue)

      // a[b[baseField]] = b[valueField];
      // return a;
    }, newBlankOutput());
  }

  return list.reduce(function(a, b) {
    return setValue(a, getValue(b, baseField), b);

    // a[b[baseField]] = b;
    // return a;
  }, newBlankOutput());
}

function treeToList(tree = {}, info = {}) {
  const {
    baseField = 'id',
      childrenField = 'children',
      parentField = 'parent',
      showEmpty = false,
      inputType = Object,
      outputType = Array,
  } = info;

  const {
    getValue,
    setValue
  } = _createGetterSetter(inputType, outputType);

  const list = [];

  const trace = (item, parentItem = null) => {
    if (parentItem !== null) {
      setValue(item, parentField, getValue(parentItem, baseField));
    }

    list.push(item);

    if (!Array.isArray(item[childrenField])) {
      return;
    }

    if (!item[childrenField].length && !showEmpty) {
      return;
    }

    item[childrenField].forEach(item2 => {
      trace(item2, item);
    });
  }

  trace(tree);

  if (outputType === Set) {
    return new Set(list);
  }

  return list;
}

function treeToMap(tree = {}, info = {}) {
  return createDecodeMap(treeToList(tree, info), info);
}

function getDeepValue(data, path = '', defValue) {
  if (isNvl(data)) {
    return defValue;
  }

  if (typeof path === 'string') {
    path = path.replace(/\[\]/g, '.').split('.')
  }

  const field = path.shift().trim()

  if (isEmpty(field)) {
    return data;
  }

  const value = data[field]

  if (isNvl(value)) {
    return defValue;
  }

  if (!path.length) {
    return value;
  }

  if (typeof value !== 'object' && path.length) {
    return defValue
  }

  return getDeepValue(value, path, defValue)
}

const NumberFormat = {
  percent(number, extendParam = {}) {
    const {
      fixed = 2,
        forceFixed = false,
        decimal = true,
        noSymbol = false,
        noZero = false,
        noSign = true,
        blank = '',
    } = extendParam;

    const percentSymbol = noSymbol ? '' : '%';

    if (isNvl(number) || isNaN(+number)) {
      return blank;
    }

    number = Number(number * (decimal ? 100 : 1)).toFixed(fixed);
    if (!forceFixed) {
      number = number.replace(/(\.\d*?)[0]*$/g, (a, b) => b.replace(/\.$/g, ''));
    }

    if (noZero) {
      number = number.replace(/^0\./g, '.')
    }

    if (noSign && parseFloat(number) === 0) {
      number = number.replace(/^\-|^\+/g, '');
    }

    return number + percentSymbol;
  },
  thsepar(number, extendParam = {}) {
    const {
      fixed = 2,
        forceFixed = false,
        noZero = false,
        noSign = true,
        blank = '',
    } = extendParam;

    if (isNvl(number) || isNaN(+number)) {
      return blank;
    }

    let number2 = parseInt(number);
    const decimal = number - number2;

    if (isNaN(number2) || isNaN(decimal)) {
      return blank;
    }

    number2 = Array.from(`${number2}`)
      .reverse()
      .map((c, index) => (index % 3 === 0 ? `${c},` : c))
      .reverse()
      .join('')
      .replace(/,$/g, '');

    if (decimal) {
      number2 += Number(decimal).toFixed(fixed).replace(/^0\.|^\-0\./g, '.');
    }

    if (!forceFixed) {
      number2 = number2.replace(/(\.\d*?)[0]*$/g, (a, b) => b.replace(/\.$/g, ''));
    }

    if (forceFixed && !decimal) {
      number2 = number2 + (Number(0).toFixed(fixed).replace('0.', '.'));
    }

    if (noZero) {
      number2 = number2.replace(/^0\./g, '.');
    }

    if (noSign && parseFloat(number2) === 0) {
      number2 = number2.replace(/^\-|^\+/g, '');
    }

    return number2;
  }
}

export {
  isNvl,
  isEmpty,
  isBlank,
  isNoNum,
  createDecodeMap,
  treeToList,
  treeToMap,
  getDeepValue,
  NumberFormat,
}
