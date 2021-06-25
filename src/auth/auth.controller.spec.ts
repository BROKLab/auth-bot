import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ethers } from 'ethers';
import { AuthController } from './auth.controller';
import { AuthModuleMeta } from './auth.module';
import { BANKID_TEST_TOKEN2 } from './test.data';
import { getDbConnection, initAgent } from '../network/veramo.utils';
import { writeFileSync } from 'fs';

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

  it('should get VCs of idnetifier, name and blockchainAccount ', async () => {
    const dbConnection = getDbConnection('wallet.db.sqlite');
    const agent = initAgent(dbConnection, {
      secretKey: '29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c',
    });
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
        verifiableCredential: [vc],
      },
      proofFormat: 'jwt',
    });
    writeFileSync('vp.json', JSON.stringify(vp));
    const tokens = await controller.verify({
      vp,
      skipBankidVerify: true,
      skipBlockchain: true,
    });
    writeFileSync('vc.json', JSON.stringify(tokens));
    tokens.forEach((token) => {
      if ('name' in token.credentialSubject) {
        expect(token.credentialSubject.name).toBe('Lo, Morten');
        console.log('JWT with name => ', token.proof.jwt);
      }
      if ('identifier' in token.credentialSubject) {
        expect(token.credentialSubject.identifier).toBe('14102123973');
        console.log('JWT with idnetifier => ', token.proof.jwt);
      }
    });
  });
});
