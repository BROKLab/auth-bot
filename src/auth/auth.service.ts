import CeramicClient from '@ceramicnetwork/http-client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  private ceramic: CeramicClient;
  constructor() {
    //
  }
}
