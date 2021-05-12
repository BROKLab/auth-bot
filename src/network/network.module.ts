import { Module, ModuleMetadata } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CeramicService } from './ceramic.service';
import { EthereumService } from './ethereum.service';

export const NetworkModuleMeta: ModuleMetadata = {
  providers: [CeramicService, EthereumService],
  exports: [CeramicService, EthereumService],
  imports: [ConfigModule.forRoot({})],
};
@Module(NetworkModuleMeta)
export class NetworkModule {}
