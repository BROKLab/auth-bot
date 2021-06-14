import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getUnixTime } from 'date-fns';
import { DagJWS, DID } from 'dids';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import KeyDidResolver from 'key-did-resolver';

const API_URL = 'https://ceramic-clay.3boxlabs.com';

@Injectable()
export class DidService implements OnModuleInit {
  private did: DID;
  constructor(private readonly configService: ConfigService) {
    // const seed = randomBytes(32);
    const privateKey = this.configService.get<string>('PRIVATE_KEY').substr(2);
    const privateKeyArray = Uint8Array.from(Buffer.from(privateKey, 'hex'));
    const provider = new Ed25519Provider(privateKeyArray);
    const resolver = {
      ...KeyDidResolver.getResolver(),
    };
    this.did = new DID({ provider, resolver });
  }

  async onModuleInit() {
    await this.did.authenticate();
  }

  async verifyJWS(jws: string | DagJWS) {
    if (!this.did) {
      throw Error('verifyJWS, but DID not set.');
    }
    return this.did.verifyJWS(jws);
  }

  async issueJWS(payload: any, subject: string) {
    if (!this.did) {
      throw Error('issueJWS, but DID not set.');
    }
    payload = { iat: getUnixTime(new Date()), subject, ...payload };
    // TODO Implement 1h 5m 20sec etc for expiresIn
    const jws = await this.did.createJWS(payload);
    return jws;
  }
}
