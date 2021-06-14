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
    config = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get VCs of idnetifier, name and blockchainAccount ', async () => {
    const API_URL = 'https://ceramic-clay.3boxlabs.com';
    const ceramic = new CeramicClient(API_URL);
    const seed = randomBytes(32);
    // const privateKey = config.get<string>('PRIVATE_KEY').substr(2); // substr to remove 0x
    // const privateKeyArray = Uint8Array.from(Buffer.from(privateKey, 'hex'));
    const provider = new Ed25519Provider(seed);
    const resolver = {
      ...KeyDidResolver.getResolver(),
      // ...ThreeIdResolver.getResolver(ceramic),
      // ...EthrGetResolver(ethProviderConfig),
    };
    const did = new DID({ provider, resolver });
    await ceramic.setDID(did);
    await ceramic.did.authenticate();
    const token = BANKID_TEST_TOKEN2;
    const tokenHash = ethers.utils.id(token);
    const tokenHashBytes = ethers.utils.arrayify(tokenHash);
    const signature = await wallet1.signMessage(tokenHashBytes);

    const jws = await did.createJWS({
      bankIdToken: token,
      signedBankIdToken: signature,
      skipBlockchain: true,
      skipBankidVerify: true,
    });

    const tokens = await controller.verify({
      verfiablePresentation: jws,
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
        if (verified.payload.blockchainAccounts) {
          expect(verified.payload.blockchainAccounts).toContain(wallet1.address);
        }
      }),
    );
  });

  // it('shuld get a DID from valid BankDI', async () => {
  //   const API_URL = 'https://ceramic-clay.3boxlabs.com';
  //   const ceramic = new CeramicClient(API_URL);
  //   const seed = randomBytes(32);
  //   // const privateKey = this.configService.get<string>('PRIVATE_KEY').substr(2); // substr to remove 0x
  //   // const privateKeyArray = this.toUint8Array(privateKey, 'hex');
  //   const provider = new Ed25519Provider(seed);
  //   const ethProviderConfig = {
  //     rpcUrl: 'https://e0avzugh9j:5VOuyz9VPLenxC-zB2nvrWOlfDrRlSlcg0VZyIAvEeI@e0mvr9jrs7-e0iwsftiw5-rpc.de0-aws.kaleido.io',
  //     registry: '0x28e1b9Be7aDb104ef1989821e5Cb1d6eB4294eA6',
  //   };
  //   const resolver = {
  //     // ...KeyDidResolver.getResolver(),
  //     // ...ThreeIdResolver.getResolver(ceramic),
  //     // ...EthrDidResolver.getResolver(ethProviderConfig),
  //   };
  //   // const did = new DID({ provider, resolver });
  //   // await ceramic.setDID(did);
  //   // await ceramic.did.authenticate();
  //   // dfefa45dfeef2579e259d2788b3782b90bb8cb0e630d1ede655ba756ae29bef7  0xca3cF3c451B5BA0A6F09C7E8A487525aA0062E6c
  //   const ethrDid = new EthrDID({
  //     ...ethProviderConfig,
  //     identifier: '0xca3cF3c451B5BA0A6F09C7E8A487525aA0062E6c',
  //     privateKey: 'dfefa45dfeef2579e259d2788b3782b90bb8cb0e630d1ede655ba756ae29bef7',
  //     chainNameOrId: 'BROK',
  //   });
  //   const test = await ethrDid.createSigningDelegate();
  //   const token = BANKID_TEST_TOKEN2;
  //   const tokenHash = ethers.utils.id(token);
  //   const tokenHashBytes = ethers.utils.arrayify(tokenHash);
  //   const signature = await wallet1.signMessage(tokenHashBytes);
  //   const tokens = await controller.verify({
  //     bankIdToken: token,
  //     signature,
  //     skipBlockchain: true,
  //     skipBankidVerify: true,
  //   });
  //   await Promise.all(
  //     tokens.map(async (token) => {
  //       const verified = await ceramic.did.verifyJWS(token);
  //       console.log(verified.didResolutionResult.didDocument);

  //       if (verified.payload.identifier) {
  //         expect(verified.payload.identifier).toBe('14102123973');
  //       }
  //       if (verified.payload.name) {
  //         expect(verified.payload.name).toBe('Lo, Morten');
  //       }
  //     }),
  //   );
  // });
  it('test', async () => {
    //
  });
});
