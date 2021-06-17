import { Test, TestingModule } from '@nestjs/testing';
import { NetworkModuleMeta } from './network.module';
import { VeramoService } from './veramo.service';

describe('DbService', () => {
  let service: VeramoService;
  let module: TestingModule;

  const nameClaim = { name: 'Ola Nordman' };
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
  it('should create VC and verify VC against issuer', async () => {
    const subject = 'did:ethr:brok:0x03719c5f561b5342216fd3b204d890cf157f192f7bf40ed3f9301c5ca05690726d';
    const vc = await service.issueCredential(nameClaim, subject);
    const issuer = await service.getIssuer();
    const validVC = await service.verifyVC(vc.proof.jwt);

    expect(validVC).toBe(true);
    expect(vc.issuer.id).toBe(issuer.did);
    expect(vc.credentialSubject.id).toBe(subject);
  });

  it('should find credentials for did', async () => {
    const subject = 'did:key:z6MkfNm3yuhbTFSUa2BCwE7CA8fnUy3U2MSeMyCLXf5dJVyf';
    await service.issueCredential(nameClaim, subject);
    const vcs = await service.findCredentials(subject);

    const vcWithName = vcs.find((vc) => 'name' in vc.verifiableCredential.credentialSubject);
    expect(vcWithName).toBeDefined();
    expect(vcWithName.verifiableCredential.credentialSubject.name).toBe(nameClaim.name);
  });
});
