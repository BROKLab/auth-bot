import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import KeyDidResolver from 'key-did-resolver';
import CeramicClient from '@ceramicnetwork/http-client';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { AuthController } from './auth.controller';
import { AuthModuleMeta } from './auth.module';
import { BANKID_TEST_TOKEN2 } from './test.data';
import { DID } from 'dids';

// Because we are doing a blockchain tx we need to increase the async test timeout
jest.setTimeout(20000);

describe('AuthController', () => {
  let controller: AuthController;
  let module: TestingModule;
  const wallet1 = ethers.Wallet.createRandom();

  //Drop database
  beforeAll(async () => {
    const module = await Test.createTestingModule(AuthModuleMeta).compile();
    await module.close();
  });

  beforeEach(async () => {
    module = await Test.createTestingModule(AuthModuleMeta).compile();
    await module.init();
    controller = module.get<AuthController>(AuthController);
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
    const seed = randomBytes(32);
    // const privateKey = this.configService.get<string>('PRIVATE_KEY').substr(2); // substr to remove 0x
    // const privateKeyArray = this.toUint8Array(privateKey, 'hex');
    const provider = new Ed25519Provider(seed);
    const resolver = {
      ...KeyDidResolver.getResolver(),
      ...ThreeIdResolver.getResolver(ceramic),
    };
    const did = new DID({ provider, resolver });
    await ceramic.setDID(did);
    await ceramic.did.authenticate();

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
        console.log(verified.didResolutionResult.didDocument);

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
