import { Controller, Get, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { ShareService } from './share.service';

@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get(':token')
  async openShare(
    @Param('token') token: string,
    @Req() req: Request,
  ) {
    // Log IP address; fall back to user-agent if IP not available
    const openedBy =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      req.headers['user-agent'] ||
      'unknown';

    return this.shareService.openShareLink(token, openedBy);
  }
}
