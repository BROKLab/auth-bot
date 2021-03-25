import { Controller, Get, HttpException, HttpStatus, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { decode, verify } from 'jsonwebtoken';
import { BlockchainService } from '../blockchain/blockchain.service';
import { AuthService } from './auth.service';
import { BankidData } from './bankid.types';
import { parse } from 'date-fns';
import { nb } from 'date-fns/locale';

@Controller('auth')
export class AuthController {
  constructor(private readonly configService: ConfigService, private readonly blockchainService: BlockchainService, private readonly authService: AuthService) {}

  @Get('/verify/bankid')
  async verify(
    @Query()
    query: {
      bankIdToken: string;
      signature: string;
      skipBlockchain?: boolean;
      skipBankidVerify?: boolean;
    },
  ) {
    try {
      // Verfies token with cert from Criipto. Will throe if not verfiable agains cert form .env.
      const bankidData = decode(query.bankIdToken) as BankidData;
      const cert = this.configService.get<string>('CRIIPTO_CERT');
      const skipTokenVerify = query.skipBankidVerify && this.configService.get('NODE_ENV') !== 'production';
      if (skipTokenVerify) {
        // TODO : Should put som alert logging on this so this does not accidenalty happen.
        console.debug('Skipping bankId Verification because we are not in production');
      } else {
        verify(query.bankIdToken, cert);
      }

      const tokenHash = ethers.utils.id(query.bankIdToken);
      const tokenHashBytes = ethers.utils.arrayify(tokenHash);
      const address = ethers.utils.verifyMessage(tokenHashBytes, query.signature);
      // const uuidHash = ethers.utils.keccak256(ethers.utils.id(bankidData.socialno));

      // Save auth to blockchain
      let txHash = null;
      let blockNumber = null;
      const skipBlockchain = this.configService.get('NODE_ENV') !== 'production' && query.skipBlockchain;
      if (skipBlockchain) {
        console.debug('Skipping onChain verification because we are not in production');
      } else {
        const authProviderContract = this.blockchainService.authProviderContract();
        const tx = await authProviderContract.authenticate(address);
        await tx.wait();
        txHash = tx.hash;
        blockNumber = tx.blockNumber;
      }
      let birthdateISO8601 = null;
      try {
        birthdateISO8601 = parse(bankidData.dateofbirth, 'yyyy-MM-dd', new Date(), {
          locale: nb,
        }).toISOString();
      } catch (error) {
        console.log(error.message);
      }
      const jws = await this.authService.issueJWS({
        identifier: bankidData.socialno,
        blockchainAccounts: [address],
        familyName: bankidData.name,
        birthDate: birthdateISO8601,
      });
      return jws;
    } catch (error) {
      console.log(error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
