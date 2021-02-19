const areaTree = {
  name: '', // 行政区名
  adcode: '', // 行政区码
  center: [], // 中心点经纬度
  children: [] // 下级行政区
};

/*
  行政区码: [  // 边界
    [  // 闭合区域1
      [经度1, 纬度1], // 边界点1
      [经度2, 纬度1], // 边界点2
      ...
      [经度n, 纬度1], // 边界点n
    ],
    [  // 闭合区域2
      [经度1, 纬度1], // 边界点1
      [经度2, 纬度1], // 边界点2
      ...
      [经度n, 纬度1], // 边界点n
    ],
    ...
    [  // 闭合区域n
      [经度1, 纬度1], // 边界点1
      [经度2, 纬度1], // 边界点2
      ...
      [经度n, 纬度1], // 边界点n
    ],
  ]
*/

const coordinates = {};

export function mixCoordinates(subCoordinates = {}) {
  Object.assign(coordinates, subCoordinates);
}

function traverse(node, deep, traverseList = [], currentDeep = 0) {
  traverseList.push(node);

  if (Array.isArray(node.children) && currentDeep < deep) {
    currentDeep++;

    node.children.forEach(nd => {
      traverse(node, deep, traverseList, currentDeep);
    });
  }

  return traverseList;
}

function getBoundary(name) {
  if (!global.BMap) {
    return null;
  }

  return new Promise((resolve) => {
    global.BMap.Boundary(name, (list) => {
      if (!list) {
        resolve([]);
      }

      list = list.map(area => {
        return area.split(';').map(lonlat => {
          return lonlat.split(',').map(a => +a);
        });
      });

      resolve(list);
    });
  });
}

export async function getFeatureByTreeNode(node, deep = 1) {

  if (!node) {
    return null;
  }

  const traverseList = traverse(node, deep);

  const featureCollection = {
    type: 'FeatureCollection',
    features: [],
  };

  for (let info of traverseList) {

    const feature = {
      type: 'Feature',
      properties: {
        adcode: '',
        name: '',
        center: [],
        geometry: {
          type: 'MultiPolygon',
          coordinates: [],
        }
      }
    }

    featureCollection.features.push(feature);

    if (!coordinates[info.adcode]) {
      coordinates[info.adcode] = await getBoundary(info.name);
    }

    feature.geometry.coordinates = coordinates[info.adcode];
  }

  return featureCollection;
}

// 加载百度地图API
let _resolve;
export const bMapApiReady = new Promise((resolve) => {
  _resolve = resolve;
});

let hasSet = false;
export function setBMapAk(bmapAK, version = '3.0') {
  if (hasSet) {
    return;
  }

  hasSet = true;
  const callbackName = `_runBmapReady${Date.now()}`;
  global[callbackName] = function() {
    _resolve(global.BMap);
  };

  const {
    document,
    location
  } = global;

  const scriptDom = document.createElement('script');
  scriptDom.setAttribute('type', 'text/javascript');
  scriptDom.setAttribute('src',
    `${location.protocol}//api.map.baidu.com/api?v=${version}&ak=${bmapAK}&callback=${callbackName}`);
  document.head.appendChild(scriptDom);
}
