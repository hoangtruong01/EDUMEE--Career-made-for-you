import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ROLES_KEY } from '../../auth/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AiPlanController } from './ai-plan.controller';
import { AiPlanService } from '../services/ai-plan.service';

describe('AiPlanController', () => {
  let controller: AiPlanController;
  const aiPlanService = {
    findCatalog: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiPlanController],
      providers: [
        {
          provide: AiPlanService,
          useValue: aiPlanService,
        },
      ],
    }).compile();

    controller = module.get(AiPlanController);
  });

  it('exposes GET /ai-plans as a public catalog endpoint', async () => {
    const catalogMethod = Object.getOwnPropertyDescriptor(
      AiPlanController.prototype,
      'catalog',
    )?.value as object;

    aiPlanService.findCatalog.mockResolvedValue(['catalog']);

    await expect(controller.catalog()).resolves.toEqual(['catalog']);
    expect(aiPlanService.findCatalog).toHaveBeenCalledTimes(1);
    expect(Reflect.getMetadata(PATH_METADATA, AiPlanController)).toBe('ai-plans');
    expect(Reflect.getMetadata(PATH_METADATA, catalogMethod) ?? '/').toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, catalogMethod)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(GUARDS_METADATA, catalogMethod)).toBeUndefined();
  });

  it('keeps GET /ai-plans/catalog as a public legacy alias', async () => {
    const catalogAliasMethod = Object.getOwnPropertyDescriptor(
      AiPlanController.prototype,
      'catalogAlias',
    )?.value as object;

    aiPlanService.findCatalog.mockResolvedValue(['catalog']);

    await expect(controller.catalogAlias()).resolves.toEqual(['catalog']);
    expect(aiPlanService.findCatalog).toHaveBeenCalledTimes(1);
    expect(Reflect.getMetadata(PATH_METADATA, catalogAliasMethod)).toBe('catalog');
    expect(Reflect.getMetadata(METHOD_METADATA, catalogAliasMethod)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(GUARDS_METADATA, catalogAliasMethod)).toBeUndefined();
  });

  it('protects GET /ai-plans/admin with JWT and admin role', async () => {
    const findAllAdminMethod = Object.getOwnPropertyDescriptor(
      AiPlanController.prototype,
      'findAllAdmin',
    )?.value as object;

    aiPlanService.findAll.mockResolvedValue(['admin']);

    await expect(controller.findAllAdmin()).resolves.toEqual(['admin']);
    expect(aiPlanService.findAll).toHaveBeenCalledTimes(1);
    expect(Reflect.getMetadata(PATH_METADATA, findAllAdminMethod)).toBe('admin');
    expect(Reflect.getMetadata(METHOD_METADATA, findAllAdminMethod)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(GUARDS_METADATA, findAllAdminMethod)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, findAllAdminMethod)).toEqual([UserRole.ADMIN]);
  });
});
