import { Module, ModuleMetadata } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';

export const BlockchainModuleMeta: ModuleMetadata = {
  providers: [BlockchainService],
  exports: [BlockchainService],
  imports: [ConfigModule],
};
@Module(BlockchainModuleMeta)
export class BlockchainModule {}
