import { Controller, Post, Query, Get } from '@nestjs/common';
import { CollectorService } from './collector.service';

@Controller('api/linkedin')
export class CollectorController {
  constructor(private readonly collectorService: CollectorService) {}

  @Post('collect')
  collectData(@Query('accountId') accountId: number) {
    return this.collectorService.collectData(accountId);
  }

  @Get('posts')
  getPosts(
    @Query('accountId') accountId: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.collectorService.getPosts(Number(accountId), {
      search,
      sort,
      order: order === 'ASC' ? 'ASC' : 'DESC',
      page: page ? Math.max(1, Number(page)) : 1,
      limit: limit ? Math.max(1, Number(limit)) : 10,
    });
  }
}

