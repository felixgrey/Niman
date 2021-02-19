import {
  newProxy,
  syncFields,
} from './Watchable.js';

const nowTime = Date.now();
const statePath = `__$$path_${nowTime}__`;
const pureState = `__$$pure_${nowTime}__`;

const proxyMethods = [
  'onChange', 'watch', 'destroy',
  'lock', 'unlock', 'lockAll', 'unlockAll', 'isLocked',
  'syncFields', 'forceUpdate',
];

export function getProxyMethods() {
  return [].concat(proxyMethods);
}
const doNone = Function.prototype;
let id = 1;

export default class StateProxy {
  constructor(state = {}, config = {}) {
    const {
      lagTime = 20,
        returnState = true,
        runInit = true,
        onDestroy = doNone,
        onGet = doNone,
        maxChanging = 10,
    } = config;

    this.lagTime = lagTime;
    this.runInit = runInit;
    this.onGet = onGet;
    this.onDestroy = onDestroy;
    this.maxChanging = maxChanging;

    this.id = id++;
    this.changing = 0;
    this[statePath] = '$$root';
    this.originState = state;
    this.createProxy(this, 'state', state);
    this.destroyed = false;

    this.locked = {};

    this.onChangeSet = new Set();
    this.watchSet = new Set();

    if (returnState) {
      return this.state;
    }

    return this;
  }

  syncFields() {
    syncFields(this.state);
    this.forceUpdate();
  }

  addCallback(method, path, callback) {
    if (callback === undefined) {
      callback = path;
      path = null;
    }

    if (this.destroyed) {
      StateProxy.onError(this.id, {
        type: 'invokeMethod',
        method,
        args: [path, callback]
      });
      return;
    }

    if (path !== null) {
      path = [].concat(path);

      let oldCallback = callback;

      callback = (info, state) => {
        const history = [].concat(info.$history).reverse();

        for (let change of history) {
          if (path.includes(change.path) && change.value !== change.old) {
            return oldCallback(info, state);
          }
        }

        if (info.$init) {
          oldCallback(info, state);
        }
      };
    }

    if (this.runInit) {
      callback({
          $init: true,
          $force: false,
          $history: [],
        },
        this.state
      );
    }

    const set = method === 'onChange' ? this.onChangeSet : this.watchSet;
    set.add(callback);

    return () => {
      set.delete(callback);
    };
  }

  onChange(path, callback) {
    return this.addCallback('onChange', path, callback);
  }

  watch(path, callback) {
    return this.addCallback('watch', path, callback);
  }

  setLock(fields = [], flag = true) {

    if (this.destroyed) {
      StateProxy.onError(this.id, {
        type: 'invokeMethod',
        method: 'setLock',
        args: [fields, flag]
      });
      return;
    }

    fields = [].concat(fields);
    fields.forEach(field => {
      this.locked[field] = flag;
    })
  }

  lock(fields) {
    this.setLock(fields, true);
  }

  unlock(fields) {
    this.setLock(fields, false);
  }

  lockAll() {
    this.setLock(Object.keys(this.state), true);
  }

  unlockAll() {
    this.setLock(Object.keys(this.locked), false);
  }

  isLocked(fields = []) {
    fields = [].concat(fields);
    for (let field in this.locked) {
      if (this.locked[field]) {
        return true;
      }
    }
    return false;
  }

