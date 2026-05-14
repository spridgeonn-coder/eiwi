'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, User, Clipboard, Zap } from "lucide-react";
import AnalysisRenderer from '@/components/AnalysisRenderer';

// Circular progress gauge
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

// Decorative code lines for the code panel
const CODE_LINES = [
  `currcnig", $ll, "l","terreadlaterv"americ"lcu"){`,
  `  norplicgleterle"r'yline');`,
  `};`,
  ``,
  `currcnig", $ll, e"Wall"fromradtanirm dupartime'"ruely!"){`,
  `  norplicgumtre"k""yyitt";`,
  `};`,
  ``,
  `currcnig("{ "terriglatrer"smlecilmtho){ {;`,
  `  currcnig", $l,s'{"lulofarrpos"rable"umnlion"umnee"){`,
  `    currcnig", $l,""\\pri"lite";`,
  `    norplicgeslukte' "\\ri"lite";`,
  `  }`,
  `};`,
  `currcnig("| Sll,s"gamlll"enter{"ulit'$;/flite'"muoef'n"){`,
  `  norplicgcrlumtre"\\Vontierlie";"fomtipmnrir/"lib";`,
  `  };`,
  `}`,
  `)`,
];

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'issues'>('overview');

  // Placeholder stats — wire these up once your AI returns structured data
  const stats = {
    quality: 85,
    blastRadius: 87,
    blastRange: '310 m 624-32',
    securityMm: 49,
    securityRange: '310 m 225-90',
    performanceMm: 53,
    performanceRange: '310 m 224-96',
    securityMm2: 47,
    securityRange2: '349 m 676-95',
  };

  useEffect(() => {
    loadUser();
    fetchRepos();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchRepos = async () => {
    setLoadingRepos(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) return;
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
        headers: { Authorization: `Bearer ${session.provider_token}` }
      });
      if (res.ok) setRepos(await res.json());
    } catch (_) {}
    setLoadingRepos(false);
  };

  const analyzeRepo = async (repo: any) => {
    setAnalyzingRepo(repo.full_name);
    setResults(null);
    setSelectedRepo(repo);
    setActiveTab('analysis');

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
    } catch (error: any) {
      alert("Analysis failed: " + error.message);
    }
    setAnalyzingRepo(null);
  };

  const displayName = user?.user_metadata?.user_name
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there';

  return (
    <div className="min-h-screen text-white" style={{ background: '#0b0b14' }}>

      {/* ── Navigation ── */}
      <nav className="border-b border-white/[0.07] bg-black/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-8 py-4 flex items-center gap-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mr-4">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/40">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L6 11L12 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight">eiwi</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-8 text-sm flex-1">
            {(['overview', 'analysis', 'issues'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-1 capitalize font-medium transition-all ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-violet-500'
                    : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Right side icons */}
          <div className="flex items-center gap-2.5">
            {[Search, User, Clipboard].map((Icon, i) => (
              <button
                key={i}
                onClick={i === 1 ? () => window.location.href = '/profile' : undefined}
                className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] flex items-center justify-center transition-colors"
              >
                <Icon className="w-4 h-4 text-zinc-400" />
              </button>
            ))}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold shadow-md ml-1">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="max-w-screen-2xl mx-auto px-8 py-8 flex gap-6">

        {/* ── Left Sidebar ── */}
        <div className="w-72 flex-shrink-0">
          <h2 className="text-xs font-medium text-zinc-500 mb-4 tracking-widest uppercase">Repository</h2>
          <div className="space-y-2">
            {loadingRepos ? (
              <div className="text-zinc-600 text-sm px-2 py-4">Loading repos...</div>
            ) : repos.length === 0 ? (
              <div className="text-zinc-600 text-sm px-2 py-4">No repositories found</div>
            ) : repos.map((repo) => (
              <div
                key={repo.id}
                onClick={() => analyzeRepo(repo)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedRepo?.id === repo.id
                    ? 'border-violet-500/50 bg-violet-950/25'
                    : 'border-white/[0.07] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-800 rounded-xl flex items-center justify-center text-[10px] font-bold shadow-md flex-shrink-0">
                    AI
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{repo.name}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {analyzingRepo === repo.full_name
                        ? 'Analyzing...'
                        : selectedRepo?.id === repo.id && results
                        ? 'Last analyzed just now'
                        : `Last analyzed ${repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString() : '—'}`}
                    </p>
                  </div>
                  {analyzingRepo === repo.full_name && (
                    <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0">

          {/* ════ OVERVIEW TAB ════ */}
          {activeTab === 'overview' && (
            <div>
              <div className="mb-8">
                <h1 className="text-5xl font-bold tracking-tighter">Welcome back, {displayName}</h1>
                <p className="text-zinc-500 mt-2 text-sm">Your AI Code Intelligence Platform</p>
              </div>

              <div className="grid grid-cols-12 gap-4">

                {/* Code Quality Score */}
                <div
                  className="col-span-12 lg:col-span-5 rounded-3xl p-8 flex flex-col"
                  style={{
                    background: 'linear-gradient(145deg, #2d1b69 0%, #1a0f3c 55%, #0f0820 100%)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    minHeight: '230px',
                  }}
                >
                  <p className="text-xs uppercase tracking-widest text-violet-300/60 font-medium mb-6">Code Quality Score</p>
                  <div className="flex items-center justify-center flex-1">
                    <CircularGauge value={stats.quality} />
                  </div>
                </div>

                {/* Summary Panel */}
                <div
                  className="col-span-12 lg:col-span-7 rounded-3xl p-8 flex flex-col justify-between"
                  style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)', minHeight: '230px' }}
                >
                  <div>
                    <h3 className="text-base font-semibold text-white mb-3">Summary Analysis</h3>
                    {results?.analysis ? (
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        {results.analysis.split('\n').find((l: string) => l.length > 60 && !l.startsWith('#') && !l.startsWith('*')) || 'Analysis complete — switch to the Analysis tab for full details.'}
                      </p>
                    ) : (
                      <p className="text-zinc-500 text-sm leading-relaxed">
                        Select a repository from the left to run an AI analysis. You'll get a full breakdown covering code quality, security vulnerabilities, blast radius issues, and performance.
                      </p>
                    )}
                  </div>
                  {results && (
                    <button
                      onClick={() => setActiveTab('analysis')}
                      className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors mt-4 self-start"
                    >
                      View full analysis →
                    </button>
                  )}
                  {!results && (
                    <div className="flex gap-3 mt-4">
                      <div className="h-1.5 rounded-full bg-violet-600/40 flex-1" />
                      <div className="h-1.5 rounded-full bg-violet-600/20 flex-[2]" />
                      <div className="h-1.5 rounded-full bg-violet-600/10 flex-[1.5]" />
                    </div>
                  )}
                </div>

                {/* Blast Radius */}
                <div
                  className="col-span-6 lg:col-span-3 rounded-3xl p-6 flex flex-col justify-between"
                  style={{ background: '#16102a', border: '1px solid rgba(168,85,247,0.2)', minHeight: '155px' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-white/[0.07] text-zinc-300 px-2.5 py-1 rounded-lg font-medium">Blast Radius</span>
                    <div className="w-7 h-7 bg-violet-600/80 rounded-xl flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold mt-2">{stats.blastRadius}<span className="text-xl text-zinc-500">,mm</span></div>
                    <div className="text-xs text-zinc-600 mt-1">{stats.blastRange}</div>
                  </div>
                </div>

                {/* Security 1 */}
                <div
                  className="col-span-6 lg:col-span-3 rounded-3xl p-6 flex flex-col justify-between"
                  style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)', minHeight: '155px' }}
                >
                  <span className="text-xs bg-white/[0.07] text-zinc-300 px-2.5 py-1 rounded-lg font-medium self-start">Security</span>
                  <div>
                    <div className="text-4xl font-bold mt-2">{stats.securityMm}<span className="text-xl text-zinc-500">,mm</span></div>
                    <div className="text-xs text-zinc-600 mt-1">{stats.securityRange}</div>
                  </div>
                </div>

                {/* Performance */}
                <div
                  className="col-span-6 lg:col-span-3 rounded-3xl p-6 flex flex-col justify-between"
                  style={{ background: '#16102a', border: '1px solid rgba(168,85,247,0.2)', minHeight: '155px' }}
                >
                  <div className="flex items-center justify-between">
                    <div />
                    <div className="w-7 h-7 bg-violet-600/80 rounded-xl flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400 font-medium mb-1">Performance</div>
                    <div className="text-4xl font-bold">{stats.performanceMm}<span className="text-xl text-zinc-500">,mm</span></div>
                    <div className="text-xs text-zinc-600 mt-1">{stats.performanceRange}</div>
                  </div>
                </div>

                {/* Security 2 */}
                <div
                  className="col-span-6 lg:col-span-3 rounded-3xl p-6 flex flex-col justify-between"
                  style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)', minHeight: '155px' }}
                >
                  <span className="text-xs bg-white/[0.07] text-zinc-300 px-2.5 py-1 rounded-lg font-medium self-start">Security</span>
                  <div>
                    <div className="text-4xl font-bold mt-2">{stats.securityMm2}<span className="text-xl text-zinc-500">,mm</span></div>
                    <div className="text-xs text-zinc-600 mt-1">{stats.securityRange2}</div>
                  </div>
                </div>

                {/* Code Snippet Panel */}
                <div
                  className="col-span-12 lg:col-span-6 rounded-3xl overflow-hidden"
                  style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.05]">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    <span className="text-xs text-zinc-600 ml-2 font-mono">
                      {selectedRepo?.name || 'repository'}/route.ts
                    </span>
                  </div>
                  <div className="p-5 font-mono text-[11px] leading-5 overflow-hidden" style={{ maxHeight: '200px' }}>
                    {CODE_LINES.map((line, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="text-zinc-700 select-none w-5 text-right flex-shrink-0">{i + 1}</span>
                        <span className={
                          line.includes('currcnig') ? 'text-violet-400' :
                          line.includes('norplicg') ? 'text-cyan-400/80' :
                          line.startsWith('  ') ? 'text-zinc-300' :
                          'text-zinc-600'
                        }>{line || ' '}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ════ ANALYSIS TAB ════ */}
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

              <div
                className="rounded-3xl p-8 min-h-[600px]"
                style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {analyzingRepo ? (
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

          {/* ════ ISSUES TAB ════ */}
          {activeTab === 'issues' && (
            <div>
              <div className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight">Issues</h1>
                <p className="text-zinc-500 mt-1 text-sm">Critical findings from your latest analysis</p>
              </div>

              <div
                className="rounded-3xl p-8 min-h-[600px]"
                style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {results?.analysis ? (
                  <div className="space-y-3">
                    {results.analysis
                      .split('\n')
                      .filter((l: string) => l.match(/^(\d+\.|[-*•])\s/) && l.length > 20)
                      .slice(0, 15)
                      .map((line: string, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-4 p-5 rounded-2xl"
                          style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                            i < 3 ? 'bg-red-500' : i < 7 ? 'bg-amber-500' : 'bg-zinc-600'
                          }`} />
                          <p className="text-sm text-zinc-300 leading-relaxed">
                            {line.replace(/^(\d+\.|[-*•])\s/, '')}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="h-[500px] flex items-center justify-center text-center">
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