import * as dgram from 'dgram';
import DeviceData from './DeviceData';
import Device from './Device';
import { AddressInfo } from 'net';

import { EventEmitter } from 'events';

const LISTENER_SOCKET_PORT: number = 7331;

export declare interface Service {
  on(event: 'discover', listener: (controller: Device) => void): this;
  on(event: string, listener: Function): this;
}

export class Service extends EventEmitter {
  private socket: dgram.Socket;
  private devices: { [mac: string]: Device };

  constructor() {
    super();
    this.devices = {};
    this.socket = dgram.createSocket('udp4');
    this.socket.on('message', this.onMessage.bind(this));
    this.socket.on('listening', () => {
      const address: AddressInfo = this.socket.address() as AddressInfo;
      console.log('Socket listening for PixelPusher on udp://*:' + address.port);
    });
    this.socket.on('error', (err: Error) => {
      console.log('Error opening socket to detect PixelPusher', err);
    });
    this.socket.bind(LISTENER_SOCKET_PORT);
  }

  close() {
    this.socket.close();
  }

  onMessage(msg: Buffer, rinfo: dgram.RemoteInfo) {
    if (msg.length < 48) {
      return;
    }

    let mac: string = msg
      .slice(0, 6)
      .toString('hex')
      .match(/.{2}/g)!
      .join(':');

    if (!mac) {
      return;
    }

    let controller = this.devices[mac];
    if (controller && controller.deviceData.deviceType === 2) {
      // Already received message from this device

      let cycleTime = msg.readUInt32LE(28) / 1000;
      let delta = msg.readUInt32LE(36);

      if (delta > 5) {
        cycleTime += 5;
      } else if (delta === 0 && cycleTime > 1) {
        cycleTime -= 1;
      }

      controller.deviceData.updatePeriod = cycleTime;
      controller.deviceData.powerTotal = msg.readUInt32LE(32);
      controller.deviceData.deltaSequence = delta;

      return;
    }

    let ipAddress: string = msg
      .slice(6, 10)
      .toString('hex')
      .match(/.{2}/g)!
      .map(function(x) {
        return parseInt(x, 16);
      })
      .join('.');

    if (!ipAddress) {
      return;
    }

    let deviceType: number = msg[10];

    if (deviceType !== 2) {
      // Must be PixelPusher device type
      return;
    }

    console.log(`PixelPusher Device discovered at ${ipAddress} [${mac}]`);

    let deviceData: DeviceData = {
      macAddress: mac,
      ipAddress: ipAddress,
      deviceType: msg[10],
      protocolVrsn: msg[11],
      vendorID: msg.readUInt16LE(12),
      productID: msg.readUInt16LE(14),
      hardwareRev: msg.readUInt16LE(16),
      softwareRev: msg.readUInt16LE(18),
      linkSpeed: msg.readUInt32LE(20),

      numberStrips: msg[24],
      stripsPerPkt: msg[25],
      pixelsPerStrip: msg.readUInt16LE(26),
      updatePeriod: msg.readUInt32LE(28) / 1000, // usec -> ms
      powerTotal: msg.readUInt32LE(32),
      deltaSequence: msg.readUInt32LE(36),
      controllerNo: msg.readInt32LE(40),
      groupNo: msg.readInt32LE(44),

      myPort: 9761
    };

    if (msg.length >= 54) {
      deviceData.artnetUniverse = msg.readUInt16LE(48);
      deviceData.artnetChannel = msg.readUInt16LE(50);
      deviceData.myPort = msg.readUInt16LE(52);
    }

    if (msg.length >= 62) {
      deviceData.stripFlags = msg
        .slice(54, 62)
        .toString('hex')
        .match(/.{2}/g)!
        .map(function(x) {
          return parseInt(x, 16);
        });
    }

    if (msg.length >= 66) {
      deviceData.pusherFlags = msg.readInt32LE(62);
    }

    let newDevice: Device = new Device(deviceData);

    newDevice.sendPacket = (packet: Buffer, deviceData: DeviceData) => {
      this.socket.send(packet, 0, packet.length, deviceData.myPort, deviceData.ipAddress);
    };
    this.devices[mac] = newDevice;

    this.emit('discover', newDevice);
  }
}
