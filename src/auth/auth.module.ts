import { Module, ModuleMetadata } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from '../blockchain/blockchain.module';

export const AuthModuleMeta: ModuleMetadata = {
  providers: [AuthService],
  controllers: [AuthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BlockchainModule,
  ],
};
@Module(AuthModuleMeta)
export class AuthModule {}
