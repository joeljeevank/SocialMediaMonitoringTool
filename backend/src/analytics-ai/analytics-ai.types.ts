export interface UserContext {
  userId?: number;
  email?: string;
  name?: string;
  role: 'super_admin' | 'manager' | 'user';
  companyName?: string;
  allowedAccountIds?: number[];
  allowedChannelIds?: number[];
}

export type PlatformType = 'linkedin' | 'youtube' | 'all';

export type AnalyticsMetric =
  | 'followers'
  | 'subscribers'
  | 'views'
  | 'impressions'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'watch_time'
  | 'engagement'
  | 'overview';

export type AnalyticsOperation =
  | 'ranking'
  | 'comparison'
  | 'timeseries_trend'
  | 'summary'
  | 'investigation'
  | 'clarification'
  | 'entity_detail'
  | 'unsupported';

export type DateRangePreset =
  | '7d'
  | '30d'
  | 'this_month'
  | 'last_month'
  | '90d'
  | '1y'
  | 'all'
  | 'custom';

export interface DateRangeThresholds {
  type: DateRangePreset;
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  label: string;
  compareLabel?: string;
}

export interface StructuredInterpretation {
  platform: PlatformType;
  metric: AnalyticsMetric;
  operation: AnalyticsOperation;
  dateRange: DateRangeThresholds;
  groupBy: 'channel' | 'account' | 'post' | 'video' | 'day' | 'platform' | 'none';
  limit: number;
  targetIdentifier?: string | null;
  targetId?: number | null;
  clarificationNeeded: boolean;
  clarificationQuestion?: string | null;
  reasoning?: string;
  modelUsed?: string;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  subtext?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface TableLink {
  rowIndex: number;
  colIndex: number;
  url: string;
  label?: string;
}

export interface TableData {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  links?: TableLink[];
}

export interface ChartSeries {
  key: string;
  name: string;
  color: string;
}

export interface ChartData {
  type: 'area' | 'bar' | 'line';
  title: string;
  xKey: string;
  dataKeys: ChartSeries[];
  data: Record<string, any>[];
}

export interface PeriodComparisonData {
  metric: string;
  currentValue: number;
  previousValue: number;
  absoluteChange: number;
  percentageChange: number | null;
  currentLabel: string;
  previousLabel: string;
  explanation: string;
}

export interface QueryExecutionResult {
  operation: AnalyticsOperation;
  platform: PlatformType;
  primaryMetric: AnalyticsMetric;
  records: any[];
  comparisons?: PeriodComparisonData[];
  chartData?: ChartData | null;
  summaryMetrics?: Record<string, any>;
  dataQualityNotes: string[];
}

export class AskAnalyticsAiDto {
  question: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  platformFilter?: PlatformType;
  channelFilter?: string;
}

export interface AnalyticsAiResponse {
  success: boolean;
  question: string;
  interpretation: StructuredInterpretation;
  answer: string;
  metricCards: MetricCardData[];
  table?: TableData | null;
  chart?: ChartData | null;
  comparisons?: PeriodComparisonData[];
  groundedRecords: any[];
  dataQualityNote?: string | null;
  suggestedFollowUps: string[];
  executionTimeMs: number;
  modelUsed?: string;
}
