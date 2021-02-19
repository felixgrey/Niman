import * as utils from '../Utilities/index.js';

let id = 1;

export default class Relation {
  constructor(stateProxy, ajax, config = {}) {
    this.id = id++;
    this.stateProxy = stateProxy;
    this.ajax = ajax;
    this.config = config;
    this.fetching = {};
    this.destroyed = false;
    this.init();
  }

  checkLocked(fields) {
    if (this.stateProxy.$isLocked(fields)) {
      Relation.onError(this.id, {
        type: 'locked',
        args: [fields]
      });
      return true;
    }

    return false;
  }

  getParam(allRelation, changeInfo, state) {
    const param = {};
    let isChanged = false;

    for (let field of allRelation) {
      param[field] = state[field];

      if (!changeInfo.hasOwnProperty(field)) {
        continue;
      }

      const {
        old,
        value,
      } = changeInfo[field];

      if (old === value) {
        continue;
      }

      isChanged = true;
    }

    return {
      param,
      isChanged,
    };
  }

  checkEmpty(field, param, dependence, empty) {
    for (let dep of dependence) {
      if (!param.hasOwnProperty(dep)) {
        continue;
      }

      const value = param[dep];
      if (value === null || value === undefined) {
        this.stateProxy[field] = empty;
        return true;
      }
    }

    return false;
  }

  init() {

    const checkList = [];

    for (let field in this.config) {
      let {
        fetcher = null,
          dependence = [],
          filter = [],
          empty = null,
          auto = true,
      } = this.config[field];

      if (fetcher === null) {
        continue;
      }

      dependence = [].concat(dependence);
      filter = [].concat(filter);

      const allRelation = dependence.concat(filter);
      const allAboutFields = [field].concat(allRelation);

      const checkRelation = (changeInfo, state) => {

        if (this.checkLocked(allAboutFields)) {
          return;
        }

        const {
          param,
          isChanged,
        } = this.getParam(allRelation, changeInfo, state);

        if (!isChanged) {
          return;
        }

        if (this.checkEmpty(field, param, dependence, empty)) {
          return;
        }

        this.stateProxy.$lock(allAboutFields);

        const next = this.ajax[fetcher](param);

        this.fetching[field] = next.stop;

        next.then(data => {
          this.stateProxy.$unlock(allAboutFields);
          // utils.debugLog(changeInfo, data);
          this.stateProxy[field] = data;
        }).catch(e => {
          this.stateProxy.$unlock(allAboutFields);
        }).finally(_ => {
          delete this.fetching[field];
        });
      };

      if (auto) {
        const info = allRelation.reduce((info, field) => {
          info[field] = {
            old: undefined,
            value: this.stateProxy[field],
          };
          return info;
        }, {});
        checkRelation(info, this.stateProxy);
      }

      checkList.push(checkRelation);
    }

    this.off = this.stateProxy.$onChange((changeInfo, state) => {
      if (changeInfo.$init) {
        return;
      }
      checkList.forEach(callback => callback(changeInfo, state));
    });

  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    Object.values(this.fetching).forEach(stop => stop());
    this.fetching = null;

    this.off();
    this.off = null;

    this.stateProxy = null;
    this.ajax = null;
    this.config = null;
  }
}

Relation.onError = Function.prototype;
