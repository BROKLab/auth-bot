import { Module, ModuleMetadata } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export const PrismaModuleMeta: ModuleMetadata = {
  providers: [PrismaService],
  exports: [PrismaService],
};
@Module(PrismaModuleMeta)
export class PrismaModule {}
