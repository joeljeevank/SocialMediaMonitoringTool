import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './account.entity';
import { Analytics } from './analytics.entity';
import { User } from './user.entity';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import type { Response } from 'express';

dotenv.config();

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(Analytics) private analyticsRepo: Repository<Analytics>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async login(body: any) {
    if (body.username === 'admin') {
      const adminUser = await this.userRepo.findOne({ where: { email: 'admin' } });
      if (adminUser) {
        if (adminUser.password === body.password) {
           return { 
             access_token: 'mock-jwt-token-superadmin', 
             role: 'super_admin', 
             email: adminUser.email,
             name: adminUser.name || 'Admin',
             companyName: adminUser.companyName || 'System',
             companyRole: adminUser.companyRole || 'Administrator'
           };
        }
        throw new UnauthorizedException('Invalid credentials');
      } else if (body.password === 'admin123') {
        return { 
          access_token: 'mock-jwt-token-superadmin', 
          role: 'super_admin', 
          email: 'admin',
          name: 'Super Admin',
          companyName: 'System',
          companyRole: 'Administrator'
        };
      }
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const user = await this.userRepo.findOne({ where: { email: body.username } });
    if (user && user.password === body.password) {
      return { 
        access_token: 'mock-jwt-token-manager', 
        role: user.role, 
        name: user.name,
        companyName: user.companyName,
        companyRole: user.companyRole,
        email: user.email
      };
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  async getManagers() {
    return this.userRepo.find();
  }

  async createManager(data: { name: string; companyName: string; companyRole?: string; phone: string; email: string; role?: string }) {
    // Check if user already exists
    const existingUser = await this.userRepo.findOne({ where: { email: data.email } });
    if (existingUser) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('A user with this email already exists.');
    }

    // Generate a simple 8-character password
    const generatedPassword = Math.random().toString(36).slice(-8);

    const newUser = this.userRepo.create({
      name: data.name,
      companyName: data.companyName,
      companyRole: data.companyRole,
      role: data.role || 'user',
      phone: data.phone,
      email: data.email,
      password: generatedPassword
    });

    await this.userRepo.save(newUser);

    // Setup Nodemailer with real SMTP
    try {
      let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER, 
          pass: process.env.EMAIL_PASS,
        },
      });

      let info = await transporter.sendMail({
        from: `"MonitorHQ Admin" <${process.env.EMAIL_USER}>`,
        to: data.email,
        subject: "Your Manager Account Details",
        text: `Hello ${data.name},\n\nYour manager account for MonitorHQ has been created.\n\nUsername: ${data.email}\nPassword: ${generatedPassword}\n\nPlease login and connect your LinkedIn account.`,
        html: `<p>Hello ${data.name},</p><p>Your manager account for MonitorHQ has been created.</p><p><b>Username:</b> ${data.email}<br/><b>Password:</b> ${generatedPassword}</p><p>Please login and connect your LinkedIn account.</p>`,
      });

      console.log("Real email successfully sent to: %s", data.email);
    } catch (err) {
      console.error("Failed to send real email:", err);
    }

    return newUser;
  }

  async deleteManager(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      const { NotFoundException } = require('@nestjs/common');
      throw new NotFoundException('User not found');
    }
    await this.userRepo.remove(user);
    return { success: true };
  }

  async disconnectAccount(id: number) {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) {
      const { NotFoundException } = require('@nestjs/common');
      throw new NotFoundException('Account not found');
    }
    // Delete associated analytics first to prevent foreign key constraint failures
    await this.analyticsRepo.delete({ account: { id } });
    // Now delete the account
    await this.accountRepo.remove(account);
    return { success: true };
  }

  async updateAccount(id: number, data: any) {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) {
      const { NotFoundException } = require('@nestjs/common');
      throw new NotFoundException('Account not found');
    }
    if (data.profileUrl) {
      account.profileUrl = data.profileUrl;
    }
    await this.accountRepo.save(account);
    return account;
  }

  async connectAccount(data: { platform: string; username: string }) {
    const newAccount = this.accountRepo.create({
      platform: data.platform || 'LinkedIn',
      username: data.username,
      profileUrl: `https://linkedin.com/in/${data.username}`,
      status: 'Connected',
    });
    
    const saved = await this.accountRepo.save(newAccount);
    
    // Seed initial analytics with zeros instead of mock data
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const initialAnalytics = this.analyticsRepo.create({
      date: dateStr,
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      followers: 0,
      recentPosts: 0,
      account: saved
    });
    await this.analyticsRepo.save([initialAnalytics]);

    return saved;
  }

  async getAccounts() {
    return this.accountRepo.find({
      relations: {
        analytics: true
      },
    });
  }

  async getAnalytics(accountId: number) {
    return this.analyticsRepo.find({
      where: { account: { id: accountId } },
      order: { date: 'ASC' },
    });
  }

  linkedinLogin(res: Response) {
    const clientId = process.env.LINKEDIN_CLIENT_ID || '';
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || '';
    // Requesting standard openid scopes as marketing scopes require approved app products
    const scope = 'openid profile email'; 
    const state = 'random_string_for_security';
    
    const authorizationUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
    
    return res.redirect(authorizationUrl);
  }

  async linkedinCallback(query: any, res: Response) {
    const { code, error, error_description } = query;
    
    if (error) {
      console.error('LinkedIn OAuth Denied/Failed:', error, error_description);
      return res.status(400).send(`OAuth Error: ${error_description || error}`);
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

    try {
      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        null,
        {
          params: {
            grant_type: 'authorization_code',
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const accessToken = response.data.access_token;
      
      // Fetch real user info from LinkedIn
      const userInfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      const linkedinId = userInfoResponse.data.sub;
      const name = userInfoResponse.data.name;
      
      // Attempt to get followers/stats if possible, but standard API won't allow this without specific products.
      // We will try catching it, and if it fails, fallback to generating data for the newly created account.
      let followers = 0;
      let likes = 0;
      let comments = 0;
      let shares = 0;
      let views = 0;
      let recentPosts = 0;
      
      try {
         // This is a pseudo-call for what you'd do with proper permissions
         const networkResponse = await axios.get(`https://api.linkedin.com/v2/networkSizes/urn:li:person:${linkedinId}?edgeType=Follower`, {
           headers: { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': '202304' }
         });
         followers = networkResponse.data.firstDegreeSize || 0;
      } catch (e) {
         // API doesn't have permission for these extended scopes, fallback to zeros (no mock data)
         followers = 0;
         likes = 0;
         comments = 0;
         shares = 0;
         views = 0;
         recentPosts = 0;
      }

      // Check if account already exists
      let account = await this.accountRepo.findOne({ where: { username: name }});
      if (account) {
        // Update access token if account exists
        account.accessToken = accessToken;
        await this.accountRepo.save(account);
      } else {
        account = this.accountRepo.create({
          platform: 'LinkedIn',
          username: name,
          profileUrl: `https://linkedin.com/in/${linkedinId}`,
          status: 'Connected',
          accessToken: accessToken // Saving the access token securely
        });
        account = await this.accountRepo.save(account);
        
        // Seed initial real stats for the new account (no mock data)
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const initialAnalytics = this.analyticsRepo.create({
          date: dateStr,
          likes: likes,
          comments: comments,
          shares: shares,
          views: views,
          followers: followers,
          recentPosts: recentPosts,
          account: account
        });
        await this.analyticsRepo.save([initialAnalytics]);
      }
      
      // Redirect back to dashboard
      return res.redirect(`http://localhost:3000/dashboard?token=${accessToken}&status=success`);
    } catch (error: any) {
      console.error('LinkedIn OAuth Error:', error.response?.data || error.message);
      return res.status(500).send('OAuth failed');
    }
  }

  async changePassword(body: any) {
    const { email, currentPassword, newPassword } = body;

    if (email === 'admin') {
      const adminUser = await this.userRepo.findOne({ where: { email: 'admin' } });
      if (adminUser) {
        if (adminUser.password !== currentPassword) {
          throw new UnauthorizedException('Invalid current password');
        }
        adminUser.password = newPassword;
        await this.userRepo.save(adminUser);
        return { success: true };
      } else {
        if (currentPassword === 'admin123') {
          const newAdmin = this.userRepo.create({
            email: 'admin',
            password: newPassword,
            role: 'super_admin',
            name: 'Super Admin',
            companyName: 'System',
            phone: '0000000000'
          });
          await this.userRepo.save(newAdmin);
          return { success: true };
        } else {
          throw new UnauthorizedException('Invalid current password');
        }
      }
    }

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    if (user.password !== currentPassword) {
      throw new UnauthorizedException('Invalid current password');
    }

    user.password = newPassword;
    await this.userRepo.save(user);

    return { success: true };
  }
}
