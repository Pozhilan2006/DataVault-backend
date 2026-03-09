import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('share')
@UseGuards(JwtAuthGuard)
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get(':token')
  async openShare(
    @Param('token') token: string,
    @CurrentUser() user: { sub: string; email: string; username: string },
  ) {
    return this.shareService.openShareLink(token, user.sub, user.username);
  }
}
