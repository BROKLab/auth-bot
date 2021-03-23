import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { BANKID_TEST_TOKEN2 } from '../src/auth/test.data';
import { ethers } from 'ethers';
import { assert } from 'console';

describe('Auth Controller (e2e)', () => {
  let app: INestApplication;
  const wallet1 = ethers.Wallet.createRandom();

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/verify', async () => {
    const token = BANKID_TEST_TOKEN2;
    const tokenHash = ethers.utils.id(token);
    const tokenHashBytes = ethers.utils.arrayify(tokenHash);
    const signature = await wallet1.signMessage(tokenHashBytes);
    await request(app.getHttpServer())
      .get('/auth/verify')
      .query({
        bankIdToken: token,
        signature,
        skipBlockchain: true,
        skipToken: true,
      })
      .expect(200)
      .expect((res) => {
        assert(res.body.name, 'Lo, Morten');
        assert(res.body.authToken.length > 2);
      });
  });
  it('/me', async () => {
    const token = BANKID_TEST_TOKEN2;
    const tokenHash = ethers.utils.id(token);
    const tokenHashBytes = ethers.utils.arrayify(tokenHash);
    const signature = await wallet1.signMessage(tokenHashBytes);
    let authToken = null;

    await request(app.getHttpServer())
      .get('/auth/verify')
      .query({
        bankIdToken: token,
        signature,
        skipBlockchain: true,
        skipToken: true,
      })
      .expect(200)
      .then((response) => {
        authToken = response.body.authToken;
      });
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer ' + authToken)
      .expect(200)
      .expect((res) => {
        assert(res.body.name, 'Lo, Morten');
      });
  });
});
