import Ajax from '../Ajax/index.js';
import StateProxy from '../StateProxy/index.js';
import Relation from '../StateProxy/Relation.js';

import {
  deepClone,
} from '../Utilities/index.js';

const doNone = Function.prototype;

const modelInfoSymbol = Symbol('modelInfo');

let modelName = 'modelState';
let globalModelName = 'globalModelState';

export function setModelName(name) {
  modelName = name;
}

export function setGlobalModelName(name) {
  globalModelName = name;
}

function injectOffWatch(view, offWatchs) {
  view.watchModelState = function(...args) {
    const off = view[modelName].$watch(...args);
    offWatchs.push(off);
    return off;
  };

  view.onModelStateChange = function(...args) {
    const off = view[modelName].$onChange(...args);
    offWatchs.push(off);
    return off;
  };

}

function isNvl(v) {
  return v === undefined || v === null;
};

export function createModel(config = {}) {
  const {
    name,
    ajax = {},
    state = {},
    relation = {},
  } = config;

  return {
    onModelChange: (view, onModelChange) => {
      if (view[modelInfoSymbol]) {
        view[modelInfoSymbol].onModelChange = onModelChange;
      }
    },
    initView: (view) => {

      if (!view[modelInfoSymbol]) {
        view[modelInfoSymbol] = {
          onModelChange: doNone,
          offWatchs: [],
          defaultWatch: null,
        };
      }

      const modelInfo = view[modelInfoSymbol];

      const ajaxConfig = deepClone(ajax);

      Object.values(ajaxConfig).forEach(cfg => {
        const success = cfg.success || doNone;
        cfg.success = (data, config) => {
          const {
            $format,
            $state,
            $data,
            $modelState,
          } = config;

          if ($format !== undefined) {
            data = config.$format(data);
          }

          success(data, config);
        }
      });

      const stateConfig = Object.assign({
        $name: name
      }, deepClone(state));

      const stateProxyInstance = StateProxy.newInstance(stateConfig);
      const ajaxInstance = new Ajax(ajaxConfig);
      const relationInstance = new Relation(stateProxyInstance, ajaxInstance, deepClone(relation));

      stateProxyInstance._relation = relationInstance;
      stateProxyInstance._ajax = ajaxInstance;

      ajaxInstance.fetchMethodNames.forEach(method => {
        view[method] = ajaxInstance[method];
      });

      modelInfo.defaultWatch = stateProxyInstance.$onChange(() => (modelInfo.onModelChange(null)));

      view[modelName] = stateProxyInstance;
      view[globalModelName] = StateProxy.global;

      injectOffWatch(view, modelInfo.offWatchs);
    },
    destroyView: (view) => {
      if (!view[modelInfoSymbol]) {
        return;
      }

      const modelInfo = view[modelInfoSymbol];

      if (modelInfo.destroyed) {
        return;
      }
      modelInfo.destroyed = true;

      modelInfo.offWatchs.forEach(off => off());
      modelInfo.defaultWatchOff && modelInfo.defaultWatchOff();

      view[modelName]._ajax.$destroy();
      view[modelName]._relation.destroy();
      view[modelName].$destroy();
      view[modelName] = null;
      view[modelInfoSymbol] = null;
    }
  };
}

export function useModel(name) {
  return {
    onModelChange: (view, onModelChange) => {
      if (view[modelInfoSymbol]) {
        view[modelInfoSymbol].onModelChange = onModelChange;
      }
    },
    initView: (view) => {

      if (!view[modelInfoSymbol]) {
        view[modelInfoSymbol] = {
          onModelChange: doNone,
          offWatchs: [],
          defaultWatch: null,
        };
      }

      const modelInfo = view[modelInfoSymbol];

      if (modelInfo.inited) {
        return;
      }
      modelInfo.inited = true;

      view[modelName] = StateProxy.getInstance(name);
      if (view[modelName]) {
        view[modelName]._ajax.fetchMethodNames.forEach(method => {
          view[method] = view[modelName]._ajax[method];
        });
        modelInfo.defaultWatchOff = view[modelName].$onChange(() => (modelInfo.onModelChange(null)));
        injectOffWatch(view, modelInfo.offWatchs);
      }

    },
    destroyView: (view) => {
      if (!view[modelInfoSymbol]) {
        return;
      }

      const modelInfo = view[modelInfoSymbol];

      modelInfo.offWatchs.forEach(off => off());
      modelInfo.defaultWatchOff && modelInfo.defaultWatchOff();

      view[modelName] = null;
      view[modelInfoSymbol] = null;
    }
  };
}
