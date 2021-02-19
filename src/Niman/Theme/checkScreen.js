const query = {
  'screen-small': {
    maxWidth: 1199,
  },
  'screen-xs': {
    maxWidth: 575,
  },
  'screen-sm': {
    minWidth: 576,
    maxWidth: 767,
  },
  'screen-md': {
    minWidth: 768,
    maxWidth: 991,
  },
  'screen-lg': {
    minWidth: 992,
    maxWidth: 1199,
  },
  'screen-middle': {
    minWidth: 1200,
    maxWidth: 1599,
  },
  'screen-xl': {
    minWidth: 1200,
    maxWidth: 1599,
  },
  'screen-xl-low': {
    minWidth: 1200,
    maxWidth: 1399,
  },
  'screen-xl-high': {
    minWidth: 1400,
    maxWidth: 1599,
  },
  'screen-big': {
    minWidth: 1600,
  },
  'screen-xxl': {
    minWidth: 1600,
  },
  'screen-xxl-low': {
    minWidth: 1600,
    maxWidth: 1799,
  },
  'screen-xxl-high': {
    minWidth: 1800,
    maxWidth: 1999,
  },
  'screen-xxl-pro': {
    minWidth: 2000,
  },
};

export

function watchWidth(callback, callback2, qy = query, ) {

  const qyList = Object.keys(qy).map(ak => {
    const a = qy[ak];

    a.key = ak;

    if (a.minWidth === undefined) {
      a.minWidth = 0;
    }

    if (a.maxWidth === undefined) {
      a.maxWidth = Infinity;
    }

    return a;
  });

  qyList.sort((a, b) => {
    return b.maxWidth - a.maxWidth;
  })

  let hasOff = false;
  let lastKey = null;

  const wrapCallback = () => {
    const width = document.body.clientWidth;

    callback2 && callback2(width);

    let list = [];

    for (let i = 0; i < qyList.length; i++) {
      const q = qyList[i];
      if (width <= q.maxWidth && width >= q.minWidth) {
        list.push(q);
      }
    }

    let currentKey = list.map(q => q.key).join(' ');

    if (currentKey !== lastKey) {
      lastKey = currentKey;
      callback && callback(currentKey, width, list);
    }
  }

  const off = () => {
    if (hasOff) {
      return;
    }
    hasOff = true;
    window.removeEventListener('resize', wrapCallback);
  }

  window.addEventListener('resize', wrapCallback);

  wrapCallback();

  return off;
}
