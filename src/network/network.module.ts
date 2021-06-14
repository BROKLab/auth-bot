import { Module, ModuleMetadata } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DidService } from './did.service';
import { EthereumService } from './ethereum.service';

export const NetworkModuleMeta: ModuleMetadata = {
  providers: [DidService, EthereumService],
  exports: [DidService, EthereumService],
  imports: [ConfigModule.forRoot({})],
};
@Module(NetworkModuleMeta)
export class NetworkModule {}
