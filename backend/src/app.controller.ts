import { Controller, Get, Post, Body, Param, Query, Res, Delete, Patch } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('auth/login')
  login(@Body() body: any) {
    return this.appService.login(body);
  }

  @Post('auth/change-password')
  changePassword(@Body() body: any) {
    return this.appService.changePassword(body);
  }

  @Post('accounts/connect')
  connectAccount(@Body() body: any) {
    return this.appService.connectAccount(body);
  }

  @Get('accounts')
  getAccounts() {
    return this.appService.getAccounts();
  }

  @Delete('accounts/:id')
  disconnectAccount(@Param('id') id: string) {
    return this.appService.disconnectAccount(Number(id));
  }

  @Patch('accounts/:id')
  updateAccount(@Param('id') id: string, @Body() body: any) {
    return this.appService.updateAccount(Number(id), body);
  }

  @Get('managers')
  getManagers() {
    return this.appService.getManagers();
  }

  @Post('managers')
  createManager(@Body() body: any) {
    return this.appService.createManager(body);
  }

  @Delete('managers/:id')
  deleteManager(@Param('id') id: string) {
    return this.appService.deleteManager(Number(id));
  }

  @Get('analytics/:id')
  getAnalytics(@Param('id') id: string) {
    return this.appService.getAnalytics(Number(id));
  }

  @Get('auth/linkedin')
  linkedinLogin(@Res() res: Response) {
    return this.appService.linkedinLogin(res);
  }

  @Get('auth/linkedin/callback')
  linkedinCallback(@Query() query: any, @Res() res: Response) {
    return this.appService.linkedinCallback(query, res);
  }
}
