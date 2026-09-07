import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Sponsor = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
};

export type Campaign = {
  id: string;
  sponsor_id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'budget_exhausted' | 'completed';
  reward_amount: number;
  currency: string;
  budget_total: number;
  budget_available: number;
  budget_reserved: number;
  budget_spent: number;
  starts_at: string | null;
  ends_at: string | null;
  cta_text: string | null;
  cta_url: string | null;
};

export type CampaignMetrics = {
  sessions_started: number;
  sessions_completed: number;
  completion_rate: number;
  unique_users: number;
  focus_seconds_completed: number;
  cta_views: number;
  cta_clicks: number;
  cta_ctr: number;
  activity_breakdown: Array<{ activity: string; sessions: number }>;
  recent_sessions: Array<{
    activity: string;
    planned_duration_seconds: number;
    started_at: string;
    completed_at: string | null;
    status: string;
  }>;
};

export type DashboardData =
  | { state: 'missing-membership' }
  | { state: 'empty'; sponsor: Sponsor; role: 'owner' | 'viewer' }
  | { state: 'unavailable'; sponsor: Sponsor; role: 'owner' | 'viewer'; campaigns: Campaign[] }
  | { state: 'error' }
  | {
      state: 'ready';
      sponsor: Sponsor;
      role: 'owner' | 'viewer';
      campaigns: Campaign[];
      campaign: Campaign;
      metrics: CampaignMetrics;
    };

const campaignColumns = [
  'id', 'sponsor_id', 'name', 'status', 'reward_amount', 'currency',
  'budget_total', 'budget_available', 'budget_reserved', 'budget_spent',
  'starts_at', 'ends_at', 'cta_text', 'cta_url',
].join(',');

function number(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCampaigns(value: unknown): Campaign[] {
  if (!Array.isArray(value)) return [];
  const validStatuses = new Set<Campaign['status']>(['draft', 'active', 'paused', 'budget_exhausted', 'completed']);

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== 'string'
      || typeof row.sponsor_id !== 'string'
      || typeof row.name !== 'string'
      || typeof row.status !== 'string'
      || !validStatuses.has(row.status as Campaign['status'])
      || typeof row.currency !== 'string'
    ) return [];

    return [{
      id: row.id,
      sponsor_id: row.sponsor_id,
      name: row.name,
      status: row.status as Campaign['status'],
      reward_amount: number(row.reward_amount),
      currency: row.currency,
      budget_total: number(row.budget_total),
      budget_available: number(row.budget_available),
      budget_reserved: number(row.budget_reserved),
      budget_spent: number(row.budget_spent),
      starts_at: typeof row.starts_at === 'string' ? row.starts_at : null,
      ends_at: typeof row.ends_at === 'string' ? row.ends_at : null,
      cta_text: typeof row.cta_text === 'string' ? row.cta_text : null,
      cta_url: typeof row.cta_url === 'string' ? row.cta_url : null,
    }];
  });
}

function parseMetrics(value: unknown): CampaignMetrics | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const breakdown = Array.isArray(data.activity_breakdown) ? data.activity_breakdown : [];
  const recent = Array.isArray(data.recent_sessions) ? data.recent_sessions : [];

  return {
    sessions_started: number(data.sessions_started),
    sessions_completed: number(data.sessions_completed),
    completion_rate: number(data.completion_rate),
    unique_users: number(data.unique_users),
    focus_seconds_completed: number(data.focus_seconds_completed),
    cta_views: number(data.cta_views),
    cta_clicks: number(data.cta_clicks),
    cta_ctr: number(data.cta_ctr),
    activity_breakdown: breakdown.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>;
      return typeof row.activity === 'string'
        ? [{ activity: row.activity, sessions: number(row.sessions) }]
        : [];
    }),
    recent_sessions: recent.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>;
      if (typeof row.activity !== 'string' || typeof row.started_at !== 'string' || typeof row.status !== 'string') return [];
      return [{
        activity: row.activity,
        planned_duration_seconds: number(row.planned_duration_seconds),
        started_at: row.started_at,
        completed_at: typeof row.completed_at === 'string' ? row.completed_at : null,
        status: row.status,
      }];
    }),
  };
}

export async function getDashboardData(requestedCampaignId?: string): Promise<DashboardData> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect('/login?error=config');
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== 'string') redirect('/login');

  try {
    const { data: membership, error: membershipError } = await supabase
      .from('sponsor_members')
      .select('sponsor_id,role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (membershipError) return { state: 'error' };
    if (!membership) return { state: 'missing-membership' };

    const role = membership.role === 'owner' ? 'owner' : 'viewer';
    const [{ data: sponsor, error: sponsorError }, { data: campaignRows, error: campaignsError }] = await Promise.all([
      supabase.from('sponsors').select('id,name,slug,logo_url,website_url').eq('id', membership.sponsor_id).single(),
      supabase.from('campaigns').select(campaignColumns).eq('sponsor_id', membership.sponsor_id).order('created_at', { ascending: false }),
    ]);

    if (sponsorError || campaignsError || !sponsor) return { state: 'error' };
    const safeSponsor = sponsor as Sponsor;
    const campaigns = parseCampaigns(campaignRows);
    if (!campaigns.length) return { state: 'empty', sponsor: safeSponsor, role };

    const campaign = requestedCampaignId
      ? campaigns.find((item) => item.id === requestedCampaignId)
      : campaigns.find((item) => item.status === 'active') || campaigns[0];

    if (!campaign) return { state: 'unavailable', sponsor: safeSponsor, role, campaigns };

    const { data: metricsData, error: metricsError } = await supabase.rpc('get_campaign_dashboard', {
      p_campaign_id: campaign.id,
    });
    const metrics = parseMetrics(metricsData);
    if (metricsError || !metrics) return { state: 'error' };

    return { state: 'ready', sponsor: safeSponsor, role, campaigns, campaign, metrics };
  } catch {
    return { state: 'error' };
  }
}
