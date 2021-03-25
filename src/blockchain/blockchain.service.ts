import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { AuthProvider__factory } from './typechain/factories//AuthProvider__factory';

@Injectable()
export class BlockchainService {
  constructor(private configService: ConfigService) {}

  signer() {
    return new ethers.Wallet(this.configService.get('PRIVATE_KEY')).connect(this.provider());
  }

  provider() {
    const PROVIDER_USER = this.configService.get('PROVIDER_USER');
    const PROVIDER_PASSWORD = this.configService.get('PROVIDER_PASSWORD');
    if (PROVIDER_USER && PROVIDER_PASSWORD) {
      return new ethers.providers.JsonRpcProvider({
        url: this.configService.get('PROVIDER_URL'),
        user: PROVIDER_USER,
        password: PROVIDER_PASSWORD,
      });
    } else {
      console.log('Connected localhost', this.configService.get('PROVIDER_URL'));
      return new ethers.providers.JsonRpcProvider({
        url: this.configService.get('PROVIDER_URL'),
      });
    }
  }

  authProviderContract() {
    return new AuthProvider__factory(this.signer()).attach(this.configService.get('AUTH_PROVIDER_ADDRESS'));
  }
}
