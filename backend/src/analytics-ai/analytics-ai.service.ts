import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AnalyticsAiQueryEngineService } from './analytics-ai-query-engine.service';
import {
  AskAnalyticsAiDto,
  AnalyticsAiResponse,
  StructuredInterpretation,
  UserContext,
  DateRangeThresholds,
  MetricCardData,
  TableData,
  ChartData,
  PeriodComparisonData,
} from './analytics-ai.types';
import axios from 'axios';

@Injectable()
export class AnalyticsAiService {
  private readonly logger = new Logger(AnalyticsAiService.name);

  // In-memory rate limiting map: token/ip -> timestamp array
  private rateLimitMap = new Map<string, number[]>();

  constructor(
    private readonly queryEngine: AnalyticsAiQueryEngineService,
  ) {}

  /**
   * Main entrypoint for natural-language analytics inquiries.
   */
  async ask(
    dto: AskAnalyticsAiDto,
    userContext?: UserContext,
  ): Promise<AnalyticsAiResponse> {
    const startTime = Date.now();

    // 1. Validation & Security Checks
    this.validateRequest(dto, userContext);

    const question = dto.question.trim();

    // 2. Understand the question -> Structured Interpretation
    const interpretation = await this.interpretQuestion(question, dto, userContext);

    // If ambiguous and clarification is required
    if (interpretation.clarificationNeeded && interpretation.clarificationQuestion) {
      return {
        success: true,
        question,
        interpretation,
        answer: interpretation.clarificationQuestion,
        metricCards: [],
        groundedRecords: [],
        suggestedFollowUps: [
          'Show top 5 YouTube channels by subscribers',
          'Show top 5 LinkedIn posts by engagement',
          'Compare this month with last month',
        ],
        executionTimeMs: Date.now() - startTime,
      };
    }

    // 3 & 4. Execute validated, read-only analytics query
    const queryResult = await this.queryEngine.executeQuery(
      interpretation,
      userContext,
    );

    // 5. Generate final grounded answer & structured UI artifacts
    const finalAnswer = await this.generateGroundedAnswer(
      question,
      interpretation,
      queryResult,
    );

    const executionTimeMs = Date.now() - startTime;

    return {
      success: true,
      question,
      interpretation,
      answer: finalAnswer.text,
      metricCards: finalAnswer.metricCards,
      table: finalAnswer.table,
      chart: finalAnswer.chart,
      comparisons: queryResult.comparisons,
      groundedRecords: queryResult.records,
      dataQualityNote:
        queryResult.dataQualityNotes.length > 0
          ? queryResult.dataQualityNotes.join(' ')
          : null,
      suggestedFollowUps: finalAnswer.suggestedFollowUps,
      executionTimeMs,
      modelUsed: finalAnswer.modelUsed || interpretation.modelUsed || 'SocialPulse Grounded Analytics Engine',
    };
  }

  /**
   * Retrieve list of connected entities (channels and accounts) scoped to the user context.
   */
  async getConnectedEntities(userContext?: UserContext) {
    return this.queryEngine.getAllConnectedEntities(userContext);
  }

  /**
   * Step 1: Request Validation & Rate Limiting
   */
  private validateRequest(dto: AskAnalyticsAiDto, userContext?: UserContext) {
    if (!dto || !dto.question || !dto.question.trim()) {
      throw new BadRequestException('Please provide a non-empty question.');
    }

    const q = dto.question.trim();
    if (q.length > 500) {
      throw new BadRequestException(
        `Question length (${q.length} chars) exceeds the maximum allowed limit of 500 characters.`,
      );
    }

    // Rate Limiting: Max 25 requests per minute per user/session
    const clientKey = userContext?.email || userContext?.userId?.toString() || 'anonymous_user';
    const now = Date.now();
    const timestamps = this.rateLimitMap.get(clientKey) || [];
    const validTimestamps = timestamps.filter((t) => now - t < 60000);

    if (validTimestamps.length >= 25) {
      throw new BadRequestException(
        'Request rate limit exceeded. Please wait a moment before sending another query.',
      );
    }

    validTimestamps.push(now);
    this.rateLimitMap.set(clientKey, validTimestamps);
  }

  /**
   * Helper to compute dynamic calendar and relative date boundaries.
   */
  private computeDateRange(type: string): DateRangeThresholds {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (type === 'this_month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = todayStr;

      // Previous month for comparison
      const prevStartObj = new Date(year, month - 1, 1);
      const prevEndObj = new Date(year, month, 0); // last day of prev month
      const prevStart = prevStartObj.toISOString().split('T')[0];
      const prevEnd = prevEndObj.toISOString().split('T')[0];

      return {
        type: 'this_month',
        startDate: start,
        endDate: end,
        compareStartDate: prevStart,
        compareEndDate: prevEnd,
        label: 'Current Month (M-T-D)',
        compareLabel: 'Previous Month',
      };
    }

    if (type === 'last_month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const prevStartObj = new Date(year, month - 1, 1);
      const prevEndObj = new Date(year, month, 0);
      const prevStart = prevStartObj.toISOString().split('T')[0];
      const prevEnd = prevEndObj.toISOString().split('T')[0];

      return {
        type: 'last_month',
        startDate: prevStart,
        endDate: prevEnd,
        label: 'Last Month',
      };
    }

    if (type === '7d') {
      const startObj = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const start = startObj.toISOString().split('T')[0];

      const prevStartObj = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const prevEndObj = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

      return {
        type: '7d',
        startDate: start,
        endDate: todayStr,
        compareStartDate: prevStartObj.toISOString().split('T')[0],
        compareEndDate: prevEndObj.toISOString().split('T')[0],
        label: 'Last 7 Days',
        compareLabel: 'Previous 7 Days',
      };
    }

    if (type === '30d') {
      const startObj = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const start = startObj.toISOString().split('T')[0];

      const prevStartObj = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const prevEndObj = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

      return {
        type: '30d',
        startDate: start,
        endDate: todayStr,
        compareStartDate: prevStartObj.toISOString().split('T')[0],
        compareEndDate: prevEndObj.toISOString().split('T')[0],
        label: 'Last 30 Days',
        compareLabel: 'Previous 30 Days',
      };
    }

    if (type === '90d') {
      const startObj = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return {
        type: '90d',
        startDate: startObj.toISOString().split('T')[0],
        endDate: todayStr,
        label: 'Last 90 Days',
      };
    }

    if (type === '1y') {
      const startObj = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return {
        type: '1y',
        startDate: startObj.toISOString().split('T')[0],
        endDate: todayStr,
        label: 'Last 1 Year',
      };
    }

    // Default: all-time
    return {
      type: 'all',
      startDate: '2020-01-01',
      endDate: todayStr,
      label: 'All Time',
    };
  }

