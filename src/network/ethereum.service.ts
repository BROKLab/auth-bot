import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { AuthProvider__factory, Deployments } from '@brok/captable-contracts';

@Injectable()
export class EthereumService {
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
      return new ethers.providers.JsonRpcProvider({
        url: this.configService.get('PROVIDER_URL'),
      });
    }
  }
  authProviderContract() {
    const BROK_ENVIROMENT = this.configService.get('BROK_ENVIROMENT');
    if (!BROK_ENVIROMENT) throw Error('Please set BROK_ENVIROMENT');
    console.log(BROK_ENVIROMENT);

    return new AuthProvider__factory(this.signer()).attach(Deployments[BROK_ENVIROMENT].contracts.AuthProvider.address);
  }
}
