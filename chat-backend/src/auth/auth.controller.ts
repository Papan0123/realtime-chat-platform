import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('auth/register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async profile(@CurrentUser() user: JwtUser) {
    const profile = await this.usersService.findById(user.sub);
    if (!profile) {
      return null;
    }
    const safeProfile: Omit<typeof profile, 'password'> = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar,
      socketId: profile.socketId,
      isOnline: profile.isOnline,
      lastSeen: profile.lastSeen,
      createdAt: profile.createdAt,
      messages: profile.messages,
      memberships: profile.memberships,
    };
    return safeProfile;
  }
}
