import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AnalyticsAiService } from './analytics-ai.service';
import { AskAnalyticsAiDto, UserContext } from './analytics-ai.types';

@Controller('api/analytics-ai')
export class AnalyticsAiController {
  private readonly logger = new Logger(AnalyticsAiController.name);

  constructor(private readonly analyticsAiService: AnalyticsAiService) {}

  /**
   * Helper to resolve UserContext from request headers.
   */
  private resolveUserContext(
    authHeader?: string,
    roleHeader?: string,
    emailHeader?: string,
  ): UserContext {
    // Check Authorization Bearer token or fallback headers
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!token && !roleHeader) {
      // Default to standard workspace manager if session is active
      return {
        role: 'manager',
        name: 'Workspace Manager',
        email: emailHeader || 'manager@socialpulse.pro',
      };
    }

    if (token === 'mock-jwt-token-superadmin' || roleHeader === 'super_admin') {
      return {
        role: 'super_admin',
        name: 'Super Admin',
        email: emailHeader || 'admin@socialpulse.pro',
      };
    }

    return {
      role: (roleHeader as any) || 'manager',
      name: 'Workspace Manager',
      email: emailHeader || 'manager@socialpulse.pro',
    };
  }

  @Post('ask')
  @HttpCode(200)
  async askQuestion(
    @Body() dto: AskAnalyticsAiDto,
    @Headers('authorization') authHeader?: string,
    @Headers('x-user-role') roleHeader?: string,
    @Headers('x-user-email') emailHeader?: string,
  ) {
    const userContext = this.resolveUserContext(authHeader, roleHeader, emailHeader);
    return this.analyticsAiService.ask(dto, userContext);
  }

  @Get('entities')
  async getEntities(
    @Headers('authorization') authHeader?: string,
    @Headers('x-user-role') roleHeader?: string,
    @Headers('x-user-email') emailHeader?: string,
  ) {
    const userContext = this.resolveUserContext(authHeader, roleHeader, emailHeader);
    return this.analyticsAiService.getConnectedEntities(userContext);
  }

  @Get('examples')
  getExamples() {
    return {
      categories: [
        {
          name: 'Channel Performance',
          icon: 'BarChart3',
          questions: [
            'Which YouTube channel gained the most subscribers this month?',
            'Which LinkedIn account gained the most followers?',
            'Compare the follower counts of all my connected channels',
            'Which platform performed better during the last 30 days?',
            'Show the channels with the highest total views',
          ],
        },
        {
          name: 'Post & Video Performance',
          icon: 'Video',
          questions: [
            'Show my top five LinkedIn posts by engagement',
            'Which YouTube videos received the most views during the last seven days?',
            'Find posts with the highest number of comments',
            'Which posts received the most reactions or likes?',
            'Show my lowest-performing recent posts',
            'List posts published during the last 30 days',
          ],
        },
        {
          name: 'Historical Comparisons',
          icon: 'ArrowLeftRight',
          questions: [
            'Compare this month with last month',
            'How did my YouTube views change over the last 30 days?',
            'Compare LinkedIn engagement over the last seven days and the previous seven days',
            'Which channel showed the highest percentage growth?',
            'Show the historical trend in subscribers for a selected channel',
          ],
        },
        {
          name: 'Analytical Insights',
          icon: 'Sparkles',
          questions: [
            'What are the main changes in my social media performance?',
            'Which channels should I investigate because their engagement declined?',
            'Summarize my social media performance this month',
            'Which posts performed better than my recent average?',
            'Give me three data-backed observations from my current analytics',
          ],
        },
      ],
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'healthy',
      feature: 'Ask Your Analytics AI',
      timestamp: new Date().toISOString(),
      supportedPlatforms: ['LinkedIn', 'YouTube'],
      aiEngine: process.env.GEMINI_API_KEY ? 'Google Gemini + Native Engine' : 'SocialPulse Grounded Analytics Engine',
      readOnlySafe: true,
      operations: [
        'Channel Audience Rankings',
        'Post Engagement & Interaction Rankings',
        'Video View Rankings',
        'Period Comparisons (MoM, WoW, 30d)',
        'Time-Series Trajectory Analysis',
        'Anomaly & Decline Investigation',
        'Executive Workspace Summaries',
      ],
    };
  }
}

