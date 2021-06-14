import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import CeramicClient from '@ceramicnetwork/http-client';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import KeyDidResolver from 'key-did-resolver';
import { DagJWS, DID } from 'dids';
import { OnModuleInit } from '@nestjs/common';
import { randomBytes } from '@stablelib/random';
import { getUnixTime } from 'date-fns';

const API_URL = 'https://ceramic-clay.3boxlabs.com';

@Injectable()
export class CeramicService implements OnModuleInit, OnModuleDestroy {
  private ceramic: CeramicClient;
  constructor(private readonly configService: ConfigService) {
    this.ceramic = new CeramicClient(API_URL);
  }

  async onModuleInit() {
    await this.setDIDProvider();
  }
  async onModuleDestroy() {
    await this.ceramic.close();
  }
  async setDIDProvider() {
    // const seed = randomBytes(32);
    const privateKey = this.configService.get<string>('PRIVATE_KEY').substr(2);
    const privateKeyArray = Uint8Array.from(Buffer.from(privateKey, 'hex'));
    const provider = new Ed25519Provider(privateKeyArray);
    const resolver = {
      ...KeyDidResolver.getResolver(),
      ...ThreeIdResolver.getResolver(this.ceramic),
    };
    const did = new DID({ provider, resolver });
    await this.ceramic.setDID(did);
    await this.ceramic.did.authenticate();
    console.log('Current DID', this.ceramic.did.id);
  }
  async verifyJWS(jws: string | DagJWS) {
    if (!this.ceramic.did) {
      throw Error('verifyJWS, but DID not set.');
    }
    return this.ceramic.did.verifyJWS(jws);
  }

  async issueJWS(payload: any, subject: string) {
    if (!this.ceramic.did) {
      throw Error('issueJWS, but DID not set.');
    }
    payload = { iat: getUnixTime(new Date()), subject, ...payload };
    // TODO Implement 1h 5m 20sec etc for expiresIn
    const jws = await this.ceramic.did.createJWS(payload);
    return jws;
  }
}
