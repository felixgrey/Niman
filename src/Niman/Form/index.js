export function checkForm(form = {}, callback = Function.prototype) {
  const error = {};
  const keys = Object.keys(form);

  const checkField = (key) => {
    const checkResult = callback(key, form[key], form);
    return Promise.resolve(checkResult).then(msg => {
      return {
        field: key,
        result: msg
      };
    })
  }

  const allPromise = keys.map(key => checkField(key));
  return Promise.all(allPromise).then(arr => {
    for (let r of arr) {
      if (r.result === null || r.result === undefined) {
        continue;
      }
      error[r.field] = r.result;
    }

    return {
      pass: !Object.keys(error).length,
      error
    };
  });
}
