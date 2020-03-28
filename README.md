# node-pixel-pusher

A zero-dependency Node.js Pixel Pusher library designed for a fast full-update refresh rate.

## Simple Example

Fill with green rectangle.
Using [node-canvas](https://github.com/Automattic/node-canvas)

```js
const PixelPusher = require('node-pixel-pusher');
const nodeCanvas = require('canvas');

const MAX_FPS = 30;

const service = new PixelPusher.Service();

service.on('discover', device => {
  console.log('Discovered device', device.deviceData);

  const width = device.deviceData.pixelsPerStrip;
  const height = device.deviceData.numberStrips;
  const canvas = nodeCanvas.createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  console.log(`Starting render at ${MAX_FPS} FPS`);

  device.startRendering(() => {
    ctx.fillStyle = 'green';
    ctx.fillRect(0, 0, width, height);
    const ImageData = ctx.getImageData(0, 0, width, height);
    device.setRGBABuffer(ImageData.data);
  }, MAX_FPS);
});
```

## Animated Example

Animate horizontal scan line.
Using [node-canvas](https://github.com/Automattic/node-canvas)

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
