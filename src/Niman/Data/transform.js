const splitStr = (str = '', splitor = '') => {
  return `${str}`.trim().split(splitor).map(a => a.trim());
}

const getTrue = () => true;

export default

function transform(source = [], info = {}) {

  let {
    baseField = 'x',
      mapRule = [],
      mapMarker = '=>',
  } = info;

  const itemMap = new Map();
  const calcFieldMap = new Map();
  const createCalcFieldRender = function(rule) {
    const [fromField, toField = fromField] = splitStr(rule, mapMarker);

    if (/^calc\((.)*\)$/g.test(toField)) {
      let [
        rule,
        expression = null,
        paramName = transform.recordName
      ] = toField.replace(/^calc\(|\)$/g, "").split(',');

      const checkRecord = expression === null ? getTrue : Function(paramName, `return (${expression});`);

      function getMixedField(record) {
        if (!checkRecord(record)) {
          return null;
        }

        const templates = splitStr(rule, '+');
        let str = [];
        for (let _char of templates) {
          if (/^'(.)+'$|^"(.)+"$/g.test(_char)) {
            str.push(_char.replace(/"|'/g, ''));
          } else {
            str.push(record[_char]);
          }
        }

        return str.join('');
      }

      return {
        fromField,
        calc: true,
        getMixedField
      }
    }

    return {
      fromField,
      calc: false,
      getMixedField() {
        return toField;
      },
    };
  }

  let [newBaseField, baseFieldRule = newBaseField] = splitStr(baseField, ':');

  const baseCalcField = createCalcFieldRender(baseFieldRule);

  const getItem = (record) => {
    const calc = baseCalcField.calc;
    const myBaseField = baseCalcField.getMixedField(record);
    const baseValue = calc ? myBaseField : record[baseCalcField.fromField];

    let item = itemMap.get(baseValue);

    if (!item) {
      item = {
        [newBaseField]: baseValue
      };

      itemMap.set(baseValue, item);
    }

    return item;
  }

  mapRule = [].concat(mapRule);

  const expressionList = mapRule.map(a => null);

  const setCalcFieldValue = (rule, fieldValue) => {
    let set = calcFieldMap.get(rule);
    if (!set) {
      set = new Set();
      calcFieldMap.set(rule, set);
    }

    set.add(fieldValue);

    return set;
  }

  mapRule = mapRule.map(rule => {

    const {
      getMixedField,
      fromField
    } = createCalcFieldRender(rule);

    return (record) => {

      const item = getItem(record);
      const mixedField = getMixedField(record);

      if (mixedField === null) {
        return;
      }

      setCalcFieldValue(rule, mixedField);
      item[mixedField] = record[fromField];
    }
  });

  mapRule.forEach(a => source.forEach(record => a(record)));

  const calcFieldsArr = [];
  const calcFields = Array.from(calcFieldMap.keys()).reduce((map, key) => {
    map[key] = Array.from(calcFieldMap.get(key).values());
    calcFieldsArr.push(map[key]);
    return map;
  }, {});

  calcFields.default = calcFieldsArr.flat();

  return {
    transformedData: Array.from(itemMap.values()),
    calcFields,
  };
}

transform.recordName = 'record';
