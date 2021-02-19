let proxyFlag = true;
export function useProxy(flag) {
  proxyFlag = flag;
}

const nowTime = Date.now();
const hasWatched = `__$$watched_${nowTime}__`;
const watchProps = `__$$watchProps_${nowTime}__`;
const watchedFields = `__$$watchedFields_${nowTime}__`;

const Proxy = global.Proxy || null;

export function syncFields(state) {
  if (!state || state instanceof Proxy || !state.hasOwnProperty(hasWatched)) {
    return state;
  }

  const {
    watchProps,
    watchedFields,
  } = state;

  const {
    $scope = state
  } = watchProps;

  for (let field in state) {
    if (watchedFields.includes(key)) {
      continue;
    }

    Object.defineProperty(state, field, {
      value: state[field],
      get: () => watchProps.bind($scope).get(state, field),
      set: (value) => watchProps.bind($scope).set(state, field, value),
      enumerable: true,
      writable: true,
    });

    watchedFields.push(field);
  }

  return state;
}

export function newProxy(value = {}, props = {}) {
  if (Proxy && (props.$useProxy || (!props.hasOwnProperty('$useProxy') && proxyFlag))) {
    return new Proxy(value, props);
  }

  if (value.hasOwnProperty(hasWatched)) {
    return syncFields(value);
  }

  Object.defineProperty(value, watchProps, {
    value: props
  });

  Object.defineProperty(value, hasWatched, {
    value: true
  });

  Object.defineProperty(value, watchedFields, {
    value: []
  });

  const $defaultFields = props.$defaultFields || {};

  for (let field in $defaultFields) {
    if (!value.hasOwnProperty(field)) {
      value[field] = $defaultFields[field];
    }
  }

  return syncFields(value);
}
