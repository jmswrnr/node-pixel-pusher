import * as dgram from 'dgram';

export default interface SocketDeviceData {
  macAddress: string;
  ipAddress: string;
  deviceType: number;
  protocolVrsn: number;
  vendorID: number;
  productID: number;
  hardwareRev: number;
  softwareRev: number;
  linkSpeed: number;
}
