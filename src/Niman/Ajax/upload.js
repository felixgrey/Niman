export async function blobToBase64(blob) {
  let resolve$2;
  const next = new Promise(resolve => resolve$2 = resolve);

  const fileReader = new FileReader();
  fileReader.onloadend = function(evt) {
    resolve$2(fileReader.result);
  }
  fileReader.readAsDataURL(blob);

  return next;
}

export async function webUpload(base64 = false, multiple = true) {
  const upload = global.document.createElement('input');
  upload.type = 'file';
  upload.multiple = multiple;

  let resolve$2;
  const next = new Promise(resolve => resolve$2 = resolve);

  upload.onchange = function() {
    resolve$2(upload.files);
  };

  upload.click();

  let myFiles = await next;
  myFiles = Array.from(myFiles);

  if (!base64) {
    return myFiles;
  }

  return Promise.all(myFiles.map(file => blobToBase64(file)));
}

export function dataURLtoFile(dataurl, filename = 'file') {
  let arr = dataurl.split(',')
  let mime = arr[0].match(/:(.*?);/)[1]
  let suffix = mime.split('/')[1] || '';
  let bstr = atob(arr[1])
  let n = bstr.length
  let u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], `${filename}.${suffix}`, {
    type: mime
  })
}

async function urlToImg(url) {
  let resolve$2;
  const next = new Promise(resolve => resolve$2 = resolve);
  const img = new Image();
  img.onload = function() {
    resolve$2(img);
  }
  img.src = url;
  return next;
}

export async function imgUrlToDataUrl(url, mimeType = "image/jpeg") {
  const img = await urlToImg(url);

  const canvas = global.document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  return canvas.toDataURL(mimeType);
}

// 常用图片后缀
const imgReg = '\\.(' + [
    'jpg',
    'jpeg',
    'png',
    'bmp',
    'nbmp',
    'gif',
    'webp',
    'x-quicktime',
    'tiff',
  ].join('$|') +
  '$)';

// 后缀和mimeType不一致时的映射
const imgNameMap = {
  'jpg': 'jpeg'
}

/*
  折半试验逐步逼近目标尺寸
*/
function compressImgFileSize(img, targetSize = 300 * 1024, error = 0.05, maxCount = 100, $$scale = 1, $$count = 0) {
  $$count++;

  const width = img.width * $$scale;
  const height = img.height * $$scale;
  const canvas = global.document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);

  let mimeType = 'image/jpeg';
  const src = img.src;

  if (/^data:/.test(src)) {
    mimeType = src.split(',')[0].match(/:(.*?);/)[1];
  } else if (new RegExp(imgReg).test(src)) {
    src.replace(new RegExp(imgReg), (a, mime) => {
      if (imgNameMap.hasOwnProperty(mime)) {
        mime = imgNameMap[mime];
      }
      mimeType = `image/${mime}`;
    });
  }

  const dataUrl = canvas.toDataURL(mimeType);
  const file = dataURLtoFile(dataUrl);
  const size = file.size;

  const $$currentError = (size - targetSize) / targetSize;

  const result = {
    dataUrl,
    file,
    $$count,
    $$scale,
    $$currentError,
  };

  if ($$scale === 1 && size <= targetSize) {
    return result;
  }

  if (Math.abs($$currentError) <= error || $$count >= maxCount) {
    return result;
  }

  if (size > targetSize) {
    $$scale = $$scale * 0.5;
  } else {
    $$scale = $$scale * 1.5;
  }

  if ($$scale > 1) {
    return result;
  }

  return compressImgFileSize(img, targetSize, error, maxCount, $$scale, $$count);
}

export async function webCompressImg(img, ext = {}) {

  let {
    maxSize = 300 * 1024,
      base64 = true,
      error = 0.01,
      maxCount = 100,
  } = ext;

  if (typeof img === 'string') {
    img = await urlToImg(img);
  }
  const result = compressImgFileSize(img, maxSize, error, maxCount);
  
  // console.log(result)

  if (base64) {
    return result.dataUrl;
  }
  return dataURLtoFile(result.dataUrl);
}
