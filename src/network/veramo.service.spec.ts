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
  it('should list', async () => {
    await service.createIdentity();
    const identities = await service.listIdentities();
    console.log('identities => ', identities);

    expect(identities.length).toBeGreaterThanOrEqual(1);
  });
  it('should getIssuer', async () => {
    await service.getIssuer();
  });
  it('should create VC', async () => {
    const _data = { name: 'Ola Nordman' };
    const jwt = await service.issueCredential(_data, 'did:key:z6Mkge3wTYspATmbggVajdYXtHTWfwC3icYDorHFZMpGeeyj');
    console.log('jwt => ', jwt);
  });
});
