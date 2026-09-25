import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Account } from './account.entity';
import { Analytics } from './analytics.entity';
import { User } from './user.entity';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: getRepositoryToken(Account),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Analytics),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should be defined', () => {
      expect(appController).toBeDefined();
    });
  });

  describe('auth/login', () => {
    it('should call appService.login with body', async () => {
      const loginDto = { username: 'admin', password: 'admin123' };
      const expectedResult = {
        access_token: 'mock-jwt-token-superadmin',
        role: 'super_admin',
        email: 'admin',
        name: 'Super Admin',
        companyName: 'System',
        companyRole: 'Administrator',
      };

      jest.spyOn(appService, 'login').mockResolvedValue(expectedResult as any);

      const result = await appController.login(loginDto);
      expect(result).toEqual(expectedResult);
      expect(appService.login).toHaveBeenCalledWith(loginDto);
    });
  });
});

