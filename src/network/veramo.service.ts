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
const DATABASE_FILE = 'veramo.db.sqlite';

@Injectable()
export class VeramoService implements OnModuleInit, OnModuleDestroy {
  private agent: TAgent<IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver>;
  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const dbConnection = createConnection({
      type: 'sqlite',
      database: DATABASE_FILE,
      synchronize: true,
      logging: ['error', 'info', 'warn'],
      entities: Entities,
    });
    const agent = createAgent<IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver>({
      plugins: [
        new KeyManager({
          store: new KeyStore(dbConnection),
          kms: {
            local: new KeyManagementSystem(),
          },
        }),
        new DIDManager({
          store: new DIDStore(dbConnection),
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
      ],
    });
    this.agent = agent;
  }
  async onModuleDestroy() {
    // await this.connection.close();
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

  async createJWS() {
    this.agent.claim;
  }
}
