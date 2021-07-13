import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthModuleMeta } from './auth.module';
import { BANKID_TEST_TOKEN2 } from './test.data';
import { getDbConnection, initAgent } from '../network/veramo.utils';
import { writeFileSync } from 'fs';
import { TKeyType } from '@veramo/core';

// Because we are doing a blockchain tx we need to increase the async test timeout
jest.setTimeout(20000);

describe('AuthController', () => {
  let controller: AuthController;
  let configService: ConfigService;
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
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get VCs of idnetifier, name and blockchainAccount for an imported account', async () => {
    const dbConnection = getDbConnection('wallet.db.sqlite');
    const agent = initAgent(dbConnection);
    await agent.didManagerImport({
      services: [],
      provider: 'did:ethr:brok',
      did: 'did:ethr:brok:0x0375008adfe7952e4de69db6b99b4ba602558dfdd5ed0f5923e263a75aa1750ddf',
      controllerKeyId: '0475008adfe7952e4de69db6b99b4ba602558dfdd5ed0f5923e263a75aa1750ddf6a98cc3065c0f1d2c3ed07431f2664dcb7e4fd5d9c8ac5e0412ccd944f4f8e83',
      keys: [
        {
          kid: '0475008adfe7952e4de69db6b99b4ba602558dfdd5ed0f5923e263a75aa1750ddf6a98cc3065c0f1d2c3ed07431f2664dcb7e4fd5d9c8ac5e0412ccd944f4f8e83',
          kms: 'local',
          type: <TKeyType>'Secp256k1',
          publicKeyHex: '0475008adfe7952e4de69db6b99b4ba602558dfdd5ed0f5923e263a75aa1750ddf6a98cc3065c0f1d2c3ed07431f2664dcb7e4fd5d9c8ac5e0412ccd944f4f8e83',
          privateKeyHex: 'bf07838fb276cd080b04d99393160bd2cec07ff5a44d854c80c25d8a0733c9f1',
        },
      ],
    });
    const identity = await agent.didManagerGet({ did: 'did:ethr:brok:0x0375008adfe7952e4de69db6b99b4ba602558dfdd5ed0f5923e263a75aa1750ddf' });

    const vc = await agent.createVerifiableCredential({
      proofFormat: 'jwt',
      save: true,
      credential: {
        credentialSubject: {
          bankIdToken: BANKID_TEST_TOKEN2,
          id: identity.did,
        },
        issuer: {
          id: identity.did,
        },
      },
    });

    const verfifier = configService.get<string>('ISSUER_DID');
    const vp = await agent.createVerifiablePresentation({
      presentation: {
        holder: identity.did,
        verifier: [verfifier],
        verifiableCredential: [vc.proof.jwt],
      },
      proofFormat: 'jwt',
    });
    writeFileSync('vp.json', JSON.stringify(vp.proof.jwt));
    const jwts = await controller.verify({
      jwt: vp.proof.jwt,
      skipBankidVerify: true,
      skipBlockchain: true,
    });
    writeFileSync('jwts.json', JSON.stringify(jwts));
    jwts.forEach((jwt) => {
      const decodedPayload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
      if ('name' in decodedPayload.vc.credentialSubject) {
        expect(decodedPayload.vc.credentialSubject.name).toBe('Lo, Morten');
        console.log('JWT with name => ', jwt);
      }
      if ('identifier' in decodedPayload.vc.credentialSubject) {
        expect(decodedPayload.vc.credentialSubject.identifier).toBe('14102123973');
        console.log('JWT with identifier => ', jwt);
      }
      if ('blockchainAccount' in decodedPayload.vc.credentialSubject) {
        expect(decodedPayload.vc.credentialSubject.blockchainAccount).toBe('0x89328028668439Fc9478a832D1E091823fB13280');
        console.log('JWT with blockchainAccount => ', jwt);
      }
    });
  });

  it('should get VCs of idnetifier, name and blockchainAccount for a random ethrdid', async () => {
    const dbConnection = getDbConnection('wallet.db.sqlite');
    const agent = initAgent(dbConnection);
    const identity = await agent.didManagerCreate();

    const vc = await agent.createVerifiableCredential({
      proofFormat: 'jwt',
      save: true,
      credential: {
        credentialSubject: {
          bankIdToken: BANKID_TEST_TOKEN2,
          id: identity.did,
        },
        issuer: {
          id: identity.did,
        },
      },
    });
    const verfifier = configService.get<string>('ISSUER_DID');
    const vp = await agent.createVerifiablePresentation({
      presentation: {
        holder: identity.did,
        verifier: [verfifier],
        verifiableCredential: [vc.proof.jwt],
      },
      proofFormat: 'jwt',
    });
    writeFileSync('vp.json', JSON.stringify(vp));
    const jwts = await controller.verify({
      jwt: vp.proof.jwt,
      skipBankidVerify: true,
      skipBlockchain: true,
    });
    writeFileSync('jwts.json', JSON.stringify(jwts));

    jwts.forEach((jwt) => {
      const decodedPayload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
      if ('name' in decodedPayload.vc.credentialSubject) {
        expect(decodedPayload.vc.credentialSubject.name).toBe('Lo, Morten');
        console.log('JWT with name => ', jwt);
      }
      if ('identifier' in decodedPayload.vc.credentialSubject) {
        expect(decodedPayload.vc.credentialSubject.identifier).toBe('14102123973');
        console.log('JWT with identifier => ', jwt);
      }
    });
  });
});
