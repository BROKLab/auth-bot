import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModuleMeta } from './prisma.module';
import { PrismaService } from './prisma.service';

describe('DbService', () => {
  let service: PrismaService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule(PrismaModuleMeta).compile();
    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
