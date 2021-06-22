import { Module, ModuleMetadata } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DidService } from './did.service';
import { EthereumService } from './ethereum.service';
import { VeramoService } from './veramo.service';

export const NetworkModuleMeta: ModuleMetadata = {
  providers: [DidService, EthereumService, VeramoService],
  exports: [DidService, EthereumService, VeramoService],
  imports: [ConfigModule.forRoot({})],
};
@Module(NetworkModuleMeta)
export class NetworkModule {}
