import {
  NumberFormat
} from '../Data/index.js';

import {
  formatScreenSize
} from './tools.js';

export default

function createBarAndLine(config = {}) {

  let {
    source = [],
      label = '',

      xField = 'x',
      xLabel = '',
      x2Label = '',

      yLabel = '',
      y2Label = '',

      xUnit = '',
      yUnit = '',
      y2Unit = '',
      tooltipTrigger = 'axis',

      series = [],
      meta = {},
  } = config;

  if (!Array.isArray(source)) {
    return {};
  }

  let paddingTop = null,
    paddingRight = null,
    paddingBottom = null,
    paddingLeft = null,
    legendLeft = null,
    legendRight = null;

  let hasX2 = false;
  let hasY2 = false;

  let y1Data = [];
  let y2Data = [];

  if (!label.length) {
    paddingTop = 42;
  } else {
    paddingTop = 72;
  }

  const transFormedSeriesMap = {};

  const transFormedSeries = series.map((opt, i) => {
    if (opt === null || opt === undefined) {
      return null;
    }

    let {
      type = 'line',
        useX2 = false,
        useY2 = false,
        label = '',
        stack = null,
        areaStyle = null,
        valueField = `value${i}`,
        labelFormatter = null,
        tooltipFormatter = null,
        barWidth = 20,
        meta = {},
    } = opt;

    if (type === null) {
      return null;
    }

    type = type.toLowerCase();

    if (type !== 'line' && type !== 'bar') {
      return null;
    }

    if (useX2) {
      hasX2 = true;
    }

    if (useY2) {
      hasY2 = true;
    }

    const vData = source.map(record => record[valueField]);

    if (useY2) {
      y2Data = y2Data.concat(vData);
    } else {
      y1Data = y1Data.concat(vData);
    }

    let myLabelFormatter = null;

    if (labelFormatter !== null) {
      myLabelFormatter = function(params) {
        const valueUnit = useY2 ? y2Unit : yUnit;
        return labelFormatter(params, {
          series,
          transFormedSeries,
          source,
          useY2,
          xUnit,
          yUnit,
          y2Unit,
          valueUnit,
        });
      }
    }

    const isLine = (type === 'line');

    if (isLine && stack && areaStyle === null) {
      areaStyle = {};
    }

    return transFormedSeriesMap[label] = {
      type,
      name: label,
      stack,
      areaStyle,
      yAxisIndex: useY2 ? 1 : 0,
      barWidth,
      symbolSize: tooltipTrigger === 'item' ? 12 : 4,
      data: vData,
      myTooltipFormatter: tooltipFormatter,
      tooltip: {},
      $$meta: meta,
      label: {
        normal: {
          textBorderColor: 'auto',
          color: isLine ? 'auto' : '#fff',
          show: !!myLabelFormatter,
          position: isLine ? 'top' : 'inside',
          formatter: myLabelFormatter
        }
      },
    };

  }).filter(s => s !== null && s.type !== null);

  const x1Data = source.map(record => record[xField]);

  let maxX1Width = 7;
  x1Data.forEach(v => {
    const length = (v + '').length;
    if (length > maxX1Width) {
      maxX1Width = length;
    }
  });

  paddingBottom = maxX1Width * 7 + 6 + 'px';

  const numWidth = 6;
  const numOffset = 12;

  let maxY1Width = 0;
  y1Data.forEach(v => {
    v = NumberFormat.thsepar(v, {
      forceFixed: v > 10
    });

    if (v.length > maxY1Width) {
      maxY1Width = v.length;
    }
  });

  maxY1Width = maxY1Width * numWidth + numOffset;

  let left = maxY1Width;
  if (paddingLeft === null) {
    if (left < 40) {
      left = 40;
    }
  } else {
    left = paddingLeft;
  }

  let maxY2Width = 0;
  y2Data.forEach(v => {
    v = NumberFormat.thsepar(v);
    if (v.length > maxY2Width) {
      maxY2Width = v.length;
    }
  });
  maxY2Width = maxY2Width * numWidth + numOffset;

  let right = maxY2Width;
  if (paddingRight === null) {
    let labelWidth = y2Label.length * 14 + 12;
    if (right < labelWidth) {
      right = labelWidth;
    }

    labelWidth = xLabel.length * 14 + 12;
    if (right < labelWidth) {
      right = labelWidth;
    }

    if (right < 40) {
      right = 40;
    }
  } else {
    right = paddingRight;
  }

  if (legendLeft === null && paddingLeft === null) {
    legendLeft = left + yLabel.length * 14 - 24;
  } else {
    legendLeft = 140;
  }

  if (legendRight === null && paddingRight === null) {
    legendRight = right + y2Label.length * 14 - 24;
  } else {
    legendRight = 140;
  }

  left = formatScreenSize(left);
  right = formatScreenSize(right);
  legendLeft = formatScreenSize(legendLeft);
  legendRight = formatScreenSize(legendRight);

  // console.log(left,right,legendLeft,legendRight)

  let myTooltipFormatter = function(mySeries) {
    // console.log(series)

    return ([].concat(mySeries)).map((parameter) => {

      if (parameter.value === undefined || parameter.value === null) {
        return null;
      }

      const useY2 = transFormedSeries[parameter.seriesIndex].yAxisIndex === 1;
      const valueUnit = useY2 ? y2Unit : yUnit;

      if (transFormedSeriesMap[parameter.seriesName] && transFormedSeriesMap[parameter.seriesName].myTooltipFormatter) {
        return (transFormedSeriesMap[parameter.seriesName].myTooltipFormatter(parameter, {
          series,
          transFormedSeries,
          source,
          useY2,
          xUnit,
          yUnit,
          y2Unit,
          valueUnit,
        }) + '').replace(/\s+/g, ' ');
      }

      return `${parameter.marker} ${parameter.seriesName}： ${parameter.name}${xUnit}， ${parameter.value}${valueUnit}。`
        .replace(/\s+/g, ' ');
    }).filter(a => a !== null).join('<br/>')
  };

  // console.log(tooltipTrigger);

  const options = {
    $$meta: meta,
    title: {
      text: label,
      x: 'center'
    },
    grid: {
      top: paddingTop,
      bottom: paddingBottom,

      right,
      left,
    },
    legend: {
      top: label.length ? 30 : 0,
      // bottom: 0,
      show: !!source.length,
      type: 'scroll',
      left: legendLeft,
      right: legendRight,
      // textStyle: {}
    },
    tooltip: {
      trigger: tooltipTrigger,
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      },
      formatter: myTooltipFormatter
    },
    xAxis: [{
      nameTextStyle: {
        align: 'left',
        padding: [0, 0, -26, -16],
      },
      name: xLabel,
      data: x1Data,
      axisLabel: {
        interval: 0,
        rotate: 40,
        fontSize: 10,
        fontWeight: 'bolder',
      }
    }],
    yAxis: [{
      nameTextStyle: {
        align: 'left',
        padding: [0, 0, 8, -24],
      },
      name: yLabel,
      axisLabel: {
        fontSize: 12,
        fontWeight: 'bolder'
      },
      axisTick: {
        inside: true
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#57617B'
        }
      }
    }],
    series: transFormedSeries,
  };

  if (hasX2) {
    options.xAxis.push(Object.assign({
      name: x2Label,
      show: !!source.length,
    }, options.xAxis[0]));
  }

  if (hasY2) {
    const y2Op = Object.assign({}, options.yAxis[0], {
      name: y2Label,
      show: !!source.length,
      splitLine: {
        // show: true ,
        // interval: 'auto' ,
        lineStyle: {
          type: 'dashed',
        }
      },
      nameTextStyle: {
        align: 'right',
        padding: [0, -24, 8, 0],
      },
    });

    // console.log(y2Label,y2Op)

    options.yAxis.push(y2Op);
  }

  // console.log(options)

  return options;
}
