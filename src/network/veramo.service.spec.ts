import { Test, TestingModule } from '@nestjs/testing';
import { NetworkModuleMeta } from './network.module';
import { VeramoService } from './veramo.service';

describe('DbService', () => {
  let service: VeramoService;
  let module: TestingModule;
  beforeEach(async () => {
    module = await Test.createTestingModule(NetworkModuleMeta).compile();
    service = module.get<VeramoService>(VeramoService);
    await module.init();
  });
  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('should create', async () => {
    const identity = await service.createIdentity();
    expect(identity.did).toContain('did');
  });
  it('should have atleast one identity in list, because it has been provsioned', async () => {
    const identities = await service.listIdentities();
    expect(identities.length).toBeGreaterThanOrEqual(1);
  });
  it('should getIssuer', async () => {
    const issuer = await service.getIssuer();
    expect(issuer).toBeDefined();
  });
  it('should create VC nad verify VC against issuer', async () => {
    const _data = { name: 'Ola Nordman' };
    const vc = await service.issueCredential(_data, 'did:key:z6MkfNm3yuhbTFSUa2BCwE7CA8fnUy3U2MSeMyCLXf5dJVyf');
    // const issuer = await service.getIssuer();
    const validVC = await service.verifyVC(vc.proof.jwt);

    expect(validVC).toBe(true);
  });
});
