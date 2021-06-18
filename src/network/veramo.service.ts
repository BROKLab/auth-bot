import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Core interfaces
import { IDataStore, IDIDManager, IKeyManager, IResolver, TAgent, TKeyType, VerifiableCredential } from '@veramo/core';
import { ICredentialIssuer } from '@veramo/credential-w3c';
// Storage plugin using TypeOrm
import { IDataStoreORM } from '@veramo/data-store';
// TypeORM is installed with `@veramo/data-store`
import { Connection } from 'typeorm';
import { getDbConnection, initAgent } from '../auth/veramo.utils';

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

  async issueCredential(data: Record<string, any>, subjectDidId: string) {
    const vc = await this.agent.createVerifiableCredential({
      proofFormat: 'jwt',
      save: true,
      credential: {
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

  async verifyVC(jwt: string) {
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
}
