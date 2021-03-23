import ThreeIdProvider from '3id-did-provider';
import CeramicClient from '@ceramicnetwork/http-client';
import { Test, TestingModule } from '@nestjs/testing';
import { randomBytes } from 'crypto';
import { AuthModuleMeta } from './auth.module';
import { AuthService } from './auth.service';
describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;
  jest.setTimeout(20000);

  beforeEach(async () => {
    module = await Test.createTestingModule(AuthModuleMeta).compile();
    service = module.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a valid jwt', async () => {
    //Create JWS
    const uuid = '250388xxxxx';
    const jws = await service.issueJWS({ uuid: uuid });
    const issuerDID = await service.getDIDid();

    // Setup another DID instance
    const API_URL = 'https://ceramic-clay.3boxlabs.com';
    const ceramic = new CeramicClient(API_URL);
    const threeIdProvider = await ThreeIdProvider.create({ ceramic: ceramic, getPermission: service.getPermission, seed: new Uint8Array(randomBytes(32)) });
    const didProvider = threeIdProvider.getDidProvider();
    await ceramic.setDIDProvider(didProvider);
    const verified = await ceramic.did.verifyJWS(jws);
    expect(verified.payload.uuid).toBe(uuid);
    expect(verified.kid).toContain(issuerDID);
  });

  xit('should fail when DID does not verify jwt', async () => {
    //Create JWS
    const uuid = '250388xxxxx';
    const jws = await service.issueJWS({ uuid: uuid });
    const issuerDID = await service.getDIDid();

    // Setup another DID instance
    const API_URL = 'https://ceramic-clay.3boxlabs.com';
    const ceramic = new CeramicClient(API_URL);
    const threeIdProvider = await ThreeIdProvider.create({ ceramic: ceramic, getPermission: service.getPermission, seed: new Uint8Array(randomBytes(32)) });
    const didProvider = threeIdProvider.getDidProvider();
    await ceramic.setDIDProvider(didProvider);
    console.log('Just before verify', await ceramic.did.id);
    const verified = await ceramic.did.verifyJWS(jws);
    console.log('verified');
    console.log(verified);
    expect(verified.payload.uuid).toBe(uuid);
    expect(verified.kid).toContain(ceramic.did.id);
  });
});