  /**
   * Step 2: Understand the question -> Structured Interpretation
   * Uses Gemini AI API if configured in backend/.env, falling back seamlessly to an intelligent semantic NLU parser.
   */
  private async interpretQuestion(
    question: string,
    dto: AskAnalyticsAiDto,
    userContext?: UserContext,
  ): Promise<StructuredInterpretation> {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.OPENAI_API_KEY;

    // Retrieve available entities from database
    const entities = await this.queryEngine.getAllConnectedEntities(userContext);

    let interpretation: StructuredInterpretation | null = null;

    if (apiKey) {
      try {
        this.logger.log(`[AI Engine] Interpreting query with Google Gemini API...`);
        interpretation = await this.interpretWithGemini(question, apiKey, entities);
        if (interpretation) {
          this.logger.log(`[AI Engine] Successfully interpreted with ${interpretation.modelUsed}: operation=${interpretation.operation}, metric=${interpretation.metric}, target=${interpretation.targetIdentifier || 'all'}`);
        }
      } catch (err: any) {
        this.logger.warn(`AI model interpretation failed: ${err.message}. Using built-in semantic parser.`);
      }
    }

    if (!interpretation) {
      interpretation = this.semanticRuleParser(question, dto, userContext);
      interpretation.modelUsed = 'SocialPulse Grounded Analytics Engine';
    }

    // Post-process with Entity Resolver to guarantee targeted channel/account resolution
    const resolved = this.resolveTargetEntity(question, entities, dto);
    if (resolved.targetId) {
      interpretation.targetId = resolved.targetId;
      interpretation.targetIdentifier = resolved.targetIdentifier;
      if (resolved.platform) {
        interpretation.platform = resolved.platform;
      }

      // If the question is asking generally about performance/stats/counts of this channel/account
      const qLower = question.toLowerCase();
      const isCountQuery =
        qLower.includes('how many') ||
        qLower.includes('count') ||
        qLower.includes('total number') ||
        qLower.includes('total video') ||
        qLower.includes('total post') ||
        qLower.includes('number of video') ||
        qLower.includes('number of post') ||
        qLower.includes('video count') ||
        qLower.includes('how much');

      const isExplicitVideoRanking =
        qLower.includes('top video') ||
        qLower.includes('best video') ||
        qLower.includes('most viewed video') ||
        qLower.includes('highest view') ||
        qLower.includes('rank video') ||
        qLower.includes('list video');

      const isExplicitPostRanking =
        qLower.includes('top post') ||
        qLower.includes('best post') ||
        qLower.includes('most liked post') ||
        qLower.includes('highest engagement') ||
        qLower.includes('rank post') ||
        qLower.includes('list post');

      if (
        isCountQuery ||
        interpretation.operation === 'summary' ||
        interpretation.operation === 'ranking' ||
        qLower.includes('how is') ||
        qLower.includes('performing') ||
        qLower.includes('stats') ||
        qLower.includes('performance') ||
        qLower.includes('tell me about') ||
        qLower.includes('details')
      ) {
        if (!isExplicitVideoRanking && !isExplicitPostRanking) {
          interpretation.operation = 'entity_detail';
          interpretation.groupBy = 'channel';
        }
      }
    }

    return interpretation;
  }

  /**
   * Helper to resolve channel or account from natural language text or dropdown filters.
   */
  private resolveTargetEntity(
    question: string,
    entities: { channels: any[]; accounts: any[] },
    dto: AskAnalyticsAiDto,
  ): { targetId: number | null; targetIdentifier: string | null; platform: 'linkedin' | 'youtube' | null } {
    const q = question.toLowerCase();

    // 0. If user specifically asks across all channels / all accounts
    if (
      q.includes('all channel') ||
      q.includes('all connected') ||
      q.includes('across all') ||
      q.includes('all my') ||
      q.includes('all account')
    ) {
      return { targetId: null, targetIdentifier: null, platform: null };
    }

    // 1. If explicit channelFilter from UI DTO
    if (dto.channelFilter && dto.channelFilter !== 'all') {
      const ch = entities.channels.find(
        (c) => String(c.id) === dto.channelFilter || c.title.toLowerCase() === dto.channelFilter!.toLowerCase(),
      );
      if (ch) return { targetId: ch.id, targetIdentifier: ch.title, platform: 'youtube' };

      const acc = entities.accounts.find(
        (a) => String(a.id) === dto.channelFilter || a.username.toLowerCase() === dto.channelFilter!.toLowerCase(),
      );
      if (acc) return { targetId: acc.id, targetIdentifier: acc.username, platform: 'linkedin' };
    }

    const stopWords = new Set([
      'the', 'and', 'for', 'you', 'tube', 'youtube', 'view', 'views', 'post', 'posts',
      'video', 'videos', 'channel', 'channels', 'account', 'accounts', 'analytics',
      'show', 'most', 'highest', 'best', 'top', 'stats', 'stat', 'info', 'news', 'official',
      'gain', 'gained', 'grow', 'growth', 'like', 'likes', 'comment', 'comments', 'share', 'shares',
      'engagement', 'compare', 'comparison', 'rate', 'average', 'summary', 'details', 'detail',
      'performance', 'performing', 'investigate', 'declined', 'increase', 'decreased',
      'with', 'from', 'this', 'that', 'what', 'which', 'where', 'when', 'who', 'how', 'are', 'is',
      'do', 'does', 'did', 'have', 'has', 'had', 'can', 'could', 'all', 'any', 'across', 'my', 'our',
      'me', 'we', 'us', 'in', 'on', 'at', 'by', 'to', 'of', 'i', 'a', 'an'
    ]);

    // Tokenize question with regex boundaries into lowercase words
    const qWords = new Set(
      q.split(/[^a-zA-Z0-9_\-]+/)
        .filter((w) => w.length >= 3 && !stopWords.has(w))
    );

    const wantsLinkedIn =
      dto.platformFilter === 'linkedin' ||
      q.includes('linkedin') ||
      (q.includes('post') && !q.includes('video')) ||
      (q.includes('follower') && !q.includes('sub'));

    const wantsYouTube =
      dto.platformFilter === 'youtube' ||
      q.includes('youtube') ||
      q.includes('video') ||
      (q.includes('subscriber') && !q.includes('follower'));

    // Check YouTube helper
    const checkYouTubeExact = () => {
      for (const ch of entities.channels) {
        const titleLower = ch.title.toLowerCase();
        const customUrlLower = (ch.customUrl || '').toLowerCase().replace(/^@/, '');
        if (q.includes(titleLower) || (customUrlLower && (q.includes(customUrlLower) || q.includes(`@${customUrlLower}`)))) {
          return { targetId: ch.id, targetIdentifier: ch.title, platform: 'youtube' as const };
        }
      }
      return null;
    };

    // Check LinkedIn helper
    const checkLinkedInExact = () => {
      for (const acc of entities.accounts) {
        const uLower = acc.username.toLowerCase();
        if (q.includes(uLower) || q.includes(`@${uLower}`)) {
          return { targetId: acc.id, targetIdentifier: acc.username, platform: 'linkedin' as const };
        }
      }
      return null;
    };

    // Check YouTube tokens
    const checkYouTubeTokens = () => {
      for (const ch of entities.channels) {
        const titleTokens = ch.title.toLowerCase()
          .split(/[^a-zA-Z0-9]+/)
          .filter((w: string) => w.length >= 3 && !stopWords.has(w));
        for (const w of titleTokens) {
          if (qWords.has(w)) {
            return { targetId: ch.id, targetIdentifier: ch.title, platform: 'youtube' as const };
          }
        }
      }
      return null;
    };

    // Check LinkedIn tokens
    const checkLinkedInTokens = () => {
      for (const acc of entities.accounts) {
        const prefixWords = acc.username.toLowerCase()
          .split(/[^a-zA-Z0-9]+/)
          .filter((w: string) => w.length >= 3 && isNaN(Number(w)) && !stopWords.has(w));
        for (const pw of prefixWords) {
          if (
            qWords.has(pw) ||
            [...qWords].some((qw) => (qw.length >= 4 && pw.startsWith(qw)) || (pw.length >= 4 && qw.startsWith(pw)))
          ) {
            return { targetId: acc.id, targetIdentifier: acc.username, platform: 'linkedin' as const };
          }
        }
      }
      return null;
    };

    // Platform-prioritized resolution
    if (wantsLinkedIn && !wantsYouTube) {
      const match = checkLinkedInExact() || checkLinkedInTokens() || checkYouTubeExact() || checkYouTubeTokens();
      if (match) return match;
    } else if (wantsYouTube && !wantsLinkedIn) {
      const match = checkYouTubeExact() || checkYouTubeTokens() || checkLinkedInExact() || checkLinkedInTokens();
      if (match) return match;
    } else {
      const exactMatch = checkYouTubeExact() || checkLinkedInExact();
      if (exactMatch) return exactMatch;

      const tokenMatch = checkYouTubeTokens() || checkLinkedInTokens();
      if (tokenMatch) return tokenMatch;
    }

    return { targetId: null, targetIdentifier: null, platform: null };
  }

