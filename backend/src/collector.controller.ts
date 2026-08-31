import { Controller, Post, Query, Get } from '@nestjs/common';
import { CollectorService } from './collector.service';

@Controller('api/linkedin')
export class CollectorController {
  constructor(private readonly collectorService: CollectorService) {}

  @Post('collect')
  collectData(@Query('accountId') accountId: number) {
    return this.collectorService.collectData(accountId);
  }
}
