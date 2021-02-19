import {
  treeToList,
  createDecodeMap
} from '../Data/index.js'

export

function getMenuData(routes, authList = null, config = {}) {

  const {
    sysName = 'app',
      split = '.',

      root = 'root',
      leaf = 'leaf',
      pathField = 'path',
      fullPathField = 'fullPath',
      childrenField = 'routes',
      dynamicField = 'dynamic',
      authNameField = 'authName',
      authPathField = 'authPath',
      hiddenField = 'hidden',
      keyField = 'key',
      keyTemplate = '${authPathField}-${key}',
  } = config;

  let allPass = false;

  if (authList === null) {
    allPass = true;
    authList = [];
  }

  routes = [].concat(routes);
  authList = [].concat(authList);

  function getKey(base = null, index, authPath) {
    base = base === null ? '' : base + split;
    return base + keyTemplate.replace(/\$\{authPathField\}/g, authPath).replace(/\$\{key\}/g, index + '');
  }

  function createFullPath(parentFull, myPath) {

    if (myPath.indexOf('/' === 0)) {
      return myPath;
    }

    if (myPath.indexOf('./' === 0)) {
      myPath = myPath.replace('./', '');
    }

    return parentFull + '/' + myPath;
  }

  function trace(nodes, parentNode = null) {

    return nodes.map((node, index) => {

      // index++;

      if (node[hiddenField]) {
        return null;
      }

      if (node[pathField] === undefined || node[pathField] === null) {
        node[pathField] = '';
      }

      if (parentNode === null) {
        node[root] = true;
        node[authPathField] = sysName;
        node[keyField] = getKey(sysName, index, node[authPathField]);
        node[fullPathField] = node[pathField];
        if (node[authNameField] !== undefined && node[authNameField] !== null) {
          node[authPathField] = `${sysName}${split}${node[authNameField]}`;
        }
      } else {
        node[root] = false;
        node[authPathField] = parentNode[authPathField];
        node[keyField] = getKey(parentNode[keyField], index, node[authPathField]);
        node[fullPathField] = createFullPath(parentNode[fullPathField], node[pathField]);
        if (node[authNameField] !== undefined && node[authNameField] !== null) {
          node[authPathField] = `${parentNode[authPathField]}${split}${node[authNameField]}`;
        }
      }

      let pass = !node[dynamicField] || allPass;

      if (!pass) {
        for (let authNameField of authList) {
          // console.log(authNameField === node[authPath],authNameField, node[authPath])
          if (authNameField === node[authPathField]) {
            pass = true;
            break;
          }
        }
      }

      if (pass) {
        if (Array.isArray(node[childrenField])) {
          node[childrenField] = trace(node[childrenField], node);
        }

        if (!Array.isArray(node[childrenField]) || !node[childrenField].length) {
          node[leaf] = true;
        } else {
          node[leaf] = false;
        }

        return node;
      }

      return null; // null; node;
    }).filter(node => node !== null)
  }

  return trace(routes, null);

}

export

function getNavMenu(routes, authList = null, config = {}) {
  const menuData = getMenuData(routes, authList, config);

  const list = menuData.map(menuItem => {
    return treeToList(menuItem, config);
  }).flat();

  const menuDecode = createDecodeMap(list, config);

  return {
    menuData,
    menuDecode
  }
}

//////////////////////////////

// const {
//   routes,
//   authList
// } = require('./testData');

// const a = getMenuData(routes, authList);

// console.log(JSON.stringify(a, null, 4));