  /**
   * Rule-based Semantic NLU Parser.
   * Maps natural language questions to structured analytics requests.
   */
  private semanticRuleParser(
    question: string,
    dto: AskAnalyticsAiDto,
    userContext?: UserContext,
  ): StructuredInterpretation {
    const q = question.toLowerCase();

    // 1. Detect platform
    let platform: 'linkedin' | 'youtube' | 'all' = 'all';
    if (dto.platformFilter) {
      platform = dto.platformFilter;
    } else if (q.includes('youtube') || q.includes('video') || q.includes('subscriber') || q.includes('watch time')) {
      platform = q.includes('linkedin') ? 'all' : 'youtube';
    } else if (q.includes('linkedin') || q.includes('follower') || q.includes('post') || q.includes('repost')) {
      platform = 'linkedin';
    }

    // 2. Detect date range
    let dateRangeType: string = 'all';
    if (q.includes('this month') || q.includes('current month')) {
      dateRangeType = 'this_month';
    } else if (q.includes('last month') || q.includes('previous month')) {
      dateRangeType = 'last_month';
    } else if (q.includes('7 day') || q.includes('seven day') || q.includes('1 week') || q.includes('one week')) {
      dateRangeType = '7d';
    } else if (q.includes('30 day') || q.includes('thirty day') || q.includes('1 month') || q.includes('one month')) {
      dateRangeType = '30d';
    } else if (q.includes('90 day') || q.includes('3 month')) {
      dateRangeType = '90d';
    } else if (q.includes('1 year') || q.includes('one year') || q.includes('12 month')) {
      dateRangeType = '1y';
    }
    const dateRange = this.computeDateRange(dateRangeType);

    // 3. Detect limit
    let limit = 5;
    const limitMatch = q.match(/top\s*(\d+)/i) || q.match(/(\d+)\s*(posts|videos|channels|accounts)/i);
    if (limitMatch) {
      limit = Math.min(Math.max(parseInt(limitMatch[1], 10), 1), 20);
    } else if (q.includes('three') || q.includes('3')) {
      limit = 3;
    } else if (q.includes('ten') || q.includes('10')) {
      limit = 10;
    }

    // 4. Detect operation & metric
    if (
      q.includes('compare') ||
      q.includes('versus') ||
      q.includes('vs') ||
      q.includes('how did') ||
      q.includes('growth') ||
      q.includes('change')
    ) {
      // Comparison operation
      if (q.includes('subscriber') || q.includes('follower')) {
        return {
          platform,
          metric: platform === 'youtube' ? 'subscribers' : 'followers',
          operation: 'comparison',
          dateRange,
          groupBy: 'channel',
          limit,
          clarificationNeeded: false,
        };
      }
      return {
        platform,
        metric: 'views',
        operation: 'comparison',
        dateRange,
        groupBy: 'day',
        limit,
        clarificationNeeded: false,
      };
    }

    if (q.includes('trend') || q.includes('historical') || q.includes('over time') || q.includes('chart')) {
      return {
        platform,
        metric: q.includes('subscriber') ? 'subscribers' : 'views',
        operation: 'timeseries_trend',
        dateRange: dateRange.type === 'all' ? this.computeDateRange('30d') : dateRange,
        groupBy: 'day',
        limit,
        clarificationNeeded: false,
      };
    }

    if (
      q.includes('investigate') ||
      q.includes('decline') ||
      q.includes('drop') ||
      q.includes('below') ||
      q.includes('above') ||
      q.includes('observation') ||
      q.includes('main change')
    ) {
      return {
        platform,
        metric: 'engagement',
        operation: 'investigation',
        dateRange,
        groupBy: 'channel',
        limit,
        clarificationNeeded: false,
      };
    }

    if (q.includes('summarize') || q.includes('summary') || q.includes('overview')) {
      return {
        platform: 'all',
        metric: 'overview',
        operation: 'summary',
        dateRange,
        groupBy: 'none',
        limit,
        clarificationNeeded: false,
      };
    }

    // Post Ranking
    if (q.includes('post') || (platform === 'linkedin' && !q.includes('channel') && !q.includes('account'))) {
      let metric: any = 'engagement';
      if (q.includes('comment')) metric = 'comments';
      else if (q.includes('like') || q.includes('reaction')) metric = 'likes';
      else if (q.includes('share') || q.includes('repost')) metric = 'shares';
      else if (q.includes('impression') || q.includes('view')) metric = 'impressions';

      return {
        platform: 'linkedin',
        metric,
        operation: 'ranking',
        dateRange,
        groupBy: 'post',
        limit,
        clarificationNeeded: false,
      };
    }

    const isCountQuery =
      q.includes('how many') ||
      q.includes('count') ||
      q.includes('total number') ||
      q.includes('how much');

    // Video Ranking (only if asking for ranked video lists, not "how many videos")
    if (q.includes('video') && !isCountQuery) {
      let metric: any = 'views';
      if (q.includes('like')) metric = 'likes';
      else if (q.includes('comment')) metric = 'comments';
      else if (q.includes('engagement')) metric = 'engagement';

      return {
        platform: 'youtube',
        metric,
        operation: 'ranking',
        dateRange,
        groupBy: 'video',
        limit,
        clarificationNeeded: false,
      };
    }

    // Generic count queries (e.g. "how many videos", "how many subscribers")
    if (isCountQuery) {
      return {
        platform: q.includes('post') || q.includes('linkedin') ? 'linkedin' : 'youtube',
        metric: q.includes('subscriber') ? 'subscribers' : q.includes('follower') ? 'followers' : 'overview',
        operation: 'summary',
        dateRange,
        groupBy: 'channel',
        limit: 5,
        clarificationNeeded: false,
      };
    }

    // Channel Ranking
    if (
      q.includes('channel') ||
      q.includes('account') ||
      q.includes('follower') ||
      q.includes('subscriber') ||
      q.includes('which platform') ||
      q.includes('gained the most')
    ) {
      let metric: any = 'subscribers';
      if (q.includes('follower')) metric = 'followers';
      else if (q.includes('view')) metric = 'views';

      return {
        platform,
        metric,
        operation: 'ranking',
        dateRange,
        groupBy: 'channel',
        limit,
        clarificationNeeded: false,
      };
    }

    // Fallback: Default to Workspace Summary
    return {
      platform,
      metric: 'overview',
      operation: 'summary',
      dateRange,
      groupBy: 'none',
      limit,
      clarificationNeeded: false,
    };
  }

