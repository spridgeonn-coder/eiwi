'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, User, Clipboard, X, AlertCircle, CheckCircle } from "lucide-react";
import AnalysisRenderer from '@/components/AnalysisRenderer';

function CircularGauge({ value }: { value: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 75 ? '#4ade80' : value >= 45 ? '#fb923c' : '#f87171';
  const label = value >= 75 ? 'Good' : value >= 45 ? 'Moderate' : 'Critical';
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle cx="70" cy="70" r={radius} fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-bold text-white">{value}%</span>
        </div>
      </div>
      <span className="text-sm font-semibold mt-2" style={{ color }}>{label}</span>
      <span className="text-xs text-zinc-600 mt-1">Overall repo health</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[80px]">
      <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'error' | 'success'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg max-w-sm"
      style={{ background: type === 'error' ? '#1a0f0f' : '#0f1a0f', border: `1px solid ${type === 'error' ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.3)'}` }}>
      {type === 'error'
        ? <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        : <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
      <p className="text-sm leading-relaxed" style={{ color: type === 'error' ? '#fca5a5' : '#86efac' }}>{message}</p>
      <button onClick={onClose} className="ml-2 flex-shrink-0">
        <X className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400" />
      </button>
    </div>
  );
}

function getColor(score: number, invert = false) {
  const v = invert ? 100 - score : score;
  if (v >= 75) return { text: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.25)', label: 'Good' };
  if (v >= 45) return { text: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.25)', label: 'Moderate' };
  return { text: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', label: 'Critical' };
}

function getSeverityColor(severity: string) {
  if (/critical/i.test(severity)) return { text: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.2)', dot: 'bg-red-500' };
  if (/high/i.test(severity)) return { text: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.2)', dot: 'bg-red-400' };
  if (/medium/i.test(severity)) return { text: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.2)', dot: 'bg-amber-500' };
  return { text: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)', dot: 'bg-green-500' };
}

function parseIssuesFromAnalysis(analysis: string) {
  const issues: { severity: string; file: string; title: string; desc: string; fix: string }[] = [];
  const blocks = analysis.split(/(?=- \*\*Risk level)/i).filter(b => b.trim());

  for (const block of blocks) {
    const severityMatch = block.match(/Risk level:\s*\*?\*?([^\*\n]+)\*?\*?/i);
    const fileMatch = block.match(/File \+ pattern:\s*`?([^`\n]+)`?/i);
    const attackMatch = block.match(/Attack vector:\s*([^\n]+)/i);
    const impactMatch = block.match(/Production impact:\s*([^\n]+)/i);
    const fixMatch = block.match(/Fix:\s*([\s\S]+?)(?=\n- \*\*Risk|\n\n\*\*|$)/i);

    if (severityMatch) {
      issues.push({
        severity: severityMatch[1]?.trim() || 'High',
        file: fileMatch?.[1]?.trim().replace(/`/g, '') || '',
        title: attackMatch?.[1]?.trim() || '',
        desc: impactMatch?.[1]?.trim() || '',
        fix: fixMatch?.[1]?.trim().replace(/```[\s\S]*?```/g, m => m) || '',
      });
    }
  }

  // Also pull refactoring priorities as medium issues
  const refactoringSection = analysis.match(/\*\*Refactoring Priorities\*\*[^\n]*\n([\s\S]*?)(?=\n\*\*[A-Z]|$)/i);
  if (refactoringSection) {
    const lines = refactoringSection[1].split('\n').filter(l => l.match(/^\d+\./));
    for (const line of lines) {
      const fileMatch = line.match(/`([^`]+)`/);
      const text = line.replace(/^\d+\.\s*/, '').replace(/`[^`]+`\s*—?\s*/, '').trim();
      if (text) {
        issues.push({
          severity: 'Medium',
          file: fileMatch?.[1] || '',
          title: text,
          desc: '',
          fix: '',
        });
      }
    }
  }

  return issues;
}

