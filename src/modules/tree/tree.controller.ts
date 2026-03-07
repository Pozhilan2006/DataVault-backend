import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TreeService } from './tree.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class TreeController {
  constructor(private readonly treeService: TreeService) {}

  @Get(':fileId/tree')
  async getTree(@Param('fileId') fileId: string) {
    return this.treeService.buildPropagationTree(fileId);
  }
}
