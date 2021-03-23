import { Module, ModuleMetadata } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
export const AppModuleMeta: ModuleMetadata = {
  imports: [
    ConfigModule.forRoot({
      // isGlobal: true,
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
};
@Module(AppModuleMeta)
export class AppModule {}
