import { Test, TestingModule } from '@nestjs/testing';
import { NetworkModuleMeta } from './network.module';
import { VeramoService } from './veramo.service';

describe('Veramo tests', () => {
  let service: VeramoService;
  let module: TestingModule;

  const nameClaim = { name: 'Ola Nordman' };
  const ageClaim = { age: 22 };
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
    const vc = await service.issueCredential(nameClaim, subject, ['PersonCredential']);
    console.log('vc => ,', vc);
    console.log('jwt => ,', vc.proof.jwt);

    const issuer = await service.getIssuer();
    const validVC = await service.verifyVC(vc.proof.jwt);

    expect(validVC).toBe(true);
    expect(vc.issuer.id).toBe(issuer.did);
    expect(vc.credentialSubject.id).toBe(subject);
  });

  it('should find credentials for did', async () => {
    const subject = 'did:ethr:brok:0x0260cc4eb9ce0614f920d3f47cfe4a5b177d64a00e04c50fdf392b1ada891aa675';
    await service.issueCredential(nameClaim, subject, ['PersonCredential']);
    const vcs = await service.findCredentials(subject);

    const vcWithName = vcs.find((vc) => 'name' in vc.verifiableCredential.credentialSubject);
    expect(vcWithName).toBeDefined();
    expect(vcWithName.verifiableCredential.credentialSubject.name).toBe(nameClaim.name);
  });
  it('should create verfiable presentation', async () => {
    const subject = 'did:ethr:brok:0x0260cc4eb9ce0614f920d3f47cfe4a5b177d64a00e04c50fdf392b1ada891aa675';
    const verifier = await service.createIdentity();
    const nameVC = await service.issueCredential(nameClaim, subject, ['PersonCredential']);
    const ageVC = await service.issueCredential(ageClaim, subject, ['PersonCredential']);
    const vp = await service.createVerfiablePresentation(verifier.did, [nameVC, ageVC]);

    console.log('vp => ', vp);
    const validVP = await service.verifyVP(vp.proof.jwt);
    expect(validVP).toBe(true);
  });
});
