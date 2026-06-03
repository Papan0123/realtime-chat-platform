import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

type CreatedUserInput = {
  name: string;
  email: string;
  password: string;
};

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a user with a hashed password and JWT', async () => {
    let createdUser: CreatedUserInput | undefined;
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockImplementation((user: CreatedUserInput) => {
      createdUser = user;
      return Promise.resolve({ id: 1, email: user.email });
    });
    jwtService.sign.mockReturnValue('jwt-token');

    const result = await service.register({
      name: 'Priyanshu',
      email: 'priyanshu@example.com',
      password: 'secret123',
    });

    expect(createdUser).toBeDefined();
    expect(createdUser.name).toBe('Priyanshu');
    expect(createdUser.email).toBe('priyanshu@example.com');
    expect(createdUser.password).not.toBe('secret123');
    expect(result).toEqual({
      accessToken: 'jwt-token',
      user: { id: 1, email: 'priyanshu@example.com' },
    });
  });
});
