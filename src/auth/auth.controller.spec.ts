import KeyDidResolver from 'key-did-resolver';
import { getResolver as EthrGetResolver } from 'ethr-did-resolver';
import { EthrDID } from 'ethr-did';
import CeramicClient from '@ceramicnetwork/http-client';
import { Test, TestingModule } from '@nestjs/testing';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { AuthController } from './auth.controller';
import { AuthModuleMeta } from './auth.module';
import { BANKID_TEST_TOKEN2 } from './test.data';
import { DID } from 'dids';
import { ConfigService } from '@nestjs/config';

// Because we are doing a blockchain tx we need to increase the async test timeout
jest.setTimeout(20000);

describe('AuthController', () => {
  let controller: AuthController;
  let config: ConfigService;
  let module: TestingModule;

  //Drop database
  beforeAll(async () => {
    const module = await Test.createTestingModule(AuthModuleMeta).compile();
    await module.close();
  });

  beforeEach(async () => {
    module = await Test.createTestingModule(AuthModuleMeta).compile();
    await module.init();
    controller = module.get<AuthController>(AuthController);
    config = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get VCs of idnetifier, name and blockchainAccount ', async () => {
    const wallet = ethers.Wallet.createRandom();
    const seed = randomBytes(32);
    // const privateKeyArray = Uint8Array.from(Buffer.from(wallet1.privateKey, 'hex'));
    const provider = new Ed25519Provider(seed);
    const resolver = {
      ...KeyDidResolver.getResolver(),
    };
    const did = new DID({ provider, resolver });
    await did.authenticate();
    const token = BANKID_TEST_TOKEN2;
    const tokenHash = ethers.utils.id(token);
    const tokenHashBytes = ethers.utils.arrayify(tokenHash);
    const signature = await wallet.signMessage(tokenHashBytes);

    const jws = await did.createJWS({
      bankIdToken: token,
      signedBankIdToken: signature,
      skipBlockchain: true,
      skipBankidVerify: true,
    });

    const tokens = await controller.verify({
      jws: jws,
    });
    await Promise.all(
      tokens.map(async (token) => {
        const verified = await did.verifyJWS(token);

        if (verified.payload.identifier) {
          expect(verified.payload.identifier).toBe('14102123973');
        }
        if (verified.payload.name) {
          expect(verified.payload.name).toBe('Lo, Morten');
        }
        if (verified.payload.blockchainAccounts) {
          expect(verified.payload.blockchainAccounts).toContain(wallet.address);
        }
      }),
    );
  });
});
