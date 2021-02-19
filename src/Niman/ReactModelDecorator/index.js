import React from 'react';

import Relation from '../StateProxy/Relation.js';
import StateProxy from '../StateProxy/index.js';
import Ajax from '../Ajax/index.js';

import * as utils from '../Utilities/index.js';

import {
  createModel,
  useModel
} from '../moduleModel/index.js';

StateProxy.onError = function(id, info) {
  utils.errorLog('stateProxyError', info);
}

Relation.onError = function(id, info) {
  utils.errorLog('relationError', info);
}

Ajax.onError = function(id, info) {
  utils.errorLog('ajaxError', info);
}

// 快捷访问
React.Ajax = React.Component.Ajax = React.Component.prototype.Ajax = Ajax;
React.StateProxy = React.Component.StateProxy = React.Component.prototype.StateProxy = StateProxy;
React.utils = React.Component.utils = React.Component.prototype.utils = utils;
React.getModel = React.Component.getModel = React.Component.prototype.getModel = StateProxy.getInstance;

// Promise风格setState
React.Component.prototype.asyncSetState = function(state) {
  utils.callbackToPromise(this.setState.bind(this), state);
}

const doNone = Function.prototype;

function createDecorator(methodName) {

  const modelMethod = methodName === 'createModel' ? createModel : useModel;

  return React[methodName] = React.Component[methodName] = function(param) {

    return function(ComponentClass) {
      const {
        onModelChange,
        initView,
        destroyView,
      } = modelMethod(param);

      const fn = ComponentClass.prototype;
      const componentWillMount = fn.componentWillMount || doNone;
      const componentWillUnmount = fn.componentWillUnmount || doNone;

      fn.componentWillMount = function() {
        initView(this);

        onModelChange(this, (state) => {
          if (state === null) {
            this.forceUpdate();
          } else {
            this.setState(state);
          }
        });

        componentWillMount.bind(this)();
      }

      fn.componentWillUnmount = function() {
        destroyView(this);
        componentWillUnmount.bind(this)();
      }

    }
  }
}

createDecorator('createModel');
createDecorator('useModel');
