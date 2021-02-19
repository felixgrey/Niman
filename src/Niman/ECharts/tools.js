export function formatScreenSize(value) {
  if (typeof value === 'number' || (value + '' === (+value) + '')) {
    if (isNaN(+value)) {
      return '';
    }

    return value + 'px';
  }

  if (typeof value === 'string' && (value.includes('%') || value.includes('px'))) {
    return value;
  }

  return '';
}

export function calcLabelWidth(label = '', info = {}) {
  const {
    fontSize = 12,
      numberSize = fontSize / 2 + 1,
      spaceWidth = fontSize,
      minWidth = fontSize,
  } = info;

  if (label === undefined || label === null) {
    label = '';
  }

  const isNumber = (typeof label === 'number');

  if (isNumber) {
    label = Number(+label || 0).toFixed(2);
  }

  let labelWidth = label.length * (isNumber ? numberSize : fontSize) + spaceWidth;

  // 千分位分隔符宽度
  if (isNumber) {
    labelWidth = labelWidth + parseInt(Number(parseInt(label)).toString().length / 3) * numberSize;
  }

  return labelWidth;
}
