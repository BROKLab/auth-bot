import { Body, Controller, Get, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parse } from 'date-fns';
import { nb } from 'date-fns/locale';
import { DagJWS, DID } from 'dids';
import { ethers } from 'ethers';
import { decode, verify } from 'jsonwebtoken';
import { DidService } from '../network/did.service';
import { EthereumService } from '../network/ethereum.service';
import { BankidData } from './bankid.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly configService: ConfigService, private readonly ethereumService: EthereumService, private readonly didService: DidService) {}

  @Post('/verify/bankid')
  async verify(
    @Body()
    body: {
      jws: DagJWS;
    },
  ) {
    try {
      // console.log(body.verifiablePresentation);
      // const verfiedPresentation = await this.veramoService.verifyVC(body.verifiablePresentation.proof.jwt);

      console.log(body.jws);
      const verfiedPresentation = await this.didService.verifyJWS(body.jws);
      if (!verfiedPresentation.payload) {
        throw Error('No payload in verfied presentation, please set payload in JWS.');
      }
      const didId = verfiedPresentation.kid.split('#')[0];
      const payload: Partial<{
        bankIdToken: string;
        signedBankIdToken: string;
        skipBlockchain: boolean;
        skipBankidVerify: boolean;
      }> = verfiedPresentation.payload;
      if (!payload.signedBankIdToken || !payload.bankIdToken) {
        throw Error('bankIdToken and signedBankIdToken must be set in payload');
      }

      // Verfies token with cert from Criipto. Will throw if not verfiable agains cert form .env.
      const bankidData = decode(payload.bankIdToken) as BankidData;
      const cert = this.configService.get<string>('CRIIPTO_CERT');
      const skipTokenVerify = payload.skipBankidVerify && this.configService.get('NODE_ENV') !== 'production';
      if (skipTokenVerify) {
        // TODO : Should put som alert logging on this so this does not accidenalty happen.
        console.debug('Skipping bankId Verification because we are not in production');
      } else {
        verify(payload.bankIdToken, cert);
      }

      const tokenHash = ethers.utils.id(payload.bankIdToken);
      const tokenHashBytes = ethers.utils.arrayify(tokenHash);
      const address = ethers.utils.verifyMessage(tokenHashBytes, payload.signedBankIdToken);
      // const uuidHash = ethers.utils.keccak256(ethers.utils.id(bankidData.socialno));

      // Save auth to blockchain
      let txHash = null;
      let blockNumber = null;
      const skipBlockchain = this.configService.get('NODE_ENV') !== 'production' && payload.skipBlockchain;
      if (skipBlockchain) {
        console.debug('Skipping onChain verification because we are not in production');
      } else {
        const authProviderContract = this.ethereumService.authProviderContract();
        const tx = await authProviderContract.authenticate(address);
        await tx.wait();
        txHash = tx.hash;
        blockNumber = tx.blockNumber;
      }

      // Fund account
      const provider = this.ethereumService.provider();
      const balance = await provider.getBalance(address);

      if (balance.lt(ethers.utils.parseEther('0.1'))) {
        console.debug('Balance below 0,1, start funding');
        const wallet = new ethers.Wallet(this.configService.get<string>('PRIVATE_KEY')).connect(provider);
        wallet.sendTransaction({ to: address, value: ethers.utils.parseEther('0.2') });
      } else {
        console.debug('Account does not need funding');
      }

      let birthdateISO8601 = null;
      try {
        birthdateISO8601 = parse(bankidData.dateofbirth, 'yyyyMMdd', new Date(), {
          locale: nb,
        }).toISOString();
      } catch (error) {
        console.log(error.message);
      }

      const tokens = await Promise.all([
        this.didService.issueJWS(
          {
            name: bankidData.name,
            familyName: bankidData.family_name,
            givenName: bankidData.given_name,
            birthDate: birthdateISO8601,
          },
          didId,
        ),
        this.didService.issueJWS(
          {
            identifier: bankidData.socialno,
            blockchainAccounts: [address],
          },
          didId,
        ),
      ]);
      return tokens;
    } catch (error) {
      console.log(error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
