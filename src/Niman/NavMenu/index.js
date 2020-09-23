export default
function getMenuData(routes, authList = null, config = {}) {

  const {
    children = 'routes',
      dynamic = 'dynamic',
      authName = 'authName',
      authPath = 'authPath',
      id = 'path',
      root = 'root',
      leaf = 'leaf',
      sysName = 'app',
      split = '.',
  } = config;

  let allPass = false;

  if (authList === null) {
    allPass = true;
    authList = [];
  }

  routes = [].concat(routes);
  authList = [].concat(authList);

  function trace(nodes, parentNode = null) {

    return nodes.map(node => {

      if (parentNode === null) {
        node[root] = true;
        node[authPath] = sysName;
      } else {
        node[root] = false;
        node[authPath] = parentNode[authPath];
        if (node[authName] !== undefined && node[authName] !== null) {
          node[authPath] = `${parentNode[authPath]}${split}${node[authName]}`;
        }
      }

      let pass = !node[dynamic] || allPass;

      if (!pass) {
        for (let authName of authList) {
          if (authName === node[authPath]) {
            pass = true;
            break;
          }
        }
      }

      if (pass) {
        if (Array.isArray(node[children])) {
          node[children] = trace(node[children], node);
        }

        if (!Array.isArray(node[children]) || !node[children].length) {
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

//////////////////////////////

// const {
//   routes,
//   authList
// } = require('./testData');

// const a = getMenuData(routes, authList);

// console.log(JSON.stringify(a, null, 4));
