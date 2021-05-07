import ThreeIdProvider from '3id-did-provider';
import CeramicClient from '@ceramicnetwork/http-client';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getUnixTime } from 'date-fns';

@Injectable()
export class AuthService {
  private ceramic: CeramicClient;
  constructor(private readonly configService: ConfigService) {
    const API_URL = 'https://ceramic-clay.3boxlabs.com';
    this.ceramic = new CeramicClient(API_URL);
    this.setDIDProvider(); // TODO Create factory that provides async threeID to service
  }

  async getDIDid() {
    return this.ceramic.did.id;
  }

  async issueJWS(payload: any) {
    payload = { iat: getUnixTime(new Date()), ...payload };
    // TODO Implement 1h 5m 20sec etc for expiresIn
    const jws = await this.ceramic.did.createJWS(payload);
    return jws;
  }

  async setDIDProvider() {
    const privateKey = this.configService.get<string>('PRIVATE_KEY').substr(2); // substr to remove 0x
    const privateKeyArray = this.toUint8Array(privateKey, 'hex');
    const threeId = await ThreeIdProvider.create({ ceramic: this.ceramic, getPermission: this.getPermission, seed: privateKeyArray });
    const provider = threeId.getDidProvider();
    this.ceramic.setDIDProvider(provider);
  }

  toUint8Array(text: string, encoding: BufferEncoding) {
    return Uint8Array.from(Buffer.from(text, encoding));
  }

  async getPermission() {
    return ['/'];
  }
}
