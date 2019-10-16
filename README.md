# node-pixel-pusher

A zero-dependency Node.js Pixel Pusher library designed to achieve highest full update refresh rate.

## Usage

Example rendering using [node-canvas](https://github.com/Automattic/node-canvas)

```js
const PixelPusher = require('node-pixel-pusher');
const nodeCanvas = require('canvas');

let service = new PixelPusher.Service();
service.on('discover', device => {
  console.log('Discovered device', device.deviceData);

  const width = device.deviceData.pixelsPerStrip;
  const height = device.deviceData.numberStrips;
  const canvas = nodeCanvas.createCanvas(width, height);
  const rectWidth = Math.max(1, Math.min(16, Math.floor(width / 4)))
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  let pos = 0;
  const maxFPS = 30;

  console.log(`Starting render at ${maxFPS} FPS`);

  device.startRendering(() => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillRect(pos, 0, rectWidth, height);
    let ImageData = ctx.getImageData(0, 0, width, height);
    device.setRGBABuffer(ImageData.data);

    pos = (pos+1) % (width - rectWidth);
  }, maxFPS);

  setTimeout(() => {
    console.log('Stopping render')
    device.stopRendering();
  }, 5 * 1000);
});

```