const DEFAULT_STATS = {
  quality: 0,
  blastRadius: 0,
  securityMm: 0,
  performanceMm: 0,
  techDebt: 0,
  topPriorityFix: null as null | { file: string; issue: string; fix: string },
  scannedFiles: [] as { path: string; status: string }[],
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingLastAnalysis, setLoadingLastAnalysis] = useState(true);
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'issues'>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [hasEverAnalyzed, setHasEverAnalyzed] = useState(false);
  const [issueFilter, setIssueFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const init = async () => {
  document.title = 'Dashboard | eiwi';
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) { window.location.href = '/login'; return; }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { window.location.href = '/login'; return; }
      setUser(user);

      const { data: profile } = await supabase
        .from('profile')
        .select('github_token')
        .eq('user_id', user.id)
        .single();

      const token = profile?.github_token ?? null;
      if (!token) { setTokenError(true); setLoadingRepos(false); setLoadingLastAnalysis(false); return; }
      setGithubToken(token);

      try {
        const { data: lastLog } = await supabase
          .from('analysis_log')
          .select('result, repo_name, repo_full_name, created_at')
          .eq('user_id', user.id)
          .eq('status', 'complete')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastLog?.result) {
          setResults(lastLog.result);
          setHasEverAnalyzed(true);
          setSelectedRepo({ name: lastLog.repo_name, full_name: lastLog.repo_full_name });
          const s = lastLog.result.structured;
          if (s) {
            setStats({
              quality: s.qualityScore ?? 0,
              blastRadius: s.blastRadius ?? 0,
              securityMm: s.security ?? 0,
              performanceMm: s.performance ?? 0,
              techDebt: s.techDebt ?? 0,
              topPriorityFix: s.topPriorityFix ?? null,
              scannedFiles: s.scannedFiles ?? [],
            });
          }
        }
      } catch { }
      setLoadingLastAnalysis(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') window.location.href = '/login';
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!githubToken) return;
    fetchRepos(githubToken);
  }, [githubToken]);

  const fetchRepos = async (token: string) => {
    setLoadingRepos(true);
    try {
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      setRepos(await res.json());
    } catch {
      setTokenError(true);
      showToast('Could not load repositories. Try reconnecting GitHub in your profile.');
    }
    setLoadingRepos(false);
  };

  const analyzeRepo = async (repo: any) => {
    if (analyzingRepo) {
      showToast('Please wait for the current analysis to finish.');
      return;
    }

    setAnalyzingRepo(repo.full_name);
    setResults(null);
    setSelectedRepo(repo);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: repo.full_name, repoName: repo.name })
      });

      const data = await res.json();

      if (res.status === 429) {
        showToast(data.error || 'Daily analysis limit reached. Upgrade to Pro for unlimited analyses.');
        setAnalyzingRepo(null);
        return;
      }
      if (res.status === 409) {
        showToast('This repo is already being analyzed. Please wait.');
        setAnalyzingRepo(null);
        return;
      }
      if (!res.ok || data.error) throw new Error(data.error || 'Analysis failed');

      setResults(data);
      setHasEverAnalyzed(true);

      if (data.structured) {
        setStats({
          quality: data.structured.qualityScore ?? 0,
          blastRadius: data.structured.blastRadius ?? 0,
          securityMm: data.structured.security ?? 0,
          performanceMm: data.structured.performance ?? 0,
          techDebt: data.structured.techDebt ?? 0,
          topPriorityFix: data.structured.topPriorityFix ?? null,
          scannedFiles: data.structured.scannedFiles ?? [],
        });
      }

      if (data.cached) showToast('Showing cached results from the last hour.', 'success');

    } catch (error: any) {
      showToast(error.message || 'Analysis failed. Please try again.');
    }

    setAnalyzingRepo(null);
  };

  const isAnalyzing = !!analyzingRepo;
  const isLoading = loadingLastAnalysis;

  const displayName = user?.user_metadata?.user_name
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there';

  const fileStatusColor = (status: string) => {
    if (status === 'Critical') return { text: '#f87171', bg: 'rgba(248,113,113,0.12)' };
    if (status === 'Review') return { text: '#fb923c', bg: 'rgba(251,146,60,0.12)' };
    return { text: '#4ade80', bg: 'rgba(74,222,128,0.1)' };
  };

  const sidebarContent = () => {
    if (tokenError) return (
      <div className="px-2 py-4">
        <p className="text-red-400 text-sm mb-3">⚠️ GitHub token expired.</p>
        <a href="/profile" className="text-xs text-violet-400 hover:text-violet-300 underline">Reconnect GitHub →</a>
      </div>
    );
    if (loadingRepos) return (
      <div className="flex items-center gap-2 px-2 py-4">
        <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-500 text-sm">Loading repos...</span>
      </div>
    );
    if (repos.length === 0) return <p className="text-zinc-600 text-sm px-2 py-4">No repositories found.</p>;
    return repos.map((repo) => (
      <div key={repo.id} onClick={() => analyzeRepo(repo)}
        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          selectedRepo?.full_name === repo.full_name
            ? 'border-violet-500/50 bg-violet-950/25'
            : 'border-white/[0.07] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
        } ${analyzingRepo && analyzingRepo !== repo.full_name ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-800 rounded-xl flex items-center justify-center text-[10px] font-bold shadow-md flex-shrink-0">AI</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{repo.name}</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {analyzingRepo === repo.full_name ? 'Analyzing...' : selectedRepo?.full_name === repo.full_name && results ? 'Last analyzed just now' : 'Click to analyze'}
            </p>
          </div>
          {analyzingRepo === repo.full_name && (
            <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
        </div>
      </div>
    ));
  };

  const statCards = [
    { badge: 'Blast Radius', value: stats.blastRadius, unit: 'files at risk', sub: 'Files affected by a breaking change', color: getColor(stats.blastRadius, true) },
    { badge: 'Security', value: stats.securityMm, unit: '/ 100', sub: 'Auth, token & env variable exposure', color: getColor(stats.securityMm) },
    { badge: 'Performance', value: stats.performanceMm, unit: '/ 100', sub: 'Runtime efficiency & load time', color: getColor(stats.performanceMm) },
    { badge: 'Tech Debt', value: stats.techDebt, unit: 'hrs to fix', sub: 'Estimated cleanup effort', color: getColor(100 - Math.min(stats.techDebt, 100)) },
  ];

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M4 14L11 21L24 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Run your first analysis</h2>
      <p className="text-zinc-500 text-sm max-w-sm leading-relaxed mb-6">
        Click any repository on the left to get a full AI-powered code review — security vulnerabilities, blast radius, tech debt and more.
      </p>
      <div className="flex flex-col gap-2 text-left">
        {[
          'Pinpoint the exact line killing your security posture',
          'Know your blast radius before you merge',
          'Tech debt in hours, not vibes',
        ].map((t, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
            <p className="text-sm text-zinc-400">{t}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // Parse issues from analysis text
  const parsedIssues = results?.analysis ? parseIssuesFromAnalysis(results.analysis) : [];
  const filteredIssues = issueFilter === 'all'
  ? parsedIssues
  : issueFilter === 'critical'
  ? parsedIssues.filter(i => /critical|high/i.test(i.severity))
  : parsedIssues.filter(i => i.severity.toLowerCase() === issueFilter);

  const criticalCount = parsedIssues.filter(i => /critical/i.test(i.severity)).length;
  const highCount = parsedIssues.filter(i => /high/i.test(i.severity)).length;
  const mediumCount = parsedIssues.filter(i => /medium/i.test(i.severity)).length;

  return (
    <div className="min-h-screen text-white" style={{ background: '#0b0b14' }}>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <nav className="border-b border-white/[0.07] bg-black/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-8 py-4 flex items-center gap-10">
          <div className="flex items-center gap-2.5 mr-4">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/40">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L6 11L12 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight">eiwi</span>
          </div>
          <div className="flex items-center gap-8 text-sm flex-1">
            {(['overview', 'analysis', 'issues'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`pb-1 capitalize font-medium transition-all ${activeTab === tab ? 'text-white border-b-2 border-violet-500' : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'issues' && parsedIssues.length > 0 && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 font-semibold">
                    {parsedIssues.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            {[Search, User, Clipboard].map((Icon, i) => (
              <button key={i} onClick={i === 1 ? () => window.location.href = '/profile' : undefined}
                className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] flex items-center justify-center transition-colors">
                <Icon className="w-4 h-4 text-zinc-400" />
              </button>
            ))}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold shadow-md ml-1">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-screen-2xl mx-auto px-8 py-8 flex gap-6">
        <div className="w-72 flex-shrink-0">
          <h2 className="text-xs font-medium text-zinc-500 mb-4 tracking-widest uppercase">Repository</h2>
          <div className="space-y-2">{sidebarContent()}</div>
        </div>

        <div className="flex-1 min-w-0">

          {activeTab === 'overview' && (
            <div>
              <div className="mb-8">
                <h1 className="text-5xl font-bold tracking-tighter">Welcome back, {displayName}</h1>
                <p className="text-zinc-500 mt-2 text-sm">
                  {isAnalyzing ? `Analyzing ${selectedRepo?.name}...` : 'Your AI Code Intelligence Platform'}
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]"><Spinner /></div>
              ) : !hasEverAnalyzed && !isAnalyzing ? (
                <EmptyState />
              ) : (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 lg:col-span-5 rounded-3xl p-8 flex flex-col items-center justify-center"
                    style={{ background: 'linear-gradient(145deg,#2d1b69 0%,#1a0f3c 55%,#0f0820 100%)', border: '1px solid rgba(139,92,246,0.3)', minHeight: '230px' }}>
                    <p className="text-xs uppercase tracking-widest text-violet-300/60 font-medium mb-6">Code Quality Score</p>
                    {isAnalyzing ? <Spinner /> : <CircularGauge value={stats.quality} />}
                  </div>

                  <div className="col-span-12 lg:col-span-7 rounded-3xl p-8 flex flex-col justify-between"
                    style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)', minHeight: '230px' }}>
                    <div>
                      <h3 className="text-base font-semibold text-white mb-3">Summary Analysis</h3>
                      {isAnalyzing ? <Spinner /> : results?.analysis ? (
                        <p className="text-zinc-400 text-sm leading-relaxed">
                          {results.analysis.split('\n').find((l: string) => l.length > 60 && !l.startsWith('#') && !l.startsWith('*')) || 'Analysis complete.'}
                        </p>
                      ) : (
                        <p className="text-zinc-500 text-sm leading-relaxed">Select a repository to run an AI analysis.</p>
                      )}
                    </div>
                    {results && !isAnalyzing && (
                      <button onClick={() => setActiveTab('analysis')} className="text-xs text-violet-400 hover:text-violet-300 transition-colors mt-4 self-start">
                        View full analysis →
                      </button>
                    )}
                  </div>

                  {statCards.map((card, i) => (
                    <div key={i} className="col-span-6 lg:col-span-3 rounded-3xl p-6 flex flex-col justify-between"
                      style={{ background: isAnalyzing ? '#111119' : card.color.bg, border: `1px solid ${isAnalyzing ? 'rgba(255,255,255,0.06)' : card.color.border}`, minHeight: '155px', transition: 'background 0.5s, border-color 0.5s' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-white/[0.06] text-zinc-300 px-2.5 py-1 rounded-lg font-medium">{card.badge}</span>
                        {!isAnalyzing && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ color: card.color.text, background: 'rgba(0,0,0,0.3)' }}>
                            {card.color.label}
                          </span>
                        )}
                      </div>
                      {isAnalyzing ? <Spinner /> : (
                        <div>
                          <div className="text-4xl font-bold mt-2" style={{ color: card.color.text }}>
                            {card.value}<span className="text-base font-normal text-zinc-500 ml-1">{card.unit}</span>
                          </div>
                          <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{card.sub}</div>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="col-span-12 lg:col-span-6 rounded-3xl p-6"
                    style={{ background: '#111119', border: '1px solid rgba(248,113,113,0.3)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                      <span className="text-xs font-semibold text-red-400 uppercase tracking-widest">Top Priority Fix</span>
                    </div>
                    {isAnalyzing ? <Spinner /> : stats.topPriorityFix ? (
                      <>
                        <p className="text-sm font-medium text-zinc-100 mb-1">{stats.topPriorityFix.issue}</p>
                        <p className="text-xs text-violet-400 font-mono mb-3">{stats.topPriorityFix.file}</p>
                        <div className="rounded-xl p-3" style={{ background: 'rgba(248,113,113,0.08)' }}>
                          <p className="text-xs text-red-300 font-mono leading-relaxed">Fix: {stats.topPriorityFix.fix}</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-zinc-600 text-sm">Run an analysis to surface your top priority fix.</p>
                    )}
                  </div>

                  <div className="col-span-12 lg:col-span-6 rounded-3xl p-6"
                    style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Files Scanned</p>
                    {isAnalyzing ? <Spinner /> : stats.scannedFiles.length > 0 ? (
                      <div className="space-y-2">
                        {stats.scannedFiles.map((file, i) => {
                          const c = fileStatusColor(file.status);
                          return (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-xs font-mono text-indigo-400 truncate mr-3">{file.path}</span>
                              <span className="text-xs px-2 py-0.5 rounded-md flex-shrink-0 font-medium" style={{ color: c.text, background: c.bg }}>
                                {file.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-zinc-600 text-sm">Files scanned will appear here after analysis.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div>
              <div className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight">{selectedRepo ? selectedRepo.name : 'Analysis'}</h1>
                <p className="text-zinc-500 mt-1 text-sm">
                  {results ? 'AI analysis complete' : isAnalyzing ? 'Running analysis...' : 'Select a repository to analyze'}
                </p>
              </div>
              <div className="rounded-3xl p-8 min-h-[600px]" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                {isAnalyzing ? (
                  <div className="h-[500px] flex items-center justify-center text-center">
                    <div>
                      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                      <p className="text-xl text-white">Analyzing {selectedRepo?.name}...</p>
                      <p className="text-zinc-500 mt-2 text-sm">Reading your code with AI</p>
                    </div>
                  </div>
                ) : results ? (
                  <AnalysisRenderer content={results.analysis} />
                ) : (
                  <div className="h-[500px] flex items-center justify-center text-center">
                    <div>
                      <div className="text-5xl mb-6 opacity-20">⚡</div>
                      <p className="text-xl text-zinc-300">No analysis yet</p>
                      <p className="text-zinc-600 mt-3 text-sm">Click a repository on the left to start</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'issues' && (
            <div>
              <div className="mb-6">
                <h1 className="text-4xl font-bold tracking-tight">Issues</h1>
                <p className="text-zinc-500 mt-1 text-sm">
                  {results ? `${parsedIssues.length} issues found in ${selectedRepo?.name}` : 'Run an analysis to surface issues'}
                </p>
              </div>

              {results && parsedIssues.length > 0 && (
                <>
                  {/* Summary counts */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: 'Critical / High', count: criticalCount + highCount, color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
                      { label: 'Medium', count: mediumCount, color: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)' },
                      { label: 'Total Issues', count: parsedIssues.length, color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
                    ].map((s, i) => (
                      <div key={i} className="rounded-2xl p-4" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</p>
                        <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Filter buttons */}
                  <div className="flex gap-2 mb-6">
                    {(['all', 'critical', 'high', 'medium'] as const).map(f => (
                      <button key={f} onClick={() => setIssueFilter(f)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all capitalize"
                        style={{
                          background: issueFilter === f ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${issueFilter === f ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)'}`,
                          color: issueFilter === f ? '#c4b5fd' : '#888'
                        }}>
                        {f === 'all' ? `All (${parsedIssues.length})` : f === 'critical' ? `Critical / High` : f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="space-y-3">
                {isAnalyzing ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <Spinner />
                  </div>
                ) : filteredIssues.length > 0 ? (
                  filteredIssues.map((issue, i) => {
                    const sc = getSeverityColor(issue.severity);
                    return (
                      <div key={i} className="rounded-2xl overflow-hidden"
                        style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="p-5">
                          <div className="flex items-center gap-3 mb-3">
                            {issue.file && (
                              <span className="text-xs font-mono px-2.5 py-1 rounded-lg"
                                style={{ color: '#c4b5fd', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)' }}>
                                {issue.file}
                              </span>
                            )}
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg ml-auto"
                              style={{ color: sc.text, background: sc.bg, border: `1px solid ${sc.border}` }}>
                              {issue.severity}
                            </span>
                          </div>
                          {issue.title && (
                            <p className="text-sm font-semibold text-zinc-100 mb-2 leading-relaxed">{issue.title}</p>
                          )}
                          {issue.desc && (
                            <p className="text-xs text-zinc-500 leading-relaxed">{issue.desc}</p>
                          )}
                          {issue.fix && (
                            <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', borderLeft: '2px solid #8b5cf6' }}>
                              <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1.5">Fix</p>
                              <p className="text-xs font-mono text-purple-200 leading-relaxed">{issue.fix.replace(/```[\s\S]*?```/g, '').trim()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : results ? (
                  <div className="h-[300px] flex items-center justify-center text-center rounded-3xl"
                    style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p className="text-zinc-400 text-sm">No {issueFilter !== 'all' ? issueFilter : ''} issues found</p>
                      {issueFilter !== 'all' && (
                        <button onClick={() => setIssueFilter('all')} className="text-xs text-violet-400 mt-2">
                          Show all issues
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-center rounded-3xl"
                    style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <div className="text-5xl mb-6 opacity-20">🔍</div>
                      <p className="text-xl text-zinc-300">No issues yet</p>
                      <p className="text-zinc-600 mt-3 text-sm">Run an analysis first to surface issues</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}