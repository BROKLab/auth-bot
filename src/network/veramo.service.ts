import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Core interfaces
import { TKeyType, createAgent, IDIDManager, IResolver, IDataStore, IKeyManager, Agent, TAgent, VerifiableCredential } from '@veramo/core';

// Core identity manager plugin
import { MessageHandler } from '@veramo/message-handler';
import { DIDManager } from '@veramo/did-manager';
import { KeyDIDProvider, getDidKeyResolver } from '@veramo/did-provider-key';

// Core key manager plugin
import { KeyManager } from '@veramo/key-manager';

// Custom key management system for RN
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local';

// Custom resolvers
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { Resolver } from 'did-resolver';
import { getResolver as ethrDidResolver } from 'ethr-did-resolver';
import { EthrDIDProvider } from '@veramo/did-provider-ethr';

// Storage plugin using TypeOrm
import { Entities, KeyStore, DIDStore, IDataStoreORM, DataStore, DataStoreORM } from '@veramo/data-store';

// TypeORM is installed with `@veramo/data-store`
import { createConnection, Connection } from 'typeorm';
import { CredentialIssuer, ICredentialIssuer, W3cMessageHandler } from '@veramo/credential-w3c';
import { JwtMessageHandler } from '@veramo/did-jwt';

const DATABASE_FILE = 'veramo.db.sqlite';

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
      this.dbConnection = createConnection({
        type: 'sqlite',
        database: DATABASE_FILE,
        synchronize: true,
        logging: ['error', 'info', 'warn'],
        entities: Entities,
      });
      const agent = createAgent<IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver & ICredentialIssuer>({
        plugins: [
          new KeyManager({
            store: this.encrypted
              ? new KeyStore(this.dbConnection, new SecretBox('29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c'))
              : new KeyStore(this.dbConnection),
            kms: {
              local: new KeyManagementSystem(),
            },
          }),
          new DIDManager({
            store: new DIDStore(this.dbConnection),
            defaultProvider: this.defaultDIDProvider,
            providers: {
              'did:ethr:brok': new EthrDIDProvider({
                defaultKms: 'local',
                network: 'brok',
                rpcUrl: 'https://e0avzugh9j:5VOuyz9VPLenxC-zB2nvrWOlfDrRlSlcg0VZyIAvEeI@e0mvr9jrs7-e0iwsftiw5-rpc.de0-aws.kaleido.io/',
                registry: '0x28e1b9Be7aDb104ef1989821e5Cb1d6eB4294eA6',
              }),
              'did:key': new KeyDIDProvider({
                defaultKms: 'local',
              }),
            },
          }),
          new DIDResolverPlugin({
            resolver: new Resolver({
              ...getDidKeyResolver(),
              ...ethrDidResolver({
                rpcUrl: 'https://e0avzugh9j:5VOuyz9VPLenxC-zB2nvrWOlfDrRlSlcg0VZyIAvEeI@e0mvr9jrs7-e0iwsftiw5-rpc.de0-aws.kaleido.io/',
                registry: '0x28e1b9Be7aDb104ef1989821e5Cb1d6eB4294eA6',
                chainId: 7766,
                name: 'brok',
              }),
            }),
          }),
          new CredentialIssuer(),
          new MessageHandler({ messageHandlers: [new JwtMessageHandler(), new W3cMessageHandler()] }),
          new DataStore(this.dbConnection),
          new DataStoreORM(this.dbConnection),
        ],
      });
      this.agent = agent;
      this.issuer = this.configService.get<string>('ISSUER_DID');
      await this.provisionDb({
        did: this.issuer,
        kid: this.configService.get<string>('ISSUER_KID'),
        publicKeyHex: this.configService.get<string>('ISSUER_PUBLIC_KEY_HEX'),
        privateKeyHex: this.configService.get<string>('ISSUER_PRIVATE_KEY_HEX'),
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async onModuleDestroy() {
    const connection = await this.dbConnection;
    await connection.close();
  }

  async provisionDb(keyData: { did: string; kid: string; publicKeyHex: string; privateKeyHex: string }) {
    return await this.agent.didManagerImport({
      services: [],
      provider: this.defaultDIDProvider,
      did: keyData.did,
      controllerKeyId: keyData.kid,
      keys: [
        {
          kid: keyData.kid,
          kms: 'local',
          type: <TKeyType>'Ed25519',
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

  async findCredentials(did: string) {
    const credentials = await this.agent.dataStoreORMGetVerifiableCredentials({ where: [{ column: 'subject', value: [did] }] });
    return credentials;
  }
}
