import {
  isBlank,
  sameFun,
  udFun
} from './../Utils';

export default class ReduxStoreLite {
  /** interface reducer */
  constructor(reducer = sameFun, state = {}) {
    this.reducer = reducer.bind(this);
    this.state = state;
    this.subscribeArray = [];
    this.dispatching = false;
  }

  /** interface getState */
  getState() {
    return this.state;
  }

  /** interface subscribe */
  subscribe(callback = udFun) {
    let hasOff = false;

    const off = () => {
      if (hasOff) {
        return;
      }

      if (this.dispatching) {
        new Promise(r => r()).then(off);
        return;
      }

      hasOff = true;

      const index = this.subscribeArray.indexOf(callback);
      if (index > -1) {
        arr.splice(index, 1);
      }
    };

    this.subscribeArray.push(callback);

    return off;
  }

  /** interface dispatch */
  dispatch(action) {
    this.dispatching = true;
    this.state = this.reducer(this.state, action);
    this.subscribeArray.forEach(a => a());
    this.dispatching = false;
  }
}

ReduxStoreLite.methods = ['dispatch', 'subscribe', 'getState'];

ReduxStoreLite.checkInterface(instance) {
  const funs = ReduxStoreLite.methods;
  for (let fun of funs) {
    if (typeof instance[fun] !== 'function') {
      return false;
    }
  }
  return true;
}
