import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Core interfaces
import { IDataStore, IDIDManager, IKeyManager, IResolver, TAgent, TKeyType, VerifiableCredential } from '@veramo/core';
import { ICredentialIssuer } from '@veramo/credential-w3c';
// Storage plugin using TypeOrm
import { IDataStoreORM } from '@veramo/data-store';
// TypeORM is installed with `@veramo/data-store`
import { Connection } from 'typeorm';
import { getDbConnection, initAgent } from './veramo.utils';

@Injectable()
export class VeramoService implements OnModuleInit, OnModuleDestroy {
  private agent: TAgent<IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver & ICredentialIssuer>;
  private dbConnection: Promise<Connection>;
  private issuer: string;
  private defaultDIDProvider = 'did:ethr:brok';
  private encrypted = true;
  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.dbConnection = getDbConnection('veramo.db.sqlite');
      this.agent = initAgent(this.dbConnection, {
        secretKey: '29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c',
      });
      this.issuer = this.configService.get<string>('ISSUER_DID');
      await this.provisionDb({
        did: this.issuer,
        kid: this.configService.get<string>('ISSUER_KID'),
        publicKeyHex: this.configService.get<string>('ISSUER_PUBLIC_KEY_HEX'),
        privateKeyHex: this.configService.get<string>('ISSUER_PRIVATE_KEY_HEX'),
        keyType: this.configService.get<string>('ISSUER_KEY_TYPE'),
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async onModuleDestroy() {
    const connection = await this.dbConnection;
    if (connection) await connection.close();
  }

  async provisionDb(keyData: { did: string; kid: string; publicKeyHex: string; privateKeyHex: string; keyType: string }) {
    return await this.agent.didManagerImport({
      services: [],
      provider: this.defaultDIDProvider,
      did: keyData.did,
      controllerKeyId: keyData.kid,
      keys: [
        {
          kid: keyData.kid,
          kms: 'local',
          type: <TKeyType>keyData.keyType,
          publicKeyHex: keyData.publicKeyHex,
          privateKeyHex: keyData.privateKeyHex,
        },
      ],
    });
  }

  async createIdentity() {
    const identity = await this.agent.didManagerCreate({
      kms: 'local',
    });
    return identity;
  }

  async listIdentities() {
    const identifiers = await this.agent.didManagerFind();
    return identifiers;
  }

  async getIssuer() {
    const issuer = await this.agent.didManagerGet({
      did: this.issuer,
    });
    return issuer;
  }

  async issueCredential(data: Record<string, any>, subjectDidId: string, type: string[]) {
    const vc = await this.agent.createVerifiableCredential({
      proofFormat: 'jwt',
      save: true,
      credential: {
        type: ['VerifiableCredential', ...type],
        credentialSubject: {
          ...data,
          id: subjectDidId,
        },
        issuer: {
          id: this.issuer,
        },
      },
    });
    return vc;
  }

  async verifyJWT(jwt: string) {
    try {
      await this.agent.handleMessage({
        raw: jwt,
      });
      return true;
    } catch (error) {
      console.log('JWT not valid => ', error);
      return false;
    }
  }

  async verifyVP(jwt: string) {
    try {
      await this.agent.handleMessage({
        raw: jwt,
      });
      return true;
    } catch (error) {
      console.log('VP not valid => ', error);
      return false;
    }
  }

  async createVerfiablePresentation(verifier: string, verifiableCredentials: VerifiableCredential[]) {
    const vs = await this.agent.createVerifiablePresentation({
      presentation: {
        holder: this.issuer,
        verifier: [verifier],
        verifiableCredential: verifiableCredentials,
      },
      proofFormat: 'jwt',
    });
    return vs;
  }

  async findCredentials(did: string) {
    const credentials = await this.agent.dataStoreORMGetVerifiableCredentials({ where: [{ column: 'subject', value: [did] }] });
    return credentials;
  }

  async decodeJWT(jwt: string, verifyOptions?: Partial<VerifyOptions>) {
    try {
      await this.verifyJWT(jwt);
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString()) as JwtPayload;
      const errors = [];
      if (verifyOptions) {
        try {
          const isVP = 'vp' in payload && payload.vp.type.includes('VerifiablePresentation');
          if (verifyOptions.requireVerifiablePresentation && !isVP) {
            throw Error('JWT is not a VerifiablePresentation, expected a JWT with vp property and VerifiablePresentation in vp.types ');
          }
          if (verifyOptions.decodeCredentials) {
            if (!Array.isArray(payload.vp.verifiableCredential)) errors.push(`JWT vp.verifiableCredential was ${typeof payload.vp.verifiableCredential}, expected Array`);
            const decodedVerifiableCredentials = await Promise.all(
              payload.vp.verifiableCredential.map(async (subJWT) => {
                try {
                  // Decode sub credential with overridden options,
                  // REVIEW Is it correct to make sure VP issuer is subject of VC?
                  const decoded = await this.decodeJWT(subJWT, {
                    ...verifyOptions,
                    decodeCredentials: false,
                    audience: undefined,
                    subject: payload.vp.iss,
                    requireVerifiablePresentation: false,
                  });
                  return decoded;
                } catch (error) {
                  errors.push(`Error decoding subcredential: ${error.message}. \nSubcredential was: \n${Buffer.from(subJWT.split('.')[1], 'base64').toString()}`);
                }
              }),
            );
            payload.vp.jwts = decodedVerifiableCredentials;
          }
        } catch (error) {
          errors.push(`JWT traited as Verifiable Presentation, error while decoding subcredential: ${error.message}`);
        }

        if (verifyOptions.audience) {
          if (typeof payload.aud === 'string') {
            if (payload.aud !== verifyOptions.audience) errors.push(`JWT audience was ${payload.aud}, expected ${verifyOptions.audience}`);
          } else if (Array.isArray(payload.aud)) {
            if (!payload.aud.includes(verifyOptions.audience)) errors.push(`JWT audience was ${payload.aud.join(' | ')}, expected one of ${verifyOptions.audience}`);
          } else {
            throw Error(`JWT .aud expected string or Array, got ${typeof payload.aud}`);
          }
        }
        if (verifyOptions.issuer) {
          if (typeof payload.iss !== 'string') throw Error(`JWT issuer expected string, got ${typeof payload.iss}`);
          if (typeof verifyOptions.issuer === 'string') {
            if (payload.iss !== verifyOptions.issuer) errors.push(`JWT issuer was ${payload.iss}, expected ${verifyOptions.issuer}`);
          } else if (Array.isArray(verifyOptions.issuer)) {
            if (!verifyOptions.issuer.includes(payload.iss)) errors.push(`JWT issuer was ${payload.iss}, expected one of ${verifyOptions.issuer.join(' | ')}`);
          } else {
            errors.push(`verifyOptions.issuer was ${typeof verifyOptions.issuer}, expected Array or string`);
          }
        }
        if (verifyOptions.subject) {
          if (payload.sub !== verifyOptions.subject) errors.push(`JWT subject was ${payload.sub}, expected ${verifyOptions.subject}`);
        }
      }
      if (errors.length > 0) throw Error(errors.join('.\n'));
      return payload;
    } catch (error) {
      console.log('Cant decode JWT => ', error.message);
      throw error;
    }
  }
}

export interface VerifyOptions {
  audience: string;
  complete: boolean;
  issuer: string | string[];
  ignoreExpiration: boolean;
  ignoreNotBefore: boolean;
  subject: string;
  decodeCredentials: boolean;
  requireVerifiablePresentation: boolean;
}

export interface JwtPayload {
  [key: string]: any;
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
}
