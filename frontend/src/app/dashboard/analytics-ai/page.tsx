'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check, 
  Database, 
  RefreshCw, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Info, 
  HelpCircle,
  Video,
  BarChart3,
  ArrowLeftRight,
  ShieldAlert,
  Search,
  Filter,
  Globe,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { API_BASE_URL } from '@/lib/api-config';
import { markHydrated } from '@/lib/data-cache';

interface MetricCard {
  title: string;
  value: string | number;
  subtext?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface TableData {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  links?: { rowIndex: number; colIndex: number; url: string; label?: string }[];
}

interface ChartData {
  type: 'area' | 'bar' | 'line';
  title: string;
  xKey: string;
  dataKeys: { key: string; name: string; color: string }[];
  data: any[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metricCards?: MetricCard[];
  table?: TableData | null;
  chart?: ChartData | null;
  groundedRecords?: any[];
  dataQualityNote?: string | null;
  suggestedFollowUps?: string[];
  modelUsed?: string;
  error?: boolean;
}

interface ConnectedChannel {
  id: number;
  title: string;
  customUrl?: string;
  channelId?: string;
}

interface ConnectedAccount {
  id: number;
  username: string;
  platform?: string;
}

const EXAMPLE_CATEGORIES = [
  {
    category: 'Channel Performance',
    icon: BarChart3,
    questions: [
      'Which YouTube channel gained the most subscribers this month?',
      'Which LinkedIn account gained the most followers?',
      'Compare the follower counts of all my connected channels',
      'Which platform performed better during the last 30 days?',
      'Show the channels with the highest total views',
    ],
  },
  {
    category: 'Posts & Videos',
    icon: Video,
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
    category: 'Historical Comparisons',
    icon: ArrowLeftRight,
    questions: [
      'Compare this month with last month',
      'How did my YouTube views change over the last 30 days?',
      'Compare LinkedIn engagement over the last seven days and the previous seven days',
      'Which channel showed the highest percentage growth?',
      'Show the historical trend in subscribers for a selected channel',
    ],
  },
  {
    category: 'Analytical Insights',
    icon: Sparkles,
    questions: [
      'What are the main changes in my social media performance?',
      'Which channels should I investigate because their engagement declined?',
      'Summarize my social media performance this month',
      'Which posts performed better than my recent average?',
      'Give me three data-backed observations from my current analytics',
    ],
  },
  {
    category: 'Channel & Account Deep Dive',
    icon: Search,
    questions: [
      'How is Bryan Daniel performing?',
      'What are the stats for A2D Channel?',
      'Show posts and engagement for samuel-jebaraj',
      'How did Sony Music South perform this month?',
      'Which YouTube videos of Irfan’s view have the most views?',
    ],
  },
];

export default function AnalyticsAiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('Analyzing question...');
  const [activeTab, setActiveTab] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inspectModalData, setInspectModalData] = useState<{ title: string; data: any } | null>(null);
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize and mark hydration + fetch connected entities
  useEffect(() => {
    markHydrated();
    const welcomeMessage: ChatMessage = {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I am your **SocialPulse Analytics AI** assistant. I can answer questions in plain English about your connected **LinkedIn** and **YouTube** performance using real telemetry stored in your database.\n\nYou can ask about channel rankings, post engagement, video views, historical comparisons (such as *this month vs last month*), trends, or ask for targeted performance of a specific YouTube channel or LinkedIn profile. Select an example below or ask your own question!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedFollowUps: [
        'How is Bryan Daniel performing?',
        'Which YouTube channel gained the most subscribers this month?',
        'Show my top five LinkedIn posts by engagement',
        'Compare this month with last month',
        'What are the stats for A2D Channel?',
      ],
    };
    setMessages([welcomeMessage]);

    // Fetch workspace channels and accounts
    const fetchEntities = async () => {
      try {
        const token = typeof window !== 'undefined'
          ? (sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '')
          : '';
        const role = typeof window !== 'undefined'
          ? (sessionStorage.getItem('user_role') || localStorage.getItem('user_role') || '')
          : '';
        const email = typeof window !== 'undefined'
          ? (sessionStorage.getItem('user_email') || localStorage.getItem('user_email') || '')
          : '';

        const res = await fetch(`${API_BASE_URL}/api/analytics-ai/entities`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-user-role': role,
            'x-user-email': email,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.channels)) setChannels(data.channels);
          if (Array.isArray(data.accounts)) setAccounts(data.accounts);
        }
      } catch (err) {
        console.error('Failed to load connected entities:', err);
      }
    };
    fetchEntities();
  }, []);

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleCopyAnswer = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleClearChat = () => {
    const freshWelcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: `Chat cleared. Ask me any question about your LinkedIn and YouTube metrics!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedFollowUps: [
        'Which YouTube channel gained the most subscribers this month?',
        'Show my top five LinkedIn posts by engagement',
        'Compare this month with last month',
      ],
    };
    setMessages([freshWelcome]);
  };

  const submitQuestion = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || loading) return;

    setInputQuestion('');
    const userMsgId = `usr-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setLoadingStage('Interpreting natural language question...');

    // Progress updates for loading indicator
    const timer1 = setTimeout(() => {
      setLoadingStage('Querying PostgreSQL database...');
    }, 400);

    const timer2 = setTimeout(() => {
      setLoadingStage('Synthesizing grounded analytical answer...');
    }, 900);

    try {
      const token = typeof window !== 'undefined'
        ? (sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '')
        : '';
      const role = typeof window !== 'undefined'
        ? (sessionStorage.getItem('user_role') || localStorage.getItem('user_role') || '')
        : '';
      const email = typeof window !== 'undefined'
        ? (sessionStorage.getItem('user_email') || localStorage.getItem('user_email') || '')
        : '';

      const res = await fetch(`${API_BASE_URL}/api/analytics-ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': role,
          'x-user-email': email,
        },
        body: JSON.stringify({
          question: q,
          channelFilter: selectedScope !== 'all' ? selectedScope : undefined,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Server returned status ${res.status}`);
      }

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'Here is the analytics data for your query.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metricCards: data.metricCards || [],
        table: data.table || null,
        chart: data.chart || null,
        groundedRecords: data.groundedRecords || [],
        dataQualityNote: data.dataQualityNote || null,
        suggestedFollowUps: data.suggestedFollowUps || [],
        modelUsed: data.modelUsed,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Request Failed**: ${err.message || 'Unable to process query at this time.'}\n\nPlease verify your connection and try rephrasing your question.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitQuestion(inputQuestion);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-7xl mx-auto p-3 sm:p-6 space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Ask Your Analytics AI
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Data-Grounded
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Ask questions in plain English about your LinkedIn and YouTube performance. Real stored analytics, zero hallucinations.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            className="text-xs border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Example Question Quick Chips (Categorized) */}
      <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center">
            <HelpCircle className="w-3.5 h-3.5 mr-1 text-indigo-500" />
            Try Example Questions:
          </span>
          <div className="flex space-x-1">
            {EXAMPLE_CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.category}
                  onClick={() => setActiveTab(idx)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
                    activeTab === idx
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{cat.category}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {EXAMPLE_CATEGORIES[activeTab].questions.map((q) => (
            <button
              key={q}
              disabled={loading}
              onClick={() => submitQuestion(q)}
              className="text-xs text-left px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-2xs hover:shadow-xs disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Main Conversation Thread */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`flex items-start max-w-full sm:max-w-4xl space-x-2.5 ${
                msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : msg.error
                    ? 'bg-rose-500 text-white'
                    : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : msg.error ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message Bubble & Content Box */}
              <div
                className={`rounded-2xl p-4 sm:p-5 shadow-xs text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-xs'
                    : msg.error
                    ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 rounded-tl-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs w-full sm:w-[48rem]'
                }`}
              >
                {/* Header row for timestamp & actions */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs opacity-75">
                  <span className="font-semibold uppercase tracking-wider">
                    {msg.role === 'user' ? 'You' : 'SocialPulse AI'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span>{msg.timestamp}</span>
                    {msg.role === 'assistant' && !msg.error && (
                      <button
                        onClick={() => handleCopyAnswer(msg.id, msg.content)}
                        className="hover:text-indigo-500 transition-colors p-1"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Formatted Text Content */}
                <div className="space-y-2 whitespace-pre-line leading-relaxed">
                  {msg.content}
                </div>

                {/* Metric Cards Grid (if present) */}
                {msg.metricCards && msg.metricCards.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 my-4">
                    {msg.metricCards.map((card, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span>{card.title}</span>
                          {card.trend === 'up' && (
                            <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                              <TrendingUp className="w-3 h-3 mr-0.5" />
                              {card.change || ''}
                            </span>
                          )}
                          {card.trend === 'down' && (
                            <span className="flex items-center text-rose-600 dark:text-rose-400 font-semibold text-xs">
                              <TrendingDown className="w-3 h-3 mr-0.5" />
                              {card.change || ''}
                            </span>
                          )}
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {card.value}
                        </div>
                        {card.subtext && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {card.subtext}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Recharts Chart (if present) */}
                {msg.chart && msg.chart.data && msg.chart.data.length > 0 && (
                  <div className="my-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                      <BarChart3 className="w-4 h-4 mr-1.5 text-indigo-500" />
                      {msg.chart.title}
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={msg.chart.data}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey={msg.chart.xKey} tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.9)',
                              borderRadius: '8px',
                              color: '#fff',
                              border: 'none',
                              fontSize: '12px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          {msg.chart.dataKeys.map((k) => (
                            <Area
                              key={k.key}
                              type="monotone"
                              dataKey={k.key}
                              name={k.name}
                              stroke={k.color}
                              fillOpacity={0.4}
                              fill={k.key === 'views' ? 'url(#colorViews)' : 'url(#colorLikes)'}
                            />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Structured Table (if present) */}
                {msg.table && (
                  <div className="my-4 overflow-hidden border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {msg.table.title}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            {msg.table.headers.map((h, i) => (
                              <th key={i} className="px-3.5 py-2.5 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {msg.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              {row.map((cell, cIdx) => {
                                const link = msg.table?.links?.find(
                                  (l) => l.rowIndex === rIdx && l.colIndex === cIdx
                                );
                                return (
                                  <td key={cIdx} className="px-3.5 py-2.5 max-w-xs truncate">
                                    {link ? (
                                      <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                                      >
                                        <span className="truncate">{String(cell)}</span>
                                        <ExternalLink className="w-3 h-3 shrink-0 ml-1 inline text-indigo-400" />
                                      </a>
                                    ) : (
                                      String(cell)
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Data Quality / Limitations Callout */}
                {msg.dataQualityNote && (
                  <div className="my-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start space-x-2 text-xs text-amber-800 dark:text-amber-300">
                    <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <span>{msg.dataQualityNote}</span>
                  </div>
                )}

                {/* Data Inspection & Model Badge */}
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  {msg.modelUsed ? (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1 font-medium">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      {msg.modelUsed}
                    </span>
                  ) : <div />}

                  {msg.groundedRecords && msg.groundedRecords.length > 0 && (
                    <button
                      onClick={() =>
                        setInspectModalData({
                          title: 'Database Query Records',
                          data: msg.groundedRecords,
                        })
                      }
                      className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center space-x-1 transition-colors"
                    >
                      <Database className="w-3.5 h-3.5 mr-1" />
                      View Underlying Data ({msg.groundedRecords.length} records)
                    </button>
                  )}
                </div>

                {/* Suggested Follow-Ups */}
                {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block mb-1.5">
                      Suggested Follow-Ups:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedFollowUps.map((fu, idx) => (
                        <button
                          key={idx}
                          disabled={loading}
                          onClick={() => submitQuestion(fu)}
                          className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-slate-700 transition-colors"
                        >
                          {fu}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Dynamic Loading State */}
        {loading && (
          <div className="flex items-start space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 animate-pulse shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-xs p-4 shadow-sm w-80 space-y-2">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {loadingStage}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar with Entity Scope Selector */}
      <div className="pt-2 space-y-2">
        {/* Scope Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-500" />
              Scope:
            </span>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs transition-all max-w-[260px] sm:max-w-xs truncate"
            >
              <option value="all">🌐 All Channels & Accounts (Global)</option>
              {channels.length > 0 && (
                <optgroup label="📺 YouTube Channels">
                  {channels.map((ch) => (
                    <option key={`ch-${ch.id}`} value={ch.title}>
                      📺 {ch.title} {ch.customUrl ? `(${ch.customUrl})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {accounts.length > 0 && (
                <optgroup label="💼 LinkedIn Profiles">
                  {accounts.map((acc) => (
                    <option key={`acc-${acc.id}`} value={acc.username}>
                      💼 {acc.username}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {selectedScope !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedScope('all')}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors"
                title="Reset scope to All"
              >
                <X className="w-3 h-3" />
                Clear Scope
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {channels.length} Channels • {accounts.length} Profiles connected
            </span>
          </div>
        </div>

        {/* Input Bar */}
        <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all p-1.5 sm:p-2">
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={
              selectedScope !== 'all'
                ? `Ask about ${selectedScope}...`
                : 'Ask a question about your social metrics...'
            }
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <Button
            onClick={() => submitQuestion(inputQuestion)}
            disabled={!inputQuestion.trim() || loading}
            className="rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-40 transition-all"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline mr-1 text-xs font-semibold">Ask</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-2">
          <span>Press Enter to send. Supports LinkedIn accounts and YouTube channels.</span>
          <span>Read-only analytics ground truth.</span>
        </div>
      </div>

      {/* Inspect Underlying Data Modal */}
      {inspectModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {inspectModalData.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectModalData(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs bg-slate-950 text-emerald-400 rounded-b-xl">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(inspectModalData.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

