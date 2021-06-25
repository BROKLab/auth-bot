import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
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
