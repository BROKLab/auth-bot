import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainModuleMeta } from './blockchain.module';
import { BlockchainService } from './blockchain.service';

describe('BlockchainService', () => {
  let service: BlockchainService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule(BlockchainModuleMeta).compile();
    service = module.get<BlockchainService>(BlockchainService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
