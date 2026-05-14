'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, User, Clipboard, Zap, RefreshCw } from "lucide-react";
import AnalysisRenderer from '@/components/AnalysisRenderer';

function CircularGauge({ value }: { value: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      <svg className="w-40 h-40 -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-white">{value}%</span>
      </div>
    </div>
  );
}

const CODE_LINES = [
  `currcnig", $ll, "l","terreadlaterv"americ"lcu"){`,
  ` norplicgleterle"r'yline');`,
  `};`,
];

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'issues'>('overview');

  // Dynamic stats
  const [stats, setStats] = useState({
    quality: 85,
    blastRadius: 87,
    security: 49,
    performance: 53,
  });

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUser(user);

    const { data: { session } } = await supabase.auth.getSession();
    let token = session?.provider_token;

    if (!token) {
      const { data: profile } = await supabase.from('profile').select('github_token').eq('user_id', user.id).single();
      token = profile?.github_token;
    }

    if (token) {
      try {
        const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setRepos(await res.json());
      } catch (e) {}
    }
    setLoadingRepos(false);
  };

  const analyzeRepo = async (repo: any) => {
    setAnalyzingRepo(repo.full_name);
    setResults(null);
    setSelectedRepo(repo);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.provider_token}`
        },
        body: JSON.stringify({ repoFullName: repo.full_name, repoName: repo.name })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResults(data);

      // Update stats for Overview tab
      if (data.structured) {
        setStats({
          quality: data.structured.qualityScore || 85,
          blastRadius: data.structured.blastRadius || 87,
          security: data.structured.security || 49,
          performance: data.structured.performance || 53,
        });
      }
    } catch (error: any) {
      alert("Analysis failed: " + error.message);
    }
    setAnalyzingRepo(null);
  };

  const displayName = user?.user_metadata?.user_name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen text-white" style={{ background: '#0b0b14' }}>
      {/* Navigation */}
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
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-1 capitalize font-medium transition-all ${
                  activeTab === tab ? 'text-white border-b-2 border-violet-500' : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            {[Search, User, Clipboard].map((Icon, i) => (
              <button key={i} className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] flex items-center justify-center transition-colors">
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
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0">
          <h2 className="text-xs font-medium text-zinc-500 mb-4 tracking-widest uppercase">REPOSITORY</h2>
          <div className="space-y-2">
            {loadingRepos ? (
              <div className="text-zinc-500 text-sm px-2 py-4">Loading repositories...</div>
            ) : repos.length === 0 ? (
              <div className="text-zinc-500 text-sm px-2 py-4">No repositories found</div>
            ) : (
              repos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => analyzeRepo(repo)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedRepo?.id === repo.id ? 'border-violet-500/50 bg-violet-950/25' : 'border-white/[0.07] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-800 rounded-xl flex items-center justify-center text-[10px] font-bold">AI</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{repo.name}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">Click to analyze</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'overview' && (
            <div>
              <div className="mb-8">
                <h1 className="text-5xl font-bold tracking-tighter">Welcome back, {displayName}</h1>
                <p className="text-zinc-500 mt-2 text-sm">Your AI Code Intelligence Platform</p>
              </div>

              <div className="grid grid-cols-12 gap-4">
                {/* Code Quality Score */}
                <div className="col-span-12 lg:col-span-5 rounded-3xl p-8 flex flex-col" 
                     style={{ background: 'linear-gradient(145deg, #2d1b69 0%, #1a0f3c 55%, #0f0820 100%)', border: '1px solid rgba(139,92,246,0.3)', minHeight: '230px' }}>
                  <p className="text-xs uppercase tracking-widest text-violet-300/60 font-medium mb-6">CODE QUALITY SCORE</p>
                  <div className="flex items-center justify-center flex-1">
                    <CircularGauge value={stats.quality} />
                  </div>
                </div>

                {/* Summary Analysis */}
                <div className="col-span-12 lg:col-span-7 rounded-3xl p-8" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 className="text-base font-semibold mb-3">Summary Analysis</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {results?.analysis ? results.analysis.split('\n')[0] || "Analysis complete" : "Select a repository from the left to run an AI analysis."}
                  </p>
                </div>

                {/* Blast Radius */}
                <div className="col-span-6 lg:col-span-3 rounded-3xl p-6" style={{ background: '#16102a', border: '1px solid rgba(168,85,247,0.2)' }}>
                  <span className="text-xs bg-white/[0.07] text-zinc-300 px-2.5 py-1 rounded-lg font-medium">Blast Radius</span>
                  <div className="text-4xl font-bold mt-4">{stats.blastRadius}</div>
                  <div className="text-xs text-zinc-600">Critical Issues</div>
                </div>

                {/* Security */}
                <div className="col-span-6 lg:col-span-3 rounded-3xl p-6" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xs bg-white/[0.07] text-zinc-300 px-2.5 py-1 rounded-lg font-medium">Security</span>
                  <div className="text-4xl font-bold mt-4">{stats.security}</div>
                  <div className="text-xs text-zinc-600">mm exposure</div>
                </div>

                {/* Performance */}
                <div className="col-span-6 lg:col-span-3 rounded-3xl p-6" style={{ background: '#16102a', border: '1px solid rgba(168,85,247,0.2)' }}>
                  <span className="text-xs bg-white/[0.07] text-zinc-300 px-2.5 py-1 rounded-lg font-medium">Performance</span>
                  <div className="text-4xl font-bold mt-4">{stats.performance}</div>
                  <div className="text-xs text-zinc-600">score</div>
                </div>

                {/* Second Security */}
                <div className="col-span-6 lg:col-span-3 rounded-3xl p-6" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xs bg-white/[0.07] text-zinc-300 px-2.5 py-1 rounded-lg font-medium">Security</span>
                  <div className="text-4xl font-bold mt-4">47</div>
                  <div className="text-xs text-zinc-600">mm exposure</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div>
              <div className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight">
                  {selectedRepo ? selectedRepo.name : 'Analysis'}
                </h1>
                <p className="text-zinc-500 mt-1 text-sm">
                  {results ? 'AI analysis complete' : analyzingRepo ? 'Running analysis...' : 'Select a repository to analyze'}
                </p>
              </div>
              <div className="rounded-3xl p-8 min-h-[600px]" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                {analyzingRepo ? (
                  <div className="h-[500px] flex items-center justify-center text-center">
                    <div>
                      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                      <p className="text-xl text-white">Analyzing {selectedRepo?.name}...</p>
                    </div>
                  </div>
                ) : results ? (
                  <AnalysisRenderer content={results.analysis} />
                ) : (
                  <div className="h-[500px] flex items-center justify-center text-center">
                    <p className="text-zinc-400">Select a repository on the left</p>
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