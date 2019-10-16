import SocketDeviceData from './SocketDeviceData';

export default interface DeviceData extends SocketDeviceData {
  numberStrips: number;
  stripsPerPkt: number;
  pixelsPerStrip: number;
  updatePeriod: number;
  powerTotal: number;
  deltaSequence: number;
  controllerNo: number;
  groupNo: number;
  myPort: number;
  // Extra Params
  artnetUniverse?: number;
  artnetChannel?: number;
  //
  stripFlags?: number[];
  //
  pusherFlags?: number;
}
