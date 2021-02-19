const none = Function.prototype;
const nowTime = Date.now();
const pulseEventName = `__$$pulseEvent_${nowTime}__`;
const destroyEventName = `__$$destroyEvent_${nowTime}__`;
const errorLog = (process && process.env.NODE_ENV === 'development') ? console.error : none;

const pulseSet = new Set();
const destroySet = new Set();

const INTERVAL_TIME = 20;
const intervalIndex = setInterval(() => Array.from(pulseSet.values()).forEach(c => c()), INTERVAL_TIME);

let hasDestroyedAll = false;

function destroyAll(flag = false) {
  if (hasDestroyedAll) {
    return;
  }
  Array.from(destroySet.values()).forEach(c => c());
  destroySet.clear();
  if (flag) {
    clearInterval(intervalIndex);
    hasDestroyedAll = true;
  }
}

let timerKey = 1;
class Timer {
  constructor(config = {}) {
    if (hasDestroyedAll) {
      errorLog(`\x1B[31merror: can't create Timer after all destroyed.\x1B[0m`);
      this.destroyed = true;
      return;
    }

    const {
      onPlay = none,
        onStop = none,
        onPulse = none,
        onDestroy = none,
        time = '1s',
    } = config;

    this.theKey = timerKey++;

    this.onPlay = onPlay;
    this.onStop = onStop;
    this.onPulse = onPulse;
    this.onDestroy = onDestroy;

    let numberTime = 1000;
    if (typeof time === 'number') {
      numberTime = time;
    } else if (typeof time === 'string') {
      if (/\dms$/g.test(time)) {
        numberTime = parseInt(time.replace('ms', ''));
      } else if (/\ds$/g.test(time)) {
        numberTime = parseInt(time.replace('s', '')) * 1000;
      } else if (/\dm$/g.test(time)) {
        numberTime = parseInt(time.replace('m', '')) * 1000 * 60;
      }
    }

    numberTime = numberTime > INTERVAL_TIME ? numberTime : INTERVAL_TIME;
    this.multiple = Math.round(numberTime / INTERVAL_TIME);

    destroySet.add(this.destroy);
  }

  multipleCount = 0;
  playing = false;
  destroyed = false;

  onUniPulse = () => {
    this.multipleCount++;
    this.multipleCount %= this.multiple;
    if (this.multipleCount === 0) {
      this.onPulse();
    }
  }

  playStatus(playFlag = true) {
    if (this.destroyed) {
      errorLog(`\x1B[31merror: can't set playStatus=${playFlag} after Timer@${this.theKey} destroyed.\x1B[0m`);
      return this;
    }

    if (this.playing === playFlag) {
      return this;
    }

    pulseSet.delete(this.onUniPulse);

    this.multipleCount = 0;
    this.playing = playFlag;

    if (playFlag) {
      pulseSet.add(this.onUniPulse);
      this.onPlay();
    } else {
      this.onStop();
    }

    return this;
  }

  play() {
    return this.playStatus(true);
  }

  stop() {
    return this.playStatus(false);
  }

  destroy = () => {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    pulseSet.delete(this.onUniPulse);
    destroySet.delete(this.destroy);

    this.playing = false;

    this.onDestroy();

    this.onPlay = null;
    this.onStop = null;
    this.onPulse = null;
    this.onDestroy = null;
  }
}

// export {
//   destroyAll,
// }
// export default Timer;

module.exports = {
  destroyAll,
  Timer
}
