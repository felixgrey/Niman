import ChinaData from './data/China.js';

let hasRegistered = false;

const MAP_NAME = 'geo:china:000000';

export function ChinaMap(config = {}) {
  
  if (!hasRegistered) {
    return {};
  }
  
  const {
    $name = MAP_NAME,
    $onClick = Function.prototype
  } = config;

  const option = {
    id: $name,
    geo: {
      map: MAP_NAME,
      layoutCenter: ['50%', '50%'], //地图位置
      label: {
        normal: {
          show: true,
          textStyle: {
            color: '#fff',
            fontSize: 12,
          },
        },
        emphasis: {
          textStyle: {
            color: '#fff',
          },
        },
      },
      itemStyle: {
        normal: {
          borderColor: '#64d5b2',
          borderWidth: 0.5,
          areaColor: '#3a75f8',
        },
        emphasis: {
          areaColor: '#00ffff',
          borderWidth: 0,
        },
      },
    }
  };
  
  return option;
}

ChinaMap.NAME = MAP_NAME;

ChinaMap.register = function(echarts) {
  if (hasRegistered) {
    return;
  }
  hasRegistered = true;
  
  
  echarts.registerMap(MAP_NAME, ChinaData);
  
}