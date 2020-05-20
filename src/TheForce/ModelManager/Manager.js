import ReduxStoreLite from './ReduxStoreLite';

import {
  isNvl,
  isBlank,
  sameFun,
  udFun,
} from './../Utils';

function createConfig(config, reducer) {
  return {
    modelName: '',
    dispatcher: new ReduxStoreLite(reducer),
    prefix: 'mm:',
    maxChainLength: 10,
    ...config,
  };
}

let uid = 0;

/*
@Manager.react.context(root)
Manager.dva.create(this);

Manager.vue.create(this);
Manager.vuex.create(this);

this.$$mm
*/

class Manager {

  constructor(config) {
    this.id = 'id_' + (uid++);
    this.destroyed = false;

    this.lastState = null;
    this.chainLength = 0;

    this.actionTypes = {};
    this.offList = [];

    this.onSetAction = sameFun;

    const theReducer = (state, action) => {
      if (typeof action === 'object' && action !== null && action.refManager === this && this.actionTypes[action.type]) {
        if (this.chainLength) {
          this.chainLength--;
        }

        return onSetAction(state, action);
      }

      return state;
    }

    if (config && config.reducer) {
      this.reducer = (state, action) => {
        return theReducer(config.reducer(state, action), action);
      }
    } else {
      this.reducer = theReducer;
    }

    this.config = createConfig(config, this.reducer);
    this.dispatcher = this.config.dispatcher;

    if (!ReduxStoreLite.checkInterface(this.dispatcher)) {
      throw new Error('dispatcher interface error');
    }

    /** public */
    ReduxStoreLite.methods.forEach(funName => {
      this[funName] = (...args) => {
        if (this.destroyed) {
          return;
        }
        return this.dispatcher[funName](...args);
      }
    });

    this.dispatcher.dispatch({
      type: 'createManager',
      managerId: this.id
    });
  }

  getActionType(name, myModelName = '') {
    const actionName = name + myModelName;

    if (this.actionTypes[actionName]) {
      return this.actionTypes[actionName];
    }

    let {
      modelName,
      prefix
    } = this.config;

    if (!isBlank(myModelName)) {
      modelName = myModelName;
    }

    modelName = isBlank(modelName) ? '' : modelName + '/';
    prefix = isBlank(prefix) ? '' : prefix + ':';

    return this.actionTypes[actionName] = `${modelName}${prefix}setModel`;
  }

  /** public */
  set(name, value, modelName) {
    if (this.destroyed) {
      return;
    }

    if (this.chainLength === 0) {
      this.lastState = this.dispatcher.getState();
    }

    if (this.chainLength > this.config.maxChainLength) {
      throw new Error('over maxChainLength');
    }

    this.dispatcher.dispatch({
      type: this.getActionType(name, modelName),
      refManager: this,
      payload: {
        name,
        value,
        data: {
          [name]: value
        },
        info: {}
      }
    });
  }

  getWatchState(args) {
    const state = {
      ...this.dispatcher.getState()
    };

    const oldState = {
      ...this.lastState
    };

    const changeState = {};

    for (let name of args) {
      if (oldState[name] !== state[name]) {
        changeState[name] = state[name];
      }
    }

    return {
      state,
      oldState,
      changeState,
    }
  }

  /** public */
  watch(...args) {
    if (this.destroyed) {
      return udFun;
    }

    const callback = args.pop();

    const dispatch = this.dispatcher.dispatch.bind(dispatcher);
    const set = (...args) => {
      this.chainLength++;
      return this.set(...args);
    };

    callback({
      ...this.getWatchState(args),
      init: true,
      set,
      dispatch
    });

    const subscribeFun = () {
      if (this.destroyed) {
        return;
      }

      if (this.chainLength) {
        return;
      }

      const {
        state,
        oldState,
        changeState
      } = this.getWatchState(args);

      if (!Object.keys(changeState).length) {
        return;
      }

      const param = {
        init: false,
        state,
        oldState,
        changeState,
        set,
        dispatch
      };

      callback(param);
    }

    let offs = args.map(name => {
      return this.dispatcher.subscribe(subscribeFun);
    });

    let off = () => {
      if (this.destroyed) {
        return;
      }

      if (!offs) {
        return;
      }

      offs.forEach(a => a);
      offs = null;

      const index = this.offList.indexOf(off);
      if (index > -1) {
        this.offList.splice(index, 1);
      }
    }

    this.offList.push(off);

    return off;
  }

  /** public */
  when(...args) {
    if (this.destroyed) {
      return udFun;
    }

    const callback = args.pop();
    const names = [...args];

    args.push(param => {
      if (this.destroyed) {
        return;
      }

      const state = param.state;

      for (let name of names) {
        if (isNvl(state[name])) {
          return;
        }
      }

      callback(param);
    });

    return this.watch(args);
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.dispatcher.dispatch({
      type: 'destroyManager',
      managerId: this.id
    });

    this.destroyed = true;
    this.offList.forEach(a => a());

    this.lastState = null;
    this.actionTypes = null;
    this.offList = null;
    this.onSetAction = null;
    this.config = null;
    this.dispatcher = null;
  }
}
