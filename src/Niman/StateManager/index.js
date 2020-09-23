// import {
//   EventEmitter
// } from 'events';

const EventEmitter = require('events').EventEmitter

const defaultMaxChangeTimes = 10;
const defaultLag = 20;

// export default
class StateManager extends EventEmitter {

  constructor(initState = {}) {
    super();
    this.setMaxListeners(Infinity);

    this.setMaxListeners = () => {
      this.emit('$$error', {
        msg: 'can\'t setMaxListeners in stateBus.',
        type: 'forbidden',
        src: 'method:setMaxListeners'
      });
    }

    this.state = initState;
    this.maxChangeTimes = defaultMaxChangeTimes;
    this.lag = defaultLag;
    this.listenerList = [];
    this.emitQueue = [];
    this.onChangeTimeoutIndex = -1;
    this.locked = false;
    this.emitting = false;
    this.destroyed = false;
  }

  setLag(v = defaultLag) {
    this.lag = v;
  }

  setMaxChangeTimes(v = defaultMaxChangeTimes) {
    this.maxChangeTimes = v;
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    this.emit('$$destroy', this);

    this.listenerList.forEach(({
      name,
      callback
    }) => {
      this.off(name, callback);
    });

    this.listenerList = null;
    this.emitQueue = null;
    this.state = null;

    const originEmit = this.emit.bind(this);

    [
      'on',
      'off',
      'emit',
      'removeListener',
      'addListener',
      'once',
      'removeAllListeners',
      'listeners',

      'watch',
      'onChange',
      'setState',
      'getState',
      'isLocked',
      'lock',
      'unLock',
      'setMaxChangeTimes',
      'setLag',
    ].forEach(method => {
      const oldMethod = this[method].bind(this);
      this[method] = (...args) => {
        originEmit('$$error', {
          msg: `can\'t run ${method} when stateBus has destroyed.`,
          type: 'destroyed',
          src: `method:${method}`
        });

        return oldMethod(...args);
      }
    });
  }

  insertListener(name, callback) {

    const eventHandle = {
      name,
      callback,
    }

    this.listenerList.push(eventHandle);
    this.on(name, callback);

    let hasDelete = false;

    return () => {

      if (hasDelete) {
        return false;
      }

      this.listenerList = this.listenerList.filter(eventHandle => {
        if (eventHandle.id !== id) {
          return true;
        }

        this.off(eventHandle.name, eventHandle.callback);
        hasDelete = true;

        return false;
      });

      return hasDelete;
    };
  }

  lock() {
    if (this.destroyed) {
      return;
    }

    this.locked = true;
    this.emit('$$lock', this.locked);
  }

  unLock() {
    if (this.destroyed) {
      return;
    }

    this.locked = false;
    this.emit('$$lock', this.locked);
  }

  isLocked() {
    if (this.destroyed) {
      return true;
    }

    return this.locked;
  }

  isDeatroyed() {
    return this.destroyed;
  }

  setState(data) {
    if (this.destroyed) {
      return;
    }

    if (this.locked) {
      this.emit('$$error', {
        msg: 'can\'t setState iwhen locked.',
        type: 'locked',
        src: 'method:setState'
      });
      return;
    }

    if (data === undefined || data === null) {
      data = {};
    }

    const old = {
      ...this.state,
    };

    this.state = {
      ...this.state,
      ...data
    };

    const info = {
      data: {
        ...data,
      },
      state: {
        ...this.state
      },
      old,
      init: false,
    }

    this.emitByQueue('$$changeState', info);
  }

  emitByQueue(...args) {
    if (this.emitQueue.length >= this.maxChangeTimes) {
      this.emit('$$error', {
        msg: 'changeTimes over maxChangeTimes.',
        type: 'overMaxChangeTimes',
        src: 'method:setState'
      });
      return;
    }

    this.emitQueue.push(args);

    if (!this.emitting) {
      this.emitting = true;
      while (this.emitQueue && this.emitQueue.length) {
        const args = this.emitQueue.shift();
        this.emit(...args);
      }
      this.emitting = false;
    }
  }

