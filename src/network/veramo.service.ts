import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Core interfaces
import { createAgent, IDIDManager, IResolver, IDataStore, IKeyManager, Agent, TAgent } from '@veramo/core';

// Core identity manager plugin
import { DIDManager } from '@veramo/did-manager';
import { KeyDIDProvider, getDidKeyResolver } from '@veramo/did-provider-key';

// Core key manager plugin
import { KeyManager } from '@veramo/key-manager';

// Custom key management system for RN
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local';

// Custom resolvers
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { Resolver } from 'did-resolver';

// Storage plugin using TypeOrm
import { Entities, KeyStore, DIDStore, IDataStoreORM } from '@veramo/data-store';

// TypeORM is installed with `@veramo/data-store`
import { createConnection, Connection } from 'typeorm';
import { CredentialIssuer, ICredentialIssuer } from '@veramo/credential-w3c';
const DATABASE_FILE = 'veramo.db.sqlite';

@Injectable()
export class VeramoService implements OnModuleInit, OnModuleDestroy {
  private agent: TAgent<IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver & ICredentialIssuer>;
  private dbConnection: Promise<Connection>;
  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
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
          store: new KeyStore(this.dbConnection),
          kms: {
            local: new KeyManagementSystem(),
          },
        }),
        new DIDManager({
          store: new DIDStore(this.dbConnection),
          defaultProvider: 'did:key',
          providers: {
            'did:key': new KeyDIDProvider({
              defaultKms: 'local',
            }),
          },
        }),
        new DIDResolverPlugin({
          resolver: new Resolver({
            ...getDidKeyResolver(),
          }),
        }),
        new CredentialIssuer(),
      ],
    });
    this.agent = agent;
    this.provisionDb();
  }
  async onModuleDestroy() {
    const connection = await this.dbConnection;
    await connection.close();
  }

  async provisionDb() {
    // this.agent.keyManagerImport({});
  }

  async createIdentity() {
    const identity = await this.agent.didManagerCreate();
    this.agent.keyManagerCreate({
      type: 'Ed25519',
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
      did: 'did:key:z6Mkk1V84BS2VGjRyHEsC72w1FBpjLTtUN2bdqiHzpuxr9X8',
    });
    console.log('issuer', issuer);
  }

  async issueCredential(data: Record<string, any>, subjectDidId: string) {
    const jwt = await this.agent.keyManagerSignJWT({ kid: '528bce840023b038cf9d65fe7dcbe36b0a83302c84477b8b0e758cbe70eadacb', data: JSON.stringify(data) });

    const vc = await this.agent.createVerifiableCredential({
      proofFormat: 'jwt',
      save: true,
      credential: {
        credentialSubject: {
          id: subjectDidId,
        },
        issuer: {
          id: 'did:key:z6Mkk1V84BS2VGjRyHEsC72w1FBpjLTtUN2bdqiHzpuxr9X8',
        },
        type: ['VerifiableCredential', 'PersonCredential'],
        '@context': ['https://www.w3.org/2018/credentials/v1', 'https://www.w3.org/2018/credentials/examples/v1'],
      },
    });
    console.log('vc =>', vc);

    return jwt;
  }
}
