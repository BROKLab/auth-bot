import { Body, Controller, Get, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerifiablePresentation } from '@veramo/core';
import { parse } from 'date-fns';
import { nb } from 'date-fns/locale';
import { DagJWS, DID } from 'dids';
import { ethers } from 'ethers';
import { decode, verify } from 'jsonwebtoken';
import { DidService } from '../network/did.service';
import { EthereumService } from '../network/ethereum.service';
import { VeramoService } from '../network/veramo.service';
import { BankidData } from './bankid.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly configService: ConfigService, private readonly ethereumService: EthereumService, private readonly veramoService: VeramoService) {}

  @Post('/verify/bankid')
  async verify(
    @Body()
    body: {
      jwt: string;
      skipBlockchain?: boolean;
      skipBankidVerify?: boolean;
    },
  ) {
    try {
      // TODO Take out all JWT functioanlity as route guards and make the pluggable
      const ourVerifier = this.configService.get<string>('ISSUER_DID');
      const decoded = await this.veramoService.decodeJWT(body.jwt, { decodeCredentials: true, audience: ourVerifier, requireVerifiablePresentation: true });

      const jwtWithBankIDToken = decoded.vp.jwts.find((jwt) => {
        if (jwt.vc.credentialSubject.bankIdToken) {
          return true;
        }
        return false;
      });
      if (!jwtWithBankIDToken) {
        throw Error('No VC with bankIdToken property');
      }

      // Verfies token with cert from Criipto. Will throw if not verfiable agains cert form .env.
      const bankidData = decode(jwtWithBankIDToken.vc.credentialSubject.bankIdToken) as BankidData;
      const cert = this.configService.get<string>('CRIIPTO_CERT');
      const skipTokenVerify = body.skipBankidVerify && this.configService.get('NODE_ENV') !== 'production';
      if (skipTokenVerify) {
        // TODO : Should put som alert logging on this so this does not accidenalty happen.
        console.debug('Skipping bankId Verification because we are not in production');
      } else {
        verify(jwtWithBankIDToken.vc.credentialSubject.bankIdToken, cert);
      }

      const publicKey = jwtWithBankIDToken.sub.split(':').pop();
      const address = ethers.utils.computeAddress(publicKey);

      // // Save auth to blockchain
      let txHash = null;
      let blockNumber = null;
      const skipBlockchain = this.configService.get('NODE_ENV') !== 'production' && body.skipBlockchain;
      if (skipBlockchain) {
        console.debug('Skipping onChain verification because we are not in production');
      } else {
        const authProviderContract = this.ethereumService.authProviderContract();
        const tx = await authProviderContract.authenticate(address);
        await tx.wait();
        txHash = tx.hash;
        blockNumber = tx.blockNumber;
      }

      // // Fund account

      const provider = this.ethereumService.provider();
      const balance = await provider.getBalance(address);

      if (balance.lt(ethers.utils.parseEther('0.1'))) {
        console.debug('Balance below 0,1, start funding');
        const wallet = new ethers.Wallet(this.configService.get<string>('PRIVATE_KEY')).connect(provider);
        wallet.sendTransaction({ to: address, value: ethers.utils.parseEther('0.11') });
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

      const vc1 = await this.veramoService.issueCredential(
        {
          name: bankidData.name,
          familyName: bankidData.family_name,
          givenName: bankidData.given_name,
          birthDate: birthdateISO8601,
        },
        jwtWithBankIDToken.vc.credentialSubject.id,
        ['PersonCredential'],
      );
      const vc2 = await this.veramoService.issueCredential(
        {
          identifier: bankidData.socialno,
          blockchainAccounts: [address],
        },
        jwtWithBankIDToken.vc.credentialSubject.id,
        ['PersonCredential'],
      );
      return [vc1.proof.jwt, vc2.proof.jwt];
    } catch (error) {
      console.log(error);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
