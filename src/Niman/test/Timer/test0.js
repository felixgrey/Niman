const TimerModule = require('../../Timer/index.js');

const {
  destroyAll,
  Timer
} = TimerModule;

// console.log(TimerModule);

let count0 = 0;
const maxCount0 = 3;
let lastTime = 0;

const timer0 = new Timer({
  onPlay: () => {
    console.log('start play!');
    lastTime = new Date().getTime();
  },
  onStop: () => {
    console.log('stop play!');
  },
  onDestroy: () => {
    console.log('timer0 destroyed');
  },
  onPulse: () => {
    count0++;
    const now = new Date().getTime();
    const time = now - lastTime;
    lastTime = now;
    console.log('计数 ', count0, time);
    if (count0 > maxCount0) {
      timer0.stop();
      
      setTimeout(() => {
        timer0.destroy();
        timer0.play();
        timer0.stop();
      }, 1000);
    }
  },
  time: '1s',
});

timer0.play();

const timer1 = new Timer({
  onPulse: () => {
    console.log(new Date());
  },
  onDestroy: () => {
    console.log('timer1 destroyed');
  },
  time: '100ms',
}).play();


setTimeout(() => {
  destroyAll(true);
  new Timer();
}, 10 * 1000);