import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppModuleMeta } from './app.module';

describe('AppController', () => {
  let appController: AppController;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule(AppModuleMeta).compile();
    appController = module.get<AppController>(AppController);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello');
    });
  });
});
