import ThreeIdProvider from '3id-did-provider';
import CeramicClient from '@ceramicnetwork/http-client';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';
import { AuthController } from './auth.controller';
import { AuthModuleMeta } from './auth.module';
import { BANKID_TEST_TOKEN2 } from './test.data';

// Because we are doing a blockchain tx we need to increase the async test timeout
jest.setTimeout(20000);

describe('AuthController', () => {
  let controller: AuthController;
  let configService: ConfigService;
  let module: TestingModule;
  const wallet1 = ethers.Wallet.createRandom();

  //Drop database
  beforeAll(async () => {
    const module = await Test.createTestingModule(AuthModuleMeta).compile();
    await module.close();
  });

  beforeEach(async () => {
    module = await Test.createTestingModule(AuthModuleMeta).compile();
    controller = module.get<AuthController>(AuthController);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('shuld get a DID from valid BankDI', async () => {
    const API_URL = 'https://ceramic-clay.3boxlabs.com';
    const ceramic = new CeramicClient(API_URL);
    const threeIdProvider = await ThreeIdProvider.create({ ceramic: ceramic, getPermission: async () => ['/'], seed: new Uint8Array(randomBytes(32)) });
    const didProvider = threeIdProvider.getDidProvider();
    await ceramic.setDIDProvider(didProvider);

    const token = BANKID_TEST_TOKEN2;
    const tokenHash = ethers.utils.id(token);
    const tokenHashBytes = ethers.utils.arrayify(tokenHash);
    const signature = await wallet1.signMessage(tokenHashBytes);
    const tokens = await controller.verify({
      bankIdToken: token,
      signature,
      skipBlockchain: true,
      skipBankidVerify: true,
    });
    await Promise.all(
      tokens.map(async (token) => {
        const verified = await ceramic.did.verifyJWS(token);
        if (verified.payload.identifier) {
          expect(verified.payload.identifier).toBe('14102123973');
        }
        if (verified.payload.name) {
          expect(verified.payload.name).toBe('Lo, Morten');
        }
      }),
    );
  });
  it('test', async () => {
    //
  });
});