  createProxy(state, key, value) {

    const ignoreKey = (key.indexOf('$') === 0 || key.indexOf('_') === 0);
    const ignoreValue = (value === null || typeof value !== 'object' || value[statePath]);

    if (ignoreKey || ignoreValue) {
      state[key] = value;
      return value;
    }

    Reflect.defineProperty(value, statePath, {
      value: state[statePath] + '.' + key,
    });

    Object.keys(value).forEach(key => {
      value[key] = this.createProxy(value, key, value[key]);
    });
    
    const $defaultFields = {};
    
    proxyMethods.forEach(method => {
      $defaultFields[method]: null,
    })

    return (state[key] = newProxy(value, {
      $scope: this,
      $defaultFields,
      get: (state, key) => {
        if (typeof key === 'string' && key.indexOf('$') === 0) {
          const k2 = key.replace('$', '');
          if (proxyMethods.includes(k2)) {
            return this[k2].bind(this);
          }
        }

        if (this.destroyed) {
          StateProxy.onError(this.id, {
            type: 'get',
            args: [key, state]
          });
          return state[key];
        }

        if (key === pureState) {
          return state;
        }

        this.onGet(key, state[key]);
        return state[key];
      },
      set: (state, key, value) => {
        if (typeof key === 'string' && (key.indexOf('$') === 0 || key.indexOf('_') === 0)) {
          if (!proxyMethods.includes(key.replace('$', ''))) {
            state[key] = value;
          }
          return true;
        }

        if (this.destroyed) {
          state[key] = value;
          StateProxy.onError(this.id, {
            type: 'set',
            args: [key, value, state]
          });
          return true;
        }

        if (this.locked[key]) {
          StateProxy.onError(this.id, {
            type: 'locked',
            args: [key, value, state]
          });
          return true;
        }

        let oldValue = state[key];
        if (oldValue !== null && typeof oldValue === 'object' && oldValue[statePath]) {
          oldValue = oldValue[pureState];
        }

        state[key] = this.createProxy(state, key, value);

        const path = (state[statePath] + '.' + key).replace('$$root.state.', '');
        this.changing++;
        if (this.changing > this.maxChanging) {
          StateProxy.onOverMaxChangeError(this.id, {
            type: 'overMaxChanging',
            args: [this.maxChanging, this.changeInfo]
          });
          return true;
        }
        this.stateChange(path, value, oldValue);
        this.changing--;

        return true;
      },
    }));
  }

  cloneChangeInfo() {
    return JSON.parse(JSON.stringify(this.changeInfo));
  }

  forceUpdate() {
    this.changeInfo = {
      $history: [],
      $init: false,
      $force: true,
    };

    for (let callback of this.onChangeSet) {
      callback(this.cloneChangeInfo(), this.state);
    }
    for (let callback of this.watchSet) {
      callback(this.cloneChangeInfo(), this.state);
    }
    this.changeInfo = null;
  }

  stateChange(path, value, old) {
    if (this.destroyed) {
      return;
    }

    if (!this.timeoutIndex) {
      this.changeInfo = {
        $history: [],
        $init: false,
        $force: false,
      };

      this.timeoutIndex = setTimeout(() => {
        if (this.destroyed) {
          return;
        }

        for (let callback of this.onChangeSet) {
          callback(this.cloneChangeInfo(), this.state);
        }

        this.timeoutIndex = null;
        this.changeInfo = null;
      }, this.lagTime);
    }

    if (!this.changeInfo[path]) {
      this.changeInfo[path] = {
        old,
      };
    }

    this.changeInfo[path].value = value;
    this.changeInfo.$history.push({
      path,
      value,
      old,
    });

    for (let callback of this.watchSet) {
      callback(this.cloneChangeInfo(), this.state);
    }
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    clearTimeout(this.timeoutIndex);

    this.onDestroy();
    this.onDestroy = null;

    this.changeInfo = null;
    this.state = null;

    this.onChangeSet = null;
    this.watchSet = null;
    this.locked = null
  }
}

StateProxy.onError = doNone;

const instanceMap = {};

function getName(name = null) {
  return name === null ? 'default' : name;
}

StateProxy.newInstance = (state = {}) => {
  const name = getName(state.$name);
  StateProxy.destroyInstance(name);
  return instanceMap[getName(name)] = new StateProxy(state, {
    onDestroy: () => StateProxy.destroyInstance(name)
  });
};

StateProxy.getInstance = (name) => {
  return instanceMap[getName(name)] || null;
};

StateProxy.destroyInstance = (name) => {
  name = getName(name);
  if (instanceMap[name]) {
    instanceMap[name].$destroy();
    delete instanceMap[name];
    return true;
  }

  return false;
}