  onChange(map = {}) {
    if (this.destroyed) {
      return;
    }

    let lastState = null;
    let allData = {};
    let onChangeTimeoutIndex = -1;

    const changeHandle = (info) => {
      if (this.destroyed) {
        return;
      }

      const {
        data,
        old,
        init,
      } = info;

      if (!lastState) {
        lastState = {
          ...old
        };
      }

      allData = {
        ...allData,
        ...data
      };

      if (this.emitQueue.length) {
        return;
      }

      const callback = () => {
        clearTimeout(onChangeTimeoutIndex);
        if (this.destroyed) {
          return;
        }

        onChangeTimeoutIndex = -1;

        const lastState2 = lastState;
        const allData2 = allData;
        const currentState = this.getState();

        lastState = null;
        allData = {};

        for (let key in map) {
          if (key !== '$$all' && allData2[key]) {
            map[key](allData2[key], lastState2[key], currentState, init, this);
          }
        }

        if (map.$$all) {
          map.$$all(allData2, lastState2, currentState, init, this);
        }
      }
      
      if(init) {
        callback();
      } else if (onChangeTimeoutIndex === -1) {
        onChangeTimeoutIndex = setTimeout(callback, this.lag);
      }
    }

    changeHandle({
      data: {
        ...this.state
      },
      state: {
        ...this.state
      },
      old: {
        ...this.state
      },
      init: true,
    });

    return this.insertListener('$$changeState', changeHandle);
  }

  watch(map) {
    if (this.destroyed) {
      return;
    }

    const changeHandle = (info) => {
      let {
        data,
        state,
        old,
        init
      } = info;

      data = {
        ...data,
      };

      state = {
        ...state,
      };

      old = {
        ...old,
      };

      for (let key in map) {
        if (key !== '$$all' && data[key]) {
          map[key](data[key], old[key], state, init, this);
        }
      }

      if (map.$$all) {
        map.$$all(data, old, state, init, this);
      }
    }

    changeHandle({
      data: {
        ...this.state
      },
      state: {
        ...this.state
      },
      old: {
        ...this.state
      },
      init: true,
    });

    return this.insertListener('$$changeState', changeHandle);
  }

  getState() {
    if (this.destroyed) {
      return {};
    }

    return {
      ...this.state
    };
  }

  off(...args) {
    return this.removeListener(...args);
  }
}

///////////////////////////////////////////////////

const stateManager = new StateManager();


stateManager.watch({
  $$all(data, old, state, init) {
    console.log('watch：$$all ', data, old, state, init);
  },
  省(data, old, state, init) {
    if (!data) {
      stateManager.setState({
        市: null
      });
    } else if (data === '辽宁') {
      stateManager.setState({
        市: '沈阳'
      });
    } else if (data === '浙江') {
      stateManager.setState({
        市: '杭州'
      });
    }
  },
  市(data, old, state, init) {
    if (!data) {
      stateManager.setState({
        区: null
      });
    } else if (data === '沈阳') {
      stateManager.setState({
        区: '浑南'
      });
    } else if (data === '杭州') {
      stateManager.setState({
        区: '滨江'
      });
    }

  },
  区(data, old, state, init) {
    if (!data) {
      stateManager.setState({
        公司: null
      });
    } else if (data === '浑南') {
      stateManager.setState({
        公司: '东软'
      });
    } else if (data === '滨江') {
      stateManager.setState({
        公司: '网易'
      });
    }
  }
});

stateManager.onChange({
  $$all(data, old, state, init) {
    if (!init) {
      console.log('change：$$all  ', data, old, state);
    } else {
      console.log('init ', data, old, state);
    }
  },
  公司(data, old, state, init) {
    console.log('change：公司  ', data, old, state, init);
  }
});

stateManager.setState({
  省: null
});

setTimeout(() => {
  stateManager.setState({
    省: '浙江'
  });
  stateManager.setState({
    省: '辽宁'
  });
},20);

setTimeout(() => {
  stateManager.setState({
    省: '辽宁'
  });
  stateManager.setState({
    省: '浙江'
  });
}, 50);
