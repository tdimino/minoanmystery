export interface RankingEntry {
  platform: string;
  rank: number;
  label: string;
  verifyUrl: string | null;
}

export interface TrafficMetrics {
  uniqueVisitors: number;
  pageViews: number;
  peakDayUniques: number;
  peakDate: string;
  daysCounted: number;
  periodStart: string;
  periodEnd: string;
  dailyAvgUniques: number;
  sparkline: number[];
}

export interface SocialProof {
  platform: string;
  note: string;
}

export interface ProofSite {
  id: string;
  name: string;
  url: string;
  color: string;
  badge: string | null;
  rankings: RankingEntry[];
  traffic: TrafficMetrics | null;
  socialProof: SocialProof | null;
}

export interface ProofMetrics {
  generated: string;
  sites: ProofSite[];
}
