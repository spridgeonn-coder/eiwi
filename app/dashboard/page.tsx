'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap, Shield, Target } from "lucide-react";
import AnalysisRenderer from '@/components/AnalysisRenderer';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);

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

  return (
    <div className="min-h-screen bg-[#050507] text-white overflow-hidden relative">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a2e_1px,transparent_1px),linear-gradient(to_bottom,#1a1a2e_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />

      {/* Top Nav */}
      <nav className="border-b border-white/10 bg-black/90 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-10 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-500/50">
              <span className="font-black text-3xl tracking-tighter">E</span>
            </div>
            <span className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">eiwi</span>
          </div>

          <div className="flex items-center gap-10 text-sm font-medium">
            <a className="text-white border-b-2 border-violet-500 pb-1">Overview</a>
            <a className="text-zinc-400 hover:text-white transition-colors">Analysis</a>
            <a className="text-zinc-400 hover:text-white transition-colors">Issues</a>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-5 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </div>
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-lg shadow-lg">N</div>
          </div>
        </div>
      </nav>

      <div className="max-w-screen-2xl mx-auto px-10 py-12">
        <h1 className="text-7xl font-bold tracking-tighter mb-2">Welcome back, Nick</h1>
        <p className="text-xl text-zinc-400">Your AI Code Intelligence Platform</p>

        <div className="grid grid-cols-12 gap-8 mt-12">
          {/* Repos Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h3 className="uppercase text-xs tracking-[3px] text-zinc-500">Repositories</h3>
              <Button onClick={fetchRepos} variant="ghost" size="sm">
                <RefreshCw className={`w-4 h-4 ${loadingRepos ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="space-y-4">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => analyzeRepo(repo)}
                  className={`p-6 rounded-3xl border transition-all cursor-pointer group hover:scale-[1.02] ${
                    selectedRepo?.id === repo.id 
                      ? 'border-violet-500 bg-gradient-to-br from-violet-950/50 to-transparent' 
                      : 'border-white/10 hover:border-white/30 bg-zinc-900/50'
                  }`}
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 flex items-center justify-center text-xl font-bold">AI</div>
                    <div>
                      <p className="font-semibold text-xl group-hover:text-violet-300 transition-colors">{repo.name}</p>
                      <p className="text-xs text-zinc-500">Last analyzed moments ago</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Area */}
          <div className="col-span-12 lg:col-span-9 space-y-8">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Code Quality */}
              <div className="md:col-span-5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-violet-500/30 rounded-3xl p-10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(167,139,250,0.15),transparent)]" />
                <p className="uppercase tracking-[4px] text-xs text-violet-400 mb-4">CODE QUALITY SCORE</p>
                <div className="flex items-baseline">
                  <span className="text-[110px] font-bold leading-none tracking-tighter">87</span>
                  <span className="text-6xl text-zinc-500 ml-2">%</span>
                </div>
                <p className="text-emerald-400 font-medium mt-2">Strong • Improving</p>
              </div>

              {/* Blast Radius */}
              <div className="md:col-span-3 bg-zinc-900/80 border border-red-500/30 rounded-3xl p-8 hover:border-red-500/50 transition-colors">
                <p className="text-red-400 uppercase tracking-widest text-sm">BLAST RADIUS</p>
                <div className="text-7xl font-bold mt-6">12</div>
                <p className="text-zinc-400">Critical Issues</p>
              </div>

              {/* Security */}
              <div className="md:col-span-4 bg-zinc-900/80 border border-violet-500/30 rounded-3xl p-8">
                <p className="text-violet-400 uppercase tracking-widest text-sm">SECURITY</p>
                <div className="text-7xl font-bold mt-6">47</div>
                <p className="text-zinc-400">mm exposure</p>
              </div>
            </div>

            {/* Performance */}
            <div className="bg-gradient-to-r from-zinc-900 to-black border border-cyan-500/30 rounded-3xl p-10 flex items-center justify-between">
              <div>
                <p className="text-cyan-400 uppercase tracking-widest text-sm">PERFORMANCE</p>
                <div className="text-7xl font-bold mt-3">68<span className="text-4xl text-zinc-500">/100</span></div>
              </div>
              <Zap className="w-20 h-20 text-amber-400 drop-shadow-[0_0_30px_rgb(251,191,36)]" />
            </div>

            {/* Detailed Analysis */}
            <div className="bg-zinc-900/70 border border-white/10 rounded-3xl p-10 min-h-[620px]">
              <div className="flex items-center gap-4 mb-10">
                <Target className="text-violet-400" />
                <h2 className="text-4xl font-semibold tracking-tight">Detailed Analysis</h2>
              </div>

              {results ? (
                <AnalysisRenderer content={results.analysis} />
              ) : (
                <div className="flex flex-col items-center justify-center h-[500px] text-center">
                  <div className="text-8xl mb-8 opacity-30">⚡</div>
                  <h3 className="text-4xl font-medium mb-4">Select a repository</h3>
                  <p className="text-zinc-400 max-w-md">Choose one from the left to run a deep staff-level technical review</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}