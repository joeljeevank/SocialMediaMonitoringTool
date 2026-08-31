import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './account.entity';
import { Organization } from './organization.entity';
import { Post } from './post.entity';
import { Analytics } from './analytics.entity';
import axios from 'axios';

@Injectable()
export class LinkedinService {
  constructor(
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(Analytics) private analyticsRepo: Repository<Analytics>,
  ) {}

  private async getAccount(accountId: number): Promise<Account> {
    const account = await this.accountRepo.findOne({ where: { id: accountId } });
    if (!account || !account.accessToken) {
      throw new UnauthorizedException('Account not found or not connected to LinkedIn');
    }
    return account;
  }

  private getHeaders(accessToken: string) {
    return {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': '202401', // Use current versioned API
    };
  }

  async getMe(accountId: number) {
    const account = await this.getAccount(accountId);
    try {
      const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      });
      return response.data;
    } catch (error: any) {
      throw new UnauthorizedException(error.response?.data || 'Failed to fetch user info');
    }
  }

  async getOrganizations(accountId: number) {
    const account = await this.getAccount(accountId);
    try {
      // Find pages where user is ADMINISTRATOR
      // Requires: r_organization_admin or rw_organization_admin
      const response = await axios.get(
        'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED',
        { headers: this.getHeaders(account.accessToken) }
      );
      
      const elements = response.data.elements || [];
      const orgs = [];
      for (const el of elements) {
        // el.organization is usually URN like urn:li:organization:12345
        orgs.push(el.organization);
      }
      return { organizations: orgs };
    } catch (error: any) {
      console.error('LinkedIn API Error (getOrganizations):', error.response?.data || error.message);
      return { error: 'Missing permission r_organization_admin or Community Management API access', details: error.response?.data };
    }
  }

  async getCompany(orgUrn: string, accountId: number) {
    const account = await this.getAccount(accountId);
    try {
      // Fetch org details. Requires r_organization_admin
      const orgId = orgUrn.split(':').pop();
      const response = await axios.get(
        `https://api.linkedin.com/rest/organizations/${orgId}`,
        { headers: this.getHeaders(account.accessToken) }
      );
      return response.data;
    } catch (error: any) {
      return { error: 'Missing permission r_organization_admin', details: error.response?.data };
    }
  }

  async getCompanyFollowers(orgUrn: string, accountId: number) {
    const account = await this.getAccount(accountId);
    try {
      // Requires r_organization_admin
      const response = await axios.get(
        `https://api.linkedin.com/rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${orgUrn}`,
        { headers: this.getHeaders(account.accessToken) }
      );
      return response.data;
    } catch (error: any) {
      return { error: 'Missing permission r_organization_admin', details: error.response?.data };
    }
  }

  async getCompanyPageStatistics(orgUrn: string, accountId: number) {
    const account = await this.getAccount(accountId);
    try {
      // Requires r_organization_admin
      const response = await axios.get(
        `https://api.linkedin.com/rest/organizationPageStatistics?q=organization&organization=${orgUrn}`,
        { headers: this.getHeaders(account.accessToken) }
      );
      return response.data;
    } catch (error: any) {
      return { error: 'Missing permission r_organization_admin', details: error.response?.data };
    }
  }

  async getPosts(orgUrn: string, accountId: number) {
    const account = await this.getAccount(accountId);
    try {
      // Requires r_organization_admin
      const response = await axios.get(
        `https://api.linkedin.com/rest/posts?author=${orgUrn}&q=author`,
        { headers: this.getHeaders(account.accessToken) }
      );
      return response.data;
    } catch (error: any) {
      return { error: 'Missing permission r_organization_admin', details: error.response?.data };
    }
  }

  async getPostReactions(postUrn: string, accountId: number) {
    const account = await this.getAccount(accountId);
    try {
      // Requires r_organization_admin
      const response = await axios.get(
        `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/likes`,
        { headers: this.getHeaders(account.accessToken) }
      );
      return response.data;
    } catch (error: any) {
      return { error: 'Missing permission r_organization_admin', details: error.response?.data };
    }
  }

  async getPostComments(postUrn: string, accountId: number) {
    const account = await this.getAccount(accountId);
    try {
      // Requires r_organization_admin
      const response = await axios.get(
        `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/comments`,
        { headers: this.getHeaders(account.accessToken) }
      );
      return response.data;
    } catch (error: any) {
      return { error: 'Missing permission r_organization_admin', details: error.response?.data };
    }
  }

  // A generic sync endpoint to store real data if available
  async syncData(accountId: number, orgUrn: string) {
    // In a full implementation, you would call getCompany, getCompanyFollowers, getPosts here
    // and upsert them to this.orgRepo, this.postRepo, and this.analyticsRepo
    return { status: 'Sync triggered', accountId, orgUrn };
  }
}
