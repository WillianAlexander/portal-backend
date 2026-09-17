import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginAzureDto } from './dto/login-azure.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login/azure')
  loginAzure(@Body() dto: LoginAzureDto) {
    return this.authService.loginAzure(dto.azureIdToken);
  }

  @Get('me')
  me(@CurrentUser('payload') payload: JwtPayload) {
    return this.authService.getMe(payload);
  }
}
