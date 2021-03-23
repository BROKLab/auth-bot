import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
  async drop() {
    console.debug('Dropping whole database');
    // const unclaimed = await this.unclaimed.findMany();
    // await Promise.all(
    //   unclaimed.map(async (unclaim) => {
    //     return await this.unclaimed.delete({
    //       where: {
    //         id: unclaim.id,
    //       },
    //     });
    //   }),
    // );
    // const addresses = await this.address.findMany();
    // await Promise.all(
    //   addresses.map(async (a) => {
    //     return await this.address.delete({
    //       where: {
    //         address: a.address,
    //       },
    //     });
    //   }),
    // );
    // const users = await this.user.findMany({});
    // await Promise.all(
    //   users.map(async (a) => {
    //     return await this.user.delete({
    //       where: {
    //         id: a.id,
    //       },
    //     });
    //   }),
    // );
  }
}
