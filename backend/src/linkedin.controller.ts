import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { LinkedinService } from './linkedin.service';

@Controller('api/linkedin')
export class LinkedinController {
  constructor(private readonly linkedinService: LinkedinService) {}

  @Get('me')
  getMe(@Query('accountId') accountId: number) {
    return this.linkedinService.getMe(accountId);
  }

  @Get('organizations')
  getOrganizations(@Query('accountId') accountId: number) {
    return this.linkedinService.getOrganizations(accountId);
  }

  @Get('company/:orgId')
  getCompany(@Param('orgId') orgId: string, @Query('accountId') accountId: number) {
    return this.linkedinService.getCompany(orgId, accountId);
  }

  @Get('company/:orgId/followers')
  getCompanyFollowers(@Param('orgId') orgId: string, @Query('accountId') accountId: number) {
    return this.linkedinService.getCompanyFollowers(orgId, accountId);
  }

  @Get('company/:orgId/page-statistics')
  getCompanyPageStatistics(@Param('orgId') orgId: string, @Query('accountId') accountId: number) {
    return this.linkedinService.getCompanyPageStatistics(orgId, accountId);
  }

  @Get('company/:orgId/posts')
  getPosts(@Param('orgId') orgId: string, @Query('accountId') accountId: number) {
    return this.linkedinService.getPosts(orgId, accountId);
  }

  @Get('posts/:postUrn/reactions')
  getPostReactions(@Param('postUrn') postUrn: string, @Query('accountId') accountId: number) {
    return this.linkedinService.getPostReactions(postUrn, accountId);
  }

  @Get('posts/:postUrn/comments')
  getPostComments(@Param('postUrn') postUrn: string, @Query('accountId') accountId: number) {
    return this.linkedinService.getPostComments(postUrn, accountId);
  }

  @Post('sync')
  syncData(@Query('accountId') accountId: number, @Query('orgId') orgId: string) {
    return this.linkedinService.syncData(accountId, orgId);
  }
}
