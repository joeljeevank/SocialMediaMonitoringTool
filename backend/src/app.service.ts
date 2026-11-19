import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
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
    const username = (body.username || '').trim();
    const password = (body.password || '').trim();

    if (!username || !password) {
      throw new UnauthorizedException('Please enter both username and password.');
    }

    const lowerUser = username.toLowerCase();

    // Fast path for default admin credential
    if (lowerUser === 'admin' && password === 'admin123') {
      const adminUser = await this.userRepo.findOne({
        where: [{ email: 'admin' }, { email: 'admin@example.com' }],
      }).catch(() => null);

      return {
        access_token: 'mock-jwt-token-superadmin',
        role: 'super_admin',
        email: adminUser?.email || 'admin@example.com',
        name: adminUser?.name || 'Super Admin',
        companyName: adminUser?.companyName || 'System Enterprise',
        companyRole: adminUser?.companyRole || 'Administrator',
      };
    }

    // Direct DB lookup for admin or regular system users
    const user = await this.userRepo.findOne({
      where: [
        { email: ILike(username) },
        { name: ILike(username) },
      ],
    });

    if (user && user.password === password) {
      return {
        access_token: user.role === 'super_admin' ? 'mock-jwt-token-superadmin' : 'mock-jwt-token-manager',
        role: user.role,
        name: user.name,
        companyName: user.companyName,
        companyRole: user.companyRole,
        email: user.email,
      };
    }

    throw new UnauthorizedException('Invalid username or password.');
  }

  async getManagers() {
    return this.userRepo.find();
  }

  async createManager(data: {
    name: string;
    companyName: string;
    companyRole?: string;
    phone: string;
    email: string;
    role?: string;
  }) {
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanName = (data.name || '').trim();
    const cleanCompany = (data.companyName || '').trim();
    const cleanRole = data.role || 'manager';

    if (!cleanEmail) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('Please provide a valid email address.');
    }

    // Check if user already exists
    const existingUser = await this.userRepo.findOne({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('A user with this email already exists.');
    }

    // Generate a simple 8-character password
    const generatedPassword = Math.random().toString(36).slice(-8);

    const newUser = this.userRepo.create({
      name: cleanName,
      companyName: cleanCompany,
      companyRole: data.companyRole?.trim(),
      role: cleanRole,
      phone: data.phone?.trim(),
      email: cleanEmail,
      password: generatedPassword,
    });

    await this.userRepo.save(newUser);

    // Setup Nodemailer with resilient SMTP delivery
    const emailResult = await this.sendAccountEmail(
      cleanEmail,
      cleanName,
      generatedPassword,
      cleanRole,
    );

    return {
      ...newUser,
      generatedPassword,
      emailSent: emailResult.success,
      emailError: emailResult.error || null,
    };
  }

  /**
   * Helper to send account credentials email with multiple SMTP fallback strategies
   */
  async sendAccountEmail(
    toEmail: string,
    name: string,
    password: string,
    role: string,
  ): Promise<{ success: boolean; error?: string }> {
    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, '').trim();

    const cleanTo = (toEmail || '').trim().toLowerCase();
    const cleanName = (name || 'User').trim();

    if (!emailUser || !emailPass) {
      const msg = 'EMAIL_USER or EMAIL_PASS environment variable is not configured in backend/.env';
      console.warn(`[AppService.sendAccountEmail] ${msg}`);
      return { success: false, error: msg };
    }

    const host = process.env.EMAIL_HOST?.trim();
    const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : undefined;
    const secure = process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === 'true' : (port === 465);
    const fromSender = process.env.EMAIL_FROM?.trim() || `"SocialPulse Workspace" <${emailUser}>`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 700;">SocialPulse <span style="color: #6366f1;">PRO</span></h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Social Media Monitoring & Telemetry Suite</p>
        </div>

        <p style="color: #1e293b; font-size: 14px; line-height: 1.6;">Hello <strong>${cleanName}</strong>,</p>
        <p style="color: #475569; font-size: 13px; line-height: 1.6;">You have been registered for a <strong>${role}</strong> account on SocialPulse PRO. You can sign in using the credentials below:</p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="color: #64748b; padding: 6px 0; width: 140px; font-weight: 500;">Username / Email:</td>
              <td style="color: #0f172a; padding: 6px 0; font-weight: 600; font-family: monospace;">${cleanTo}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Temporary Password:</td>
              <td style="color: #4f46e5; padding: 6px 0; font-weight: 700; font-family: monospace; font-size: 15px;">${password}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Assigned Role:</td>
              <td style="color: #0f172a; padding: 6px 0; font-weight: 600; text-transform: capitalize;">${role}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${frontendUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 600; display: inline-block;">
            Sign In to Dashboard →
          </a>
        </div>

        <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
          For security, please change your temporary password after logging in.<br />
          This is an automated system notification from SocialPulse.
        </p>
        <p style="color: #94a3b8; font-size: 11px; margin-top: 10px; line-height: 1.4;">
          Tip: If this email was delivered to your Spam or Promotions folder, please mark it as "Not Spam" or move it to your Primary Inbox to ensure you receive future alerts.
        </p>
      </div>
    `;

    const mailOptions = {
      from: fromSender,
      to: cleanTo,
      replyTo: emailUser,
      subject: 'Welcome to SocialPulse PRO - Your Workspace Invitation',
      text: `Hello ${cleanName},\n\nYour ${role} account for SocialPulse has been created.\n\nUsername: ${cleanTo}\nTemporary Password: ${password}\n\nPlease sign in at: ${frontendUrl}\n\n(Note: If this email landed in your Spam/Junk folder, please mark it as "Not Spam" to receive future notifications).`,
      html: htmlContent,
      headers: {
        'X-Mailer': 'SocialPulse PRO Mailer',
        'X-Priority': '3',
      },
    };

    // Candidate transport configurations to try in sequence
    const configs: nodemailer.TransportOptions[] = [];

    if (host) {
      configs.push({
        host,
        port: port || 587,
        secure: secure ?? false,
        auth: { user: emailUser, pass: emailPass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      } as any);
    } else {
      // 1. Direct Gmail SMTP port 465 (SSL)
      configs.push({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: emailUser, pass: emailPass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      } as any);

      // 2. Direct Gmail SMTP port 587 (TLS/STARTTLS)
      configs.push({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: emailUser, pass: emailPass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      } as any);

      // 3. Nodemailer service: 'gmail'
      configs.push({
        service: 'gmail',
        auth: { user: emailUser, pass: emailPass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      } as any);
    }

    let lastError: any = null;

    for (let i = 0; i < configs.length; i++) {
      try {
        console.log(`[AppService.sendAccountEmail] Attempting dispatch (${i + 1}/${configs.length}) from ${emailUser} to ${toEmail}...`);
        const transporter = nodemailer.createTransport(configs[i]);
        await transporter.sendMail(mailOptions);
        console.log('[AppService.sendAccountEmail] Real email successfully delivered to: %s', toEmail);
        return { success: true };
      } catch (err: any) {
        lastError = err;
        console.warn(`[AppService.sendAccountEmail] Transport attempt ${i + 1} failed: ${err.message}`);
      }
    }

    console.error('[AppService.sendAccountEmail] All delivery attempts failed:', lastError);
    return { success: false, error: lastError?.message || 'SMTP delivery failed' };
  }

  /**
   * Diagnostic method to verify SMTP connectivity
   */
  async verifySmtp(): Promise<{ configured: boolean; valid: boolean; emailUser?: string; error?: string; code?: string }> {
    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, '').trim();

    if (!emailUser || !emailPass) {
      return {
        configured: false,
        valid: false,
        error: 'EMAIL_USER or EMAIL_PASS environment variable is missing in backend/.env',
      };
    }

    const host = process.env.EMAIL_HOST?.trim();
    const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : undefined;
    const secure = process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === 'true' : (port === 465);

    const transportConfig = host
      ? {
          host,
          port: port || 587,
          secure: secure ?? false,
          auth: { user: emailUser, pass: emailPass },
          tls: { rejectUnauthorized: false },
        }
      : {
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: emailUser, pass: emailPass },
          tls: { rejectUnauthorized: false },
        };

    try {
      const transporter = nodemailer.createTransport(transportConfig as any);
      await transporter.verify();
      return { configured: true, valid: true, emailUser };
    } catch (err: any) {
      return {
        configured: true,
        valid: false,
        emailUser,
        error: err.message,
        code: err.code,
      };
    }
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

  private accountsCache: { data: any; timestamp: number } | null = null;

  public invalidateAccountsCache() {
    this.accountsCache = null;
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
    this.invalidateAccountsCache();
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
    this.invalidateAccountsCache();
    return account;
  }

  async connectAccount(data: { platform: string; username: string }) {
    const platform = data.platform || 'LinkedIn';
    const cleanUsername = data.username.trim().replace(/^@/, '').replace(/\/+$/, '');

    const existing = await this.accountRepo.findOne({
      where: {
        platform,
        username: cleanUsername,
      },
      relations: {
        analytics: true,
      },
    });

    if (existing) {
      return existing;
    }

    const newAccount = this.accountRepo.create({
      platform,
      username: cleanUsername,
      profileUrl: `https://linkedin.com/in/${cleanUsername}`,
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
      account: saved,
    });
    await this.analyticsRepo.save([initialAnalytics]);
    this.invalidateAccountsCache();

    return saved;
  }

  async getAccounts() {
    if (this.accountsCache && Date.now() - this.accountsCache.timestamp < 15000) {
      return this.accountsCache.data;
    }
    const accounts = await this.accountRepo.find({
      relations: {
        analytics: true,
      },
      order: {
        analytics: {
          id: 'ASC',
        },
      },
    });
    this.accountsCache = { data: accounts, timestamp: Date.now() };
    return accounts;
  }

  async getAnalytics(accountId: number) {
    return this.analyticsRepo.find({
      where: { account: { id: accountId } },
      order: { date: 'ASC', id: 'ASC' },
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
        },
      );

      const accessToken = response.data.access_token;

      // Fetch real user info from LinkedIn
      const userInfoResponse = await axios.get(
        'https://api.linkedin.com/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

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
        const networkResponse = await axios.get(
          `https://api.linkedin.com/v2/networkSizes/urn:li:person:${linkedinId}?edgeType=Follower`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'LinkedIn-Version': '202304',
            },
          },
        );
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
      let account = await this.accountRepo.findOne({
        where: { username: name },
      });
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
          accessToken: accessToken, // Saving the access token securely
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
          account: account,
        });
        await this.analyticsRepo.save([initialAnalytics]);
      }

      // Redirect back to dashboard
      return res.redirect(
        `http://localhost:3000/dashboard?token=${accessToken}&status=success`,
      );
    } catch (error: any) {
      console.error(
        'LinkedIn OAuth Error:',
        error.response?.data || error.message,
      );
      return res.status(500).send('OAuth failed');
    }
  }

  async changePassword(body: any) {
    const { email, currentPassword, newPassword, role } = body || {};

    if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
      throw new BadRequestException('Please enter your current password.');
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long.');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from your current password.');
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const isAdmin =
      cleanEmail === 'admin' ||
      cleanEmail === 'admin@example.com' ||
      role === 'super_admin' ||
      !cleanEmail;

    if (isAdmin) {
      const adminUser = await this.userRepo.findOne({
        where: [
          { email: 'admin' },
          { email: 'admin@example.com' },
          { role: 'super_admin' }
        ],
      }).catch(() => null);

      if (adminUser) {
        if (adminUser.password !== currentPassword) {
          throw new BadRequestException('The current password you entered is incorrect. Please try again.');
        }
        adminUser.password = newPassword;
        await this.userRepo.save(adminUser);
        return { success: true, message: 'Password updated successfully' };
      } else {
        // Bootstrap admin account check
        if (currentPassword === 'admin123') {
          const newAdmin = this.userRepo.create({
            email: cleanEmail || 'admin@example.com',
            password: newPassword,
            role: 'super_admin',
            name: 'Super Admin',
            companyName: 'System',
            phone: '0000000000',
          });
          await this.userRepo.save(newAdmin);
          return { success: true, message: 'Password updated successfully' };
        } else {
          throw new BadRequestException('The current password you entered is incorrect. Please try again.');
        }
      }
    }

    // Lookup manager or general user
    const user = await this.userRepo.findOne({
      where: [
        { email: ILike(cleanEmail) },
        { name: ILike(cleanEmail) }
      ],
    }).catch(() => null);

    if (!user) {
      // Check if it matches the fallback super admin account
      const fallbackAdmin = await this.userRepo.findOne({
        where: [{ role: 'super_admin' }, { email: 'admin' }, { email: 'admin@example.com' }]
      }).catch(() => null);

      if (fallbackAdmin && fallbackAdmin.password === currentPassword) {
        fallbackAdmin.password = newPassword;
        await this.userRepo.save(fallbackAdmin);
        return { success: true, message: 'Password updated successfully' };
      }

      throw new BadRequestException('The current password you entered is incorrect. Please try again.');
    }

    if (user.password !== currentPassword) {
      throw new BadRequestException('The current password you entered is incorrect. Please try again.');
    }

    user.password = newPassword;
    await this.userRepo.save(user);

    return { success: true, message: 'Password updated successfully' };
  }
}