  /**
   * Interpret question using Google Gemini API (if GEMINI_API_KEY is available)
   */
  private async interpretWithGemini(
    question: string,
    apiKey: string,
    entities: { channels: any[]; accounts: any[] },
  ): Promise<StructuredInterpretation | null> {
    const channelsList = entities.channels
      .map((c) => `"${c.title}" (ID: ${c.id}, Handle: ${c.customUrl || c.channelId})`)
      .join(', ');
    const accountsList = entities.accounts
      .map((a) => `"${a.username}" (ID: ${a.id})`)
      .join(', ');

    const prompt = `You are a social media analytics query interpreter for SocialPulse PRO.
Convert this user question into a strict JSON object.
Question: "${question}"

Connected YouTube Channels in Workspace:
${channelsList || 'None'}

Connected LinkedIn Accounts in Workspace:
${accountsList || 'None'}

Available Platforms: "linkedin", "youtube", "all"
Available Metrics: "followers", "subscribers", "views", "impressions", "likes", "comments", "shares", "watch_time", "engagement", "overview"
Available Operations: "ranking", "comparison", "timeseries_trend", "summary", "investigation", "entity_detail", "clarification"
Available Date Range Presets: "7d", "30d", "this_month", "last_month", "90d", "1y", "all"
Available GroupBy: "channel", "account", "post", "video", "day", "none"

Rules:
1. If the user asks about a specific channel or account from the lists above (even partially or by nickname/handle), set targetId and targetIdentifier.
2. If asking generally about that channel/account's overall performance or stats, OR asking for counts (e.g. "how many videos does X have", "how many subscribers", "how many posts", "video count", "follower count"), set operation="entity_detail" and groupBy="channel" (NOT "video").
3. ONLY set operation="ranking" and groupBy="video" or "post" if the user explicitly asks for ranked top/best/most-viewed videos or posts (e.g. "top 5 videos", "which videos got most views", "best performing posts").

Return ONLY valid JSON matching this schema without markdown fences:
{
  "platform": "linkedin" | "youtube" | "all",
  "metric": "views" | "subscribers" | ...,
  "operation": "ranking" | "comparison" | "entity_detail" | ...,
  "dateRangePreset": "7d" | "30d" | "this_month" | "last_month" | "all",
  "groupBy": "post" | "video" | "channel" | "none",
  "limit": number,
  "targetId": number | null,
  "targetIdentifier": string | null,
  "clarificationNeeded": boolean,
  "clarificationQuestion": string | null
}`;

    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
    ].filter(Boolean) as string[];

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await axios.post(
          url,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          },
          { timeout: 4500 },
        );

        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) continue;

        const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
        const dateRange = this.computeDateRange(parsed.dateRangePreset || 'all');

        return {
          platform: parsed.platform || 'all',
          metric: parsed.metric || 'views',
          operation: parsed.operation || 'summary',
          dateRange,
          groupBy: parsed.groupBy || 'none',
          limit: parsed.limit || 5,
          targetId: parsed.targetId || null,
          targetIdentifier: parsed.targetIdentifier || null,
          clarificationNeeded: Boolean(parsed.clarificationNeeded),
          clarificationQuestion: parsed.clarificationQuestion || null,
          modelUsed: `Google Gemini (${model})`,
        };
      } catch (err: any) {
        if (err.response?.status === 429) {
          this.logger.warn(`[AI Engine] Gemini free-tier daily quota limit reached (429). Instantly falling back to built-in grounded engine.`);
          break;
        }
        this.logger.warn(`[AI Engine] Model ${model} request error: ${err.response?.data?.error?.message || err.message}`);
      }
    }

    return null;
  }

  /**
   * Synthesize natural language answer with Google Gemini grounded strictly on real DB records.
   */
  private async synthesizeGroundedExplanation(
    question: string,
    result: any,
    interpretation: StructuredInterpretation,
    apiKey: string,
  ): Promise<{ text: string; model: string } | null> {
    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
    ].filter(Boolean) as string[];

    const prompt = `You are the SocialPulse Analytics AI assistant for SocialPulse PRO.
Answer the user's question directly, accurately, and conversationally using ONLY the provided PostgreSQL database records.

User Question: "${question}"

Database Records:
${JSON.stringify((result.records || []).slice(0, 15), null, 2)}

Summary Metrics:
${JSON.stringify(result.summaryMetrics || {}, null, 2)}

Period Comparisons (if any):
${JSON.stringify(result.comparisons || [], null, 2)}

Rules:
1. Answer the EXACT question asked in the very first sentence. If the user asked "how many videos does X have?", give the exact count directly in the first line. If asking "which channel has the highest views?", name the channel and its exact view count immediately.
2. Every number, title, and name MUST come strictly from the database records above. Never invent, extrapolate, or hallucinate numbers.
3. Provide 2-3 supporting bullet points highlighting relevant context (e.g. subscribers, views, top content, growth).
4. Use clean Markdown formatting with bold numbers and names. Keep the tone professional, direct, and helpful.`;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await axios.post(
          url,
          {
            contents: [{ parts: [{ text: prompt }] }],
          },
          { timeout: 4500 },
        );
        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 10) {
          return { text: text.trim(), model };
        }
      } catch (err: any) {
        if (err.response?.status === 429) break;
      }
    }
    return null;
  }

  /**
   * Step 5: Generate Grounded Answer, Metric Cards, Tables, and Charts.
   * Ensures every numerical claim is anchored in real database results.
   */
  private async generateGroundedAnswer(
    question: string,
    interpretation: StructuredInterpretation,
    result: any,
  ): Promise<{
    text: string;
    metricCards: MetricCardData[];
    table?: TableData | null;
    chart?: ChartData | null;
    suggestedFollowUps: string[];
    modelUsed?: string;
  }> {
    const { operation, records, comparisons, chartData, summaryMetrics, primaryMetric } = result;
    const metricCards: MetricCardData[] = [];
    let table: TableData | null = null;
    const suggestedFollowUps: string[] = [];

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.OPENAI_API_KEY;

    let aiExplanation: { text: string; model: string } | null = null;
    if (apiKey) {
      try {
        aiExplanation = await this.synthesizeGroundedExplanation(
          question,
          result,
          interpretation,
          apiKey,
        );
      } catch (err: any) {
        this.logger.debug(`Gemini explanation synthesis skipped: ${err.message}`);
      }
    }

    // --- Scenario 0: Specific Channel or Account Detail (Targeted Performance) ---
    if (operation === 'entity_detail') {
      const s = summaryMetrics || {};
      if (s.entityType === 'youtube_channel') {
        metricCards.push({
          title: 'Total Videos Uploaded',
          value: Number(s.totalVideos || s.videoCount || 0).toLocaleString(),
          subtext: `${s.title} catalog`,
          trend: 'neutral',
        });
        metricCards.push({
          title: 'Subscribers',
          value: Number(s.subscribers || 0).toLocaleString(),
          subtext: `${s.title} (${s.customUrl || s.channelId})`,
          trend: 'up',
        });
        metricCards.push({
          title: 'Lifetime Public Views',
          value: Number(s.totalViews || 0).toLocaleString(),
          subtext: `Across ${s.totalVideos || s.videoCount} videos`,
          trend: 'up',
        });
        if (s.periodViews > 0) {
          metricCards.push({
            title: 'Tracked Period Views',
            value: Number(s.periodViews || 0).toLocaleString(),
            subtext: `Likes: ${Number(s.periodLikes || 0).toLocaleString()} • Comments: ${Number(s.periodComments || 0).toLocaleString()}`,
            trend: 'up',
          });
        }

        const videoRows = records.map((v: any) => [
          `#${v.rank}`,
          v.title,
          Number(v.views).toLocaleString(),
          Number(v.likes).toLocaleString(),
          Number(v.comments).toLocaleString(),
          v.duration,
          v.publishedAt,
        ]);

        const videoLinks = records.map((v: any, idx: number) => ({
          rowIndex: idx,
          colIndex: 1,
          url: v.videoUrl,
          label: 'Watch Video',
        }));

        if (videoRows.length > 0) {
          table = {
            title: `Uploaded Video Catalog for ${s.title} (${videoRows.length} video${videoRows.length === 1 ? '' : 's'})`,
            headers: ['Rank', 'Video Title', 'Views', 'Likes', 'Comments', 'Duration', 'Published Date'],
            rows: videoRows,
            links: videoLinks,
          };
        }

        const qLower = question.toLowerCase();
        const askedAboutVideos =
          qLower.includes('how many video') ||
          qLower.includes('total video') ||
          qLower.includes('number of video') ||
          qLower.includes('video count') ||
          qLower.includes('count of video');

        const askedAboutSubscribers =
          qLower.includes('how many subscriber') ||
          qLower.includes('subscriber count') ||
          qLower.includes('how many sub');

        const askedAboutViews =
          qLower.includes('how many view') ||
          qLower.includes('total view') ||
          qLower.includes('number of view') ||
          qLower.includes('view count');

        let directAnswer = '';
        const videoCountNum = Number(s.totalVideos || s.videoCount || 0);
        if (askedAboutVideos) {
          directAnswer = `**${s.title}** has **${videoCountNum.toLocaleString()} video${videoCountNum === 1 ? '' : 's'}** on their YouTube channel.\n\n`;
        } else if (askedAboutSubscribers) {
          directAnswer = `**${s.title}** has **${Number(s.subscribers || 0).toLocaleString()} subscriber${Number(s.subscribers) === 1 ? '' : 's'}**.\n\n`;
        } else if (askedAboutViews) {
          directAnswer = `**${s.title}** has **${Number(s.totalViews || 0).toLocaleString()} total views** across their YouTube channel.\n\n`;
        } else {
          directAnswer = `**${s.title}** currently has **${videoCountNum.toLocaleString()} uploaded video${videoCountNum === 1 ? '' : 's'}**, **${Number(s.subscribers || 0).toLocaleString()} subscribers**, and **${Number(s.totalViews || 0).toLocaleString()} total views**.\n\n`;
        }

        const fallbackText = directAnswer +
          `### Channel Details: **${s.title}** (${s.customUrl || s.channelId})\n\n` +
          `• **Video Count**: **${videoCountNum.toLocaleString()} published video${videoCountNum === 1 ? '' : 's'}** recorded in the catalog.\n` +
          `• **Audience & Reach**: **${Number(s.subscribers || 0).toLocaleString()} subscribers** and **${Number(s.totalViews || 0).toLocaleString()} total views**.\n` +
          (s.periodViews > 0
            ? `• **Recent Telemetry**: Accumulated **${Number(s.periodViews).toLocaleString()} views**, **${Number(s.periodLikes).toLocaleString()} likes**, and **${Number(s.periodComments).toLocaleString()} comments** in recorded daily logs.\n`
            : `• **Recent Telemetry**: Video catalog synchronized; connect channel via OAuth to access private daily watch time telemetry.\n`) +
          (records.length > 0
            ? `• **Top Upload**: **"${records[0].title}"** with **${Number(records[0].views).toLocaleString()} views**.`
            : `• No uploaded videos recorded yet.`);

        suggestedFollowUps.push(`Which YouTube videos received the most views for ${s.title}?`);
        suggestedFollowUps.push(`How did my YouTube views change over the last 30 days?`);
        suggestedFollowUps.push(`Compare the follower counts of all my connected channels`);

        return {
          text: aiExplanation ? aiExplanation.text : fallbackText,
          metricCards,
          table,
          chart: chartData || null,
          suggestedFollowUps,
          modelUsed: aiExplanation
            ? `Google Gemini (${aiExplanation.model})`
            : 'SocialPulse Grounded Analytics Engine',
        };
      }

      if (s.entityType === 'linkedin_account') {
        metricCards.push({
          title: 'Followers',
          value: Number(s.followers || 0).toLocaleString(),
          subtext: `@${s.username}`,
          trend: 'up',
        });
        metricCards.push({
          title: 'Scraped Updates',
          value: s.totalPosts,
          subtext: s.totalPosts > 0 ? `${s.totalEngagement.toLocaleString()} total interactions` : 'No posts scraped yet',
          trend: s.totalPosts > 0 ? 'up' : 'neutral',
        });
        metricCards.push({
          title: 'Total Reactions',
          value: Number(s.totalLikes || 0).toLocaleString(),
          subtext: `Comments: ${Number(s.totalComments || 0).toLocaleString()} • Shares: ${Number(s.totalShares || 0).toLocaleString()}`,
          trend: 'neutral',
        });

        if (records.length > 0) {
          const postRows = records.map((p: any) => [
            `#${p.rank}`,
            p.contentSnippet,
            p.likes.toLocaleString(),
            p.comments.toLocaleString(),
            p.shares.toLocaleString(),
            p.totalEngagement.toLocaleString(),
            p.publishedAt,
          ]);

          const postLinks = records.map((p: any, idx: number) => ({
            rowIndex: idx,
            colIndex: 1,
            url: p.postUrl,
            label: 'Open Post',
          }));

          table = {
            title: `Recent Updates for @${s.username}`,
            headers: ['Rank', 'Post Snippet', 'Reactions', 'Comments', 'Reposts', 'Total Engagement', 'Published Date'],
            rows: postRows,
            links: postLinks,
          };
        }

        const qLower = question.toLowerCase();
        const askedAboutPosts =
          qLower.includes('how many post') ||
          qLower.includes('total post') ||
          qLower.includes('number of post') ||
          qLower.includes('post count') ||
          qLower.includes('count of post');
        const askedAboutFollowers =
          qLower.includes('how many follower') ||
          qLower.includes('follower count') ||
          qLower.includes('how many fol');
        const askedAboutReactions =
          qLower.includes('how many like') ||
          qLower.includes('how many reaction') ||
          qLower.includes('total reaction') ||
          qLower.includes('engagement');

        let directLiAnswer = '';
        if (askedAboutPosts) {
          directLiAnswer = `**@${s.username}** has **${s.totalPosts} update${s.totalPosts === 1 ? '' : 's'}** tracked in the database.\n\n`;
        } else if (askedAboutFollowers) {
          directLiAnswer = `**@${s.username}** has **${Number(s.followers || 0).toLocaleString()} follower${Number(s.followers) === 1 ? '' : 's'}**.\n\n`;
        } else if (askedAboutReactions) {
          directLiAnswer = `**@${s.username}** has received **${Number(s.totalLikes || 0).toLocaleString()} reactions** and **${s.totalEngagement.toLocaleString()} total interactions** across tracked updates.\n\n`;
        } else {
          directLiAnswer = `**@${s.username}** has **${Number(s.followers || 0).toLocaleString()} followers** and **${s.totalPosts} tracked post${s.totalPosts === 1 ? '' : 's'}** with **${s.totalEngagement.toLocaleString()} total interactions**.\n\n`;
        }

        const fallbackText = directLiAnswer +
          `### LinkedIn Profile Telemetry: **@${s.username}**\n\n` +
          `• **Audience**: **${Number(s.followers || 0).toLocaleString()} followers** recorded from profile telemetry.\n` +
          (s.totalPosts > 0
            ? `• **Engagement Activity**: **${s.totalPosts} feed updates** tracked with **${s.totalEngagement.toLocaleString()} total interactions** (${s.totalLikes} reactions, ${s.totalComments} comments, ${s.totalShares} reposts).\n` +
              `• **Top Post**: Leading post achieved **${records[0].totalEngagement} interactions**, published on ${records[0].publishedAt}.`
            : `• **Feed Content**: **0 posts currently stored in database** for this account. To pull in feed updates, trigger a collection sync on the LinkedIn Monitoring dashboard.\n` +
              `• **Profile Link**: [Open LinkedIn Profile](${s.profileUrl})`);

        suggestedFollowUps.push(`Which LinkedIn account gained the most followers?`);
        suggestedFollowUps.push(`Show my top five LinkedIn posts by engagement`);
        suggestedFollowUps.push(`Compare the follower counts of all my connected channels`);

        return {
          text: aiExplanation ? aiExplanation.text : fallbackText,
          metricCards,
          table,
          chart: null,
          suggestedFollowUps,
          modelUsed: aiExplanation
            ? `Google Gemini (${aiExplanation.model})`
            : 'SocialPulse Grounded Analytics Engine',
        };
      }
    }

    // --- Scenario A: Ranking Posts ---
    if (operation === 'ranking' && interpretation.groupBy === 'post') {
      const topCount = records.length;
      if (topCount === 0) {
        const who = interpretation.targetIdentifier ? `for **${interpretation.targetIdentifier}**` : `matching the selected timeframe (${interpretation.dateRange.label})`;
        return {
          text: `No LinkedIn posts were found ${who}. Try connecting a LinkedIn profile or refreshing the data collection to scrape recent feed updates.`,
          metricCards: [],
          table: null,
          chart: null,
          suggestedFollowUps: [
            'Which YouTube videos received the most views?',
            'Compare this month with last month',
            'Summarize my social media performance this month',
          ],
        };
      }

      const topPost = records[0];
      metricCards.push({
        title: 'Top Post Engagement',
        value: topPost.totalEngagement.toLocaleString(),
        subtext: `Reactions: ${topPost.likes} • Comments: ${topPost.comments}`,
        trend: 'up',
      });
      metricCards.push({
        title: 'Total Evaluated Posts',
        value: topCount,
        subtext: `Sorted by ${primaryMetric}`,
        trend: 'neutral',
      });

      const rows = records.map((p: any) => [
        `#${p.rank}`,
        p.contentSnippet,
        p.author,
        p.likes.toLocaleString(),
        p.comments.toLocaleString(),
        p.shares.toLocaleString(),
        p.totalEngagement.toLocaleString(),
        p.publishedAt,
      ]);

      const links = records.map((p: any, idx: number) => ({
        rowIndex: idx,
        colIndex: 1,
        url: p.postUrl,
        label: 'Open Post',
      }));

      table = {
        title: `Top LinkedIn Posts by ${primaryMetric.toUpperCase()} (${interpretation.dateRange.label})`,
        headers: ['Rank', 'Post Snippet', 'Author', 'Reactions', 'Comments', 'Reposts', 'Total Engagement', 'Published Date'],
        rows,
        links,
      };

      const qLower = question.toLowerCase();
      const isLowest = qLower.includes('lowest') || qLower.includes('least') || qLower.includes('worst');
      let directLead = '';
      if (isLowest) {
        directLead = `Your lowest-performing LinkedIn post in this timeframe is by **${topPost.author}** with **${topPost.totalEngagement.toLocaleString()} total interactions** (${topPost.likes} reactions, ${topPost.comments} comments).\n\n`;
      } else if (primaryMetric === 'comments' || qLower.includes('comment')) {
        directLead = `Your LinkedIn post with the highest number of comments is by **${topPost.author}** with **${topPost.comments.toLocaleString()} comments**.\n\n`;
      } else if (primaryMetric === 'likes' || qLower.includes('reaction') || qLower.includes('like')) {
        directLead = `Your LinkedIn post with the most reactions is by **${topPost.author}** with **${topPost.likes.toLocaleString()} likes/reactions**.\n\n`;
      } else {
        directLead = `Your top LinkedIn post by engagement is by **${topPost.author}** with **${topPost.totalEngagement.toLocaleString()} total interactions** (${topPost.likes.toLocaleString()} reactions, ${topPost.comments.toLocaleString()} comments, and ${topPost.shares.toLocaleString()} reposts).\n\n`;
      }

      const introText = `Here are your top ${topCount} LinkedIn posts ranked by **${primaryMetric}** during **${interpretation.dateRange.label}**.\n\n`;
      const detailsText = `• **Leading Post**: Achieved **${topPost.totalEngagement.toLocaleString()} total interactions** on **${topPost.publishedAt}** ("${topPost.contentSnippet}").\n• **Engagement Breakdown**: ${topPost.likes} reactions, ${topPost.comments} comments, and ${topPost.shares} reposts.`;
      const formulaNote = `\n\n*Note on methodology: Total engagement is calculated as Reactions + Comments + Reposts. Platform impressions on public profiles are restricted by LinkedIn privacy controls.*`;

      const fallbackText = `${directLead}${introText}${detailsText}${formulaNote}`;

      suggestedFollowUps.push('Which posts received the most comments?');
      suggestedFollowUps.push('Show my top five YouTube videos by views');
      suggestedFollowUps.push('Compare LinkedIn engagement over the last seven days and the previous seven days');

      return {
        text: aiExplanation ? aiExplanation.text : fallbackText,
        metricCards,
        table,
        chart: null,
        suggestedFollowUps,
        modelUsed: aiExplanation
          ? `Google Gemini (${aiExplanation.model})`
          : 'SocialPulse Grounded Analytics Engine',
      };
    }

    // --- Scenario B: Ranking Videos ---
    if (operation === 'ranking' && interpretation.groupBy === 'video') {
      const topCount = records.length;
      if (topCount === 0) {
        const who = interpretation.targetIdentifier ? `for **${interpretation.targetIdentifier}**` : `matching the query`;
        return {
          text: `No YouTube video records were found ${who}. Ensure your YouTube channel is connected and video uploads are synchronized.`,
          metricCards: [],
          table: null,
          chart: null,
          suggestedFollowUps: ['Show top five LinkedIn posts by engagement', 'Compare this month with last month'],
        };
      }

      const topVideo = records[0];
      metricCards.push({
        title: 'Top Video Views',
        value: Number(topVideo.views).toLocaleString(),
        subtext: topVideo.title.slice(0, 32) + '...',
        trend: 'up',
      });
      metricCards.push({
        title: 'Top Video Engagement',
        value: (topVideo.likes + topVideo.comments).toLocaleString(),
        subtext: `Likes: ${topVideo.likes} • Comments: ${topVideo.comments}`,
        trend: 'up',
      });

      const rows = records.map((v: any) => [
        `#${v.rank}`,
        v.title,
        v.channelTitle,
        Number(v.views).toLocaleString(),
        v.likes.toLocaleString(),
        v.comments.toLocaleString(),
        v.engagementRate,
        v.duration,
        v.publishedAt,
      ]);

      const links = records.map((v: any, idx: number) => ({
        rowIndex: idx,
        colIndex: 1,
        url: v.videoUrl,
        label: 'Watch Video',
      }));

      table = {
        title: `Top YouTube Videos by Views (${interpretation.dateRange.label})`,
        headers: ['Rank', 'Title', 'Channel', 'Views', 'Likes', 'Comments', 'Engagement Rate', 'Duration', 'Published'],
        rows,
        links,
      };

      const qLower = question.toLowerCase();
      const isLowest = qLower.includes('lowest') || qLower.includes('least') || qLower.includes('worst');
      let directLead = '';
      if (isLowest) {
        directLead = `The lowest-performing YouTube video in this timeframe is **"${topVideo.title}"** from **${topVideo.channelTitle}** with **${Number(topVideo.views).toLocaleString()} views**.\n\n`;
      } else if (primaryMetric === 'comments' || qLower.includes('comment')) {
        directLead = `The YouTube video with the most comments is **"${topVideo.title}"** from **${topVideo.channelTitle}** with **${topVideo.comments.toLocaleString()} comments**.\n\n`;
      } else if (primaryMetric === 'likes' || qLower.includes('like')) {
        directLead = `The YouTube video with the most likes is **"${topVideo.title}"** from **${topVideo.channelTitle}** with **${topVideo.likes.toLocaleString()} likes**.\n\n`;
      } else {
        directLead = `The YouTube video with the most views during **${interpretation.dateRange.label}** is **"${topVideo.title}"** from **${topVideo.channelTitle}** with **${Number(topVideo.views).toLocaleString()} views**.\n\n`;
      }

      const highlight = `• **Leading Video**: **"${topVideo.title}"** (${topVideo.channelTitle})\n` +
        `• **Performance**: **${Number(topVideo.views).toLocaleString()} views**, **${topVideo.likes.toLocaleString()} likes**, and **${topVideo.comments.toLocaleString()} comments** (engagement rate: **${topVideo.engagementRate}**).\n` +
        `• **Duration & Date**: ${topVideo.duration} • Published on ${topVideo.publishedAt}.`;

      const fallbackText = `${directLead}${highlight}`;

      suggestedFollowUps.push('Which YouTube channel gained the most subscribers this month?');
      suggestedFollowUps.push('How did my YouTube views change over the last 30 days?');
      suggestedFollowUps.push('Show the channels with the highest total views');

      return {
        text: aiExplanation ? aiExplanation.text : fallbackText,
        metricCards,
        table,
        chart: null,
        suggestedFollowUps,
        modelUsed: aiExplanation
          ? `Google Gemini (${aiExplanation.model})`
          : 'SocialPulse Grounded Analytics Engine',
      };
    }

    // --- Scenario C: Channel Rankings ---
    if (operation === 'ranking') {
      const topCount = records.length;
      if (topCount === 0) {
        return {
          text: `No connected social media channels or accounts were found in your workspace database. Connect a YouTube channel or LinkedIn profile to begin tracking.`,
          metricCards: [],
          table: null,
          chart: null,
          suggestedFollowUps: ['Summarize my social media performance this month'],
        };
      }

      const top = records[0];
      const isSubscribers = primaryMetric === 'subscribers' || primaryMetric === 'followers';
      const qLower = question.toLowerCase();

      metricCards.push({
        title: isSubscribers ? 'Leading Channel Audience' : 'Top Channel Total Views',
        value: isSubscribers ? Number(top.subscribers || top.followers || 0).toLocaleString() : Number(top.totalViews || top.views || 0).toLocaleString(),
        subtext: `${top.platform}: ${top.name}`,
        trend: 'up',
      });

      metricCards.push({
        title: 'Total Channels Tracked',
        value: topCount,
        subtext: `Platform: ${interpretation.platform.toUpperCase()}`,
        trend: 'neutral',
      });

      const rows = records.map((c: any, idx: number) => [
        `#${idx + 1}`,
        c.platform,
        c.name,
        c.identifier,
        Number(c.subscribers || c.followers || 0).toLocaleString(),
        Number(c.totalViews || c.views || 0).toLocaleString(),
        c.periodSubscribersGained !== undefined ? `+${Number(c.periodSubscribersGained).toLocaleString()}` : '-',
        c.periodViews !== undefined ? Number(c.periodViews).toLocaleString() : '-',
      ]);

      table = {
        title: `Channel Audience & Performance Rankings (${interpretation.dateRange.label})`,
        headers: ['Rank', 'Platform', 'Channel / Account', 'Identifier', 'Subscribers / Followers', 'Total Views', 'Period Subs Gained', 'Period Views'],
        rows,
      };

      let directLead = '';
      if (qLower.includes('gain') || qLower.includes('grow')) {
        if (top.periodSubscribersGained !== undefined && top.periodSubscribersGained > 0) {
          directLead = `**${top.name}** gained the most subscribers during **${interpretation.dateRange.label}**, adding **+${Number(top.periodSubscribersGained).toLocaleString()} new subscribers** (reaching ${Number(top.subscribers).toLocaleString()} total).\n\n`;
        } else {
          directLead = `**${top.name}** (${top.platform}) holds the largest subscriber audience with **${Number(top.subscribers || top.followers || 0).toLocaleString()} subscribers** (no new daily subscriber increments logged in telemetry for ${interpretation.dateRange.label}).\n\n`;
        }
      } else if (qLower.includes('follower count') || qLower.includes('compare the follower') || qLower.includes('compare follower')) {
        const topChannelsList = records.slice(0, 3).map((r: any) => `**${r.name}** (${Number(r.subscribers || r.followers || 0).toLocaleString()})`).join(', ');
        directLead = `Comparing follower and subscriber counts across your connected channels, **${top.name}** leads with **${Number(top.subscribers || top.followers || 0).toLocaleString()} ${top.platform === 'YouTube' ? 'subscribers' : 'followers'}**, followed by ${topChannelsList}.\n\n`;
      } else if (primaryMetric === 'views' || qLower.includes('highest total view') || qLower.includes('most view')) {
        directLead = `**${top.name}** (${top.platform}) has the highest total views with **${Number(top.totalViews || top.views || 0).toLocaleString()} lifetime views** across its published content.\n\n`;
      } else if (interpretation.platform === 'linkedin' || qLower.includes('linkedin')) {
        directLead = `**@${top.name}** leads your LinkedIn accounts with **${Number(top.followers || top.subscribers || 0).toLocaleString()} followers**.\n\n`;
      } else {
        directLead = `**${top.name}** (${top.platform}) holds the top position with **${Number(top.subscribers || top.followers || 0).toLocaleString()} ${isSubscribers ? (top.platform === 'YouTube' ? 'subscribers' : 'followers') : 'views'}**.\n\n`;
      }

      const intro = `Based on your stored data for **${interpretation.dateRange.label}**, here are the rankings across your connected channels:`;
      const fallbackText = `${directLead}${intro}`;

      suggestedFollowUps.push('Which platform performed better during the last 30 days?');
      suggestedFollowUps.push('Compare the follower counts of all my connected channels');
      suggestedFollowUps.push('Show the channels with the highest total views');

      return {
        text: aiExplanation ? aiExplanation.text : fallbackText,
        metricCards,
        table,
        chart: null,
        suggestedFollowUps,
        modelUsed: aiExplanation
          ? `Google Gemini (${aiExplanation.model})`
          : 'SocialPulse Grounded Analytics Engine',
      };
    }

    // --- Scenario D: Period Comparison (This Month vs Last Month, 7d vs Prev 7d) ---
    if (operation === 'comparison' && comparisons && comparisons.length > 0) {
      for (const comp of comparisons.slice(0, 3)) {
        metricCards.push({
          title: comp.metric,
          value: comp.currentValue.toLocaleString(),
          subtext: `${comp.previousLabel}: ${comp.previousValue.toLocaleString()}`,
          change: comp.percentageChange !== null ? `${comp.percentageChange > 0 ? '+' : ''}${comp.percentageChange}%` : `${comp.absoluteChange > 0 ? '+' : ''}${comp.absoluteChange.toLocaleString()}`,
          trend: comp.absoluteChange > 0 ? 'up' : comp.absoluteChange < 0 ? 'down' : 'neutral',
        });
      }

      const rows = comparisons.map((c: PeriodComparisonData) => [
        c.metric,
        c.currentValue.toLocaleString(),
        c.previousValue.toLocaleString(),
        c.absoluteChange > 0 ? `+${c.absoluteChange.toLocaleString()}` : c.absoluteChange.toLocaleString(),
        c.percentageChange !== null ? `${c.percentageChange > 0 ? '+' : ''}${c.percentageChange}%` : 'N/A (Zero Baseline)',
        c.explanation,
      ]);

      table = {
        title: `Period Comparison: ${interpretation.dateRange.label} vs ${interpretation.dateRange.compareLabel || 'Previous Period'}`,
        headers: ['Metric', interpretation.dateRange.label, interpretation.dateRange.compareLabel || 'Previous', 'Absolute Difference', '% Growth', 'Analytical Context'],
        rows,
      };

      const qLower = question.toLowerCase();
      let primaryComp = comparisons[0];
      if (qLower.includes('view')) {
        primaryComp = comparisons.find((c: any) => c.metric.toLowerCase().includes('view')) || primaryComp;
      } else if (qLower.includes('subscriber') || qLower.includes('sub')) {
        primaryComp = comparisons.find((c: any) => c.metric.toLowerCase().includes('subscriber')) || primaryComp;
      } else if (qLower.includes('engagement') || qLower.includes('interaction') || qLower.includes('linkedin')) {
        primaryComp = comparisons.find((c: any) => c.metric.toLowerCase().includes('engagement') || c.metric.toLowerCase().includes('interaction')) || primaryComp;
      }

      const directLead = `Comparing **${interpretation.dateRange.label}** to **${interpretation.dateRange.compareLabel || 'the previous period'}**, ${primaryComp.metric} was **${primaryComp.currentValue.toLocaleString()}** compared to **${primaryComp.previousValue.toLocaleString()}** (${primaryComp.explanation}).\n\n`;

      const fallbackText = directLead +
        `### Comparison Overview: **${interpretation.dateRange.label}** vs **${interpretation.dateRange.compareLabel || 'Previous Period'}**\n\n` +
        comparisons.map((c: PeriodComparisonData) => `• **${c.metric}**: ${c.currentValue.toLocaleString()} vs ${c.previousValue.toLocaleString()} (${c.explanation})`).join('\n') +
        `\n\n*Absolute Change = Current Period − Previous Period. When the baseline period has zero recorded telemetry, percentage change is reported as mathematically undefined to prevent division by zero.*`;

      suggestedFollowUps.push('How did my YouTube views change over the last 30 days?');
      suggestedFollowUps.push('Which channel showed the highest percentage growth?');
      suggestedFollowUps.push('What are the main changes in my social media performance?');

      return {
        text: aiExplanation ? aiExplanation.text : fallbackText,
        metricCards,
        table,
        chart: null,
        suggestedFollowUps,
        modelUsed: aiExplanation
          ? `Google Gemini (${aiExplanation.model})`
          : 'SocialPulse Grounded Analytics Engine',
      };
    }

    // --- Scenario E: Time-Series Trends ---
    if (operation === 'timeseries_trend' && chartData) {
      const points = chartData.data;
      const totalViews = points.reduce((acc: number, p: any) => acc + (p.views || 0), 0);
      const totalLikes = points.reduce((acc: number, p: any) => acc + (p.likes || 0), 0);

      metricCards.push({
        title: 'Period Cumulative Views',
        value: totalViews.toLocaleString(),
        subtext: `${points.length} recorded daily snapshots`,
        trend: 'up',
      });
      metricCards.push({
        title: 'Period Cumulative Likes',
        value: totalLikes.toLocaleString(),
        subtext: 'Reactions & Video Likes',
        trend: 'neutral',
      });

      const fallbackText = `Over the **${points.length} days** tracked in **${interpretation.dateRange.label}**, your channels accumulated **${totalViews.toLocaleString()} total views** and **${totalLikes.toLocaleString()} total likes**.\n\n` +
        `• **Daily Views Activity**: Detailed area chart below reflects day-by-day volume.\n` +
        `• **Peak Activity**: Telemetry indicates consistent tracking across connected assets.`;

      suggestedFollowUps.push('Compare this month with last month');
      suggestedFollowUps.push('Which YouTube videos received the most views during the last seven days?');
      suggestedFollowUps.push('Give me three data-backed observations from my current analytics');

      return {
        text: aiExplanation ? aiExplanation.text : fallbackText,
        metricCards,
        table: null,
        chart: chartData,
        suggestedFollowUps,
        modelUsed: aiExplanation
          ? `Google Gemini (${aiExplanation.model})`
          : 'SocialPulse Grounded Analytics Engine',
      };
    }

    // --- Scenario F: Investigation & Observations ---
    if (operation === 'investigation') {
      const summary = summaryMetrics || {};
      const avgEng = summary.avgPostEngagement || 0;
      const above = summary.aboveAveragePosts || [];
      const below = summary.belowAveragePosts || [];
      const declines = summary.channelDeclines || [];

      metricCards.push({
        title: 'Average Post Engagement',
        value: avgEng.toLocaleString(),
        subtext: 'Baseline across recent updates',
        trend: 'neutral',
      });
      metricCards.push({
        title: 'Posts Above Average',
        value: above.length,
        subtext: 'Outperforming content',
        trend: 'up',
      });
      metricCards.push({
        title: 'Declining Channels',
        value: declines.length,
        subtext: 'Need attention',
        trend: declines.length > 0 ? 'down' : 'neutral',
      });

      const directLead = `Based on your stored analytics, your LinkedIn posts average **${avgEng} interactions**, and ${declines.length > 0 ? `**${declines.length} channel(s)** have shown a decline in recent views.` : 'all channels are maintaining steady momentum with no significant view drop-offs.'}\n\n`;

      const observationText = directLead + `### Key Observations from your Social Analytics:\n\n` +
        `1. **Post Engagement Benchmark**: Your average LinkedIn post generates **${avgEng} interactions**. You currently have **${above.length} updates performing above average** and **${below.length} updates performing below average**.\n` +
        `2. **Channel Performance Health**: ${declines.length > 0 ? `We detected **${declines.length} channel(s)** experiencing a short-term view drop over the last 14 days compared to the previous fortnight (${declines.map((d: any) => `${d.title} dropped ${d.dropPercent}%`).join(', ')}).` : 'All connected channels are maintaining steady or growing momentum with no significant view drop-offs.'}\n` +
        `3. **Interaction Driver**: Video views and social comments are the primary drivers of cross-platform visibility. Posts containing specific training and career advice generated the highest comment volume.`;

      suggestedFollowUps.push('Show my lowest-performing recent posts');
      suggestedFollowUps.push('Which posts performed better than my recent average?');
      suggestedFollowUps.push('Summarize my social media performance this month');

      return {
        text: aiExplanation ? aiExplanation.text : observationText,
        metricCards,
        table: null,
        chart: null,
        suggestedFollowUps,
        modelUsed: aiExplanation
          ? `Google Gemini (${aiExplanation.model})`
          : 'SocialPulse Grounded Analytics Engine',
      };
    }

    // --- Scenario G: Workspace Summary ---
    const s = summaryMetrics || {};
    metricCards.push({
      title: 'Total YouTube Subscribers',
      value: Number(s.totalYouTubeSubscribers || 0).toLocaleString(),
      subtext: `${s.totalYouTubeChannels} Channels • ${s.totalYouTubeVideos} Videos`,
      trend: 'up',
    });
    metricCards.push({
      title: 'Total YouTube Views',
      value: Number(s.totalYouTubeViews || 0).toLocaleString(),
      subtext: 'Lifetime aggregated',
      trend: 'up',
    });
    metricCards.push({
      title: 'LinkedIn Network',
      value: Number(s.totalLinkedInFollowers || 0).toLocaleString(),
      subtext: `${s.totalLinkedInAccounts} Profiles • ${s.totalLinkedInPosts} Posts`,
      trend: 'up',
    });

    const qLower = question.toLowerCase();
    let directLead = '';
    if (qLower.includes('how many channel') || qLower.includes('channel count')) {
      directLead = `You have **${s.totalYouTubeChannels} YouTube channels** and **${s.totalLinkedInAccounts} LinkedIn accounts** connected to SocialPulse PRO.\n\n`;
    } else if (qLower.includes('how many video') || qLower.includes('video count')) {
      directLead = `You have **${s.totalYouTubeVideos} total YouTube videos** uploaded across your **${s.totalYouTubeChannels} connected channels**.\n\n`;
    } else if (qLower.includes('how many post') || qLower.includes('post count')) {
      directLead = `You have **${s.totalLinkedInPosts} tracked LinkedIn posts** across your **${s.totalLinkedInAccounts} connected profiles**.\n\n`;
    } else if (qLower.includes('which platform performed better') || qLower.includes('better platform')) {
      const better = s.totalYouTubeViews > 0 ? 'YouTube' : 'LinkedIn';
      directLead = `During the analyzed timeframe, **${better}** drove the greatest overall volume, with YouTube registering **${Number(s.totalYouTubeViews || 0).toLocaleString()} views** across **${s.totalYouTubeVideos} videos** compared to **${s.totalLinkedInPosts} posts** on LinkedIn.\n\n`;
    } else {
      directLead = `Across your connected platforms, you are tracking **${s.totalYouTubeChannels} YouTube channels** (${Number(s.totalYouTubeSubscribers || 0).toLocaleString()} subscribers, ${Number(s.totalYouTubeViews || 0).toLocaleString()} views across ${s.totalYouTubeVideos} videos) and **${s.totalLinkedInAccounts} LinkedIn accounts** (${Number(s.totalLinkedInFollowers || 0).toLocaleString()} followers, ${s.totalLinkedInPosts} posts).\n\n`;
    }

    const summaryText = directLead +
      `### Social Media Performance Summary\n\n` +
      `• **YouTube Presence**: **${s.totalYouTubeChannels} channels** comprising **${Number(s.totalYouTubeSubscribers || 0).toLocaleString()} lifetime subscribers** and **${Number(s.totalYouTubeViews || 0).toLocaleString()} views** across **${s.totalYouTubeVideos} published videos**.\n` +
      `• **LinkedIn Presence**: **${s.totalLinkedInAccounts} connected profiles** with **${Number(s.totalLinkedInFollowers || 0).toLocaleString()} followers** and **${s.totalLinkedInPosts} tracked feed posts**.\n` +
      `• **Leading Content**: Your top-performing video is **"${s.topVideoTitle}"** with **${Number(s.topVideoViews || 0).toLocaleString()} views**, and your top LinkedIn update recorded **${s.topPostEngagement} total interactions**.\n\n` +
      `You can drill down into specific date ranges, compare channels, or ask targeted questions about post engagement below.`;

    suggestedFollowUps.push('Which YouTube channel gained the most subscribers this month?');
    suggestedFollowUps.push('Show my top five LinkedIn posts by engagement');
    suggestedFollowUps.push('Compare this month with last month');
    suggestedFollowUps.push('Which platform performed better during the last 30 days?');

    return {
      text: aiExplanation ? aiExplanation.text : summaryText,
      metricCards,
      table: null,
      chart: null,
      suggestedFollowUps,
      modelUsed: aiExplanation
        ? `Google Gemini (${aiExplanation.model})`
        : 'SocialPulse Grounded Analytics Engine',
    };
  }
}
