import DeviceData from './DeviceData';

const SEQUENCE_DENOTATION_LENGTH = 4;
const STRIP_DENOTATION_LENGTH = 1;

const NS_PER_SEC = 1e9;
const MS_PER_NS = 1e-6;

export default class Device {
  public deviceData: DeviceData;

  public readonly stripPacketData: {
    packetIndex: number;
    dataOffset: number;
    rgbaOffset: number;
  }[];

  private packetBuffer: Buffer[];
  private packetIndex: number = 0;
  private packetSequenceNumber: number = 1;
  private packetsPerRefresh: number = 1;
  private minimumUpdatePeriod: number = 0;

  public readonly stripDataSize: number = 0;
  private renderfn: () => boolean | void = () => {};
  private shouldRender: boolean = false;

  constructor(deviceData: DeviceData) {
    this.deviceData = deviceData;

    this.packetBuffer = [];
    this.stripPacketData = [];

    this.stripDataSize = this.deviceData.pixelsPerStrip * 3;

    this.packetsPerRefresh = Math.ceil(this.deviceData.numberStrips / this.deviceData.stripsPerPkt);

    for (let p = 0; p < this.packetsPerRefresh; p++) {
      let stripOffset = this.deviceData.stripsPerPkt * p;

      let stripCount = Math.min(
        this.deviceData.stripsPerPkt,
        this.deviceData.numberStrips - stripOffset
      );

      let packetSize =
        SEQUENCE_DENOTATION_LENGTH + stripCount * (STRIP_DENOTATION_LENGTH + this.stripDataSize);

      let packet = (this.packetBuffer[p] = Buffer.alloc(packetSize));
      packet.fill(0x00);

      let pos = 4;
      let slen = stripOffset + stripCount;
      for (let s = stripOffset; s < slen; s++) {
        packet.writeUInt8(s, pos);
        // increment after writing UInt8
        pos += 1;
        this.stripPacketData.push({
          packetIndex: p,
          dataOffset: pos,
          rgbaOffset: s * this.deviceData.pixelsPerStrip * 4
        });
        // increment to skip strip data
        pos += this.stripDataSize;
      }
    }

    this.fullRefreshTick = this.fullRefreshTick.bind(this);
  }

  setRGBABuffer(data: Buffer | Uint8ClampedArray) {
    if (data.length !== this.deviceData.numberStrips * this.deviceData.pixelsPerStrip * 4) {
      console.log('Invalid buffer size');
      return;
    }

    for (let y = 0; y < this.deviceData.numberStrips; y++) {
      let meta = this.stripPacketData[y];
      let target = this.packetBuffer[meta.packetIndex];

      for (var i = 0, j = 0; i < this.stripDataSize; i += 3, j += 4) {
        target[meta.dataOffset + i] = data[meta.rgbaOffset + j];
        target[meta.dataOffset + i + 1] = data[meta.rgbaOffset + j + 1];
        target[meta.dataOffset + i + 2] = data[meta.rgbaOffset + j + 2];
      }
    }
  }

  sendPacket(packet: Buffer, deviceData: DeviceData): void {}

  fullRefreshTick() {
    let tickStartTime = process.hrtime();
    let sendPacket = true;

    if (!this.shouldRender) {
      // Stop render loop
      return;
    }

    if (this.packetIndex === 0) {
      // Request render data
      if (this.renderfn() === false) {
        sendPacket = false;
      }
    }

    if (sendPacket) {
      let packet = this.packetBuffer[this.packetIndex];
      packet.writeUInt32LE(this.packetSequenceNumber++, 0);
      this.sendPacket(packet, this.deviceData);
      this.packetIndex = (this.packetIndex + 1) % this.packetsPerRefresh;
    }

    const tickHRTime = process.hrtime(tickStartTime);
    const tickMS = (tickHRTime[0] * NS_PER_SEC + tickHRTime[1]) * MS_PER_NS;

    setTimeout(
      this.fullRefreshTick,
      Math.max(
        // Don't go below update limit
        this.minimumUpdatePeriod,
        // Skip to next frame render if we're not sending packets
        (sendPacket
          ? this.deviceData.updatePeriod
          : this.deviceData.updatePeriod * this.packetsPerRefresh) -
          // Remove time used by render/packet sending
          tickMS
      )
    );
  }

  setMaxFPS(maxFps: number) {
    this.minimumUpdatePeriod = 1000 / maxFps / this.packetsPerRefresh;
  }

  startRendering(renderfn: () => boolean | void, maxFps?: number) {
    let shouldStartRender = !this.shouldRender;

    if (maxFps) {
      this.setMaxFPS(maxFps);
    }
    this.renderfn = renderfn;

    if (shouldStartRender) {
      this.shouldRender = true;
      this.fullRefreshTick();
    }
  }

  stopRendering() {
    this.shouldRender = false;
  }
}
