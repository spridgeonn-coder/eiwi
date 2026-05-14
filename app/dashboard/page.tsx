'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap } from "lucide-react";
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
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Top Nav */}
      <nav className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-10 py-5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center">
                <span className="font-bold text-xl">E</span>
              </div>
              <span className="text-2xl font-semibold tracking-tighter">eiwi</span>
            </div>

            <div className="flex items-center gap-8 text-sm font-medium">
              <a href="#" className="text-white border-b-2 border-violet-500 pb-1">Overview</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Analysis</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Issues</a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 text-emerald-400 text-xs px-4 py-1.5 rounded-full flex items-center gap-2 border border-emerald-500/20">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Connected
            </div>
            <div className="w-9 h-9 bg-violet-600 rounded-full flex items-center justify-center font-semibold">N</div>
          </div>
        </div>
      </nav>

      <div className="max-w-screen-2xl mx-auto px-10 py-10">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-6xl font-bold tracking-tighter">Welcome back, Nick</h1>
            <p className="text-zinc-400 mt-2 text-xl">Your AI Code Intelligence Platform</p>
          </div>
          <Button onClick={fetchRepos} disabled={loadingRepos} variant="outline" className="border-white/20">
            <RefreshCw className={`mr-2 w-4 h-4 ${loadingRepos ? 'animate-spin' : ''}`} />
            Refresh Repos
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Repositories Sidebar */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <h3 className="text-lg font-semibold text-zinc-400 mb-4">Repositories</h3>
            {repos.map((repo) => (
              <div
                key={repo.id}
                onClick={() => analyzeRepo(repo)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer group ${
                  selectedRepo?.id === repo.id 
                    ? 'bg-violet-950/50 border-violet-500' 
                    : 'bg-zinc-900/50 border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-sm font-bold">AI</div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg group-hover:text-violet-400 transition-colors">{repo.name}</p>
                    <p className="text-xs text-zinc-500">Last analyzed • moments ago</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9 space-y-8">
            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Code Quality Score */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                <p className="uppercase text-xs tracking-[2px] text-violet-400 mb-6">CODE QUALITY SCORE</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-8xl font-bold tracking-tighter">87</span>
                  <span className="text-5xl text-zinc-500">%</span>
                </div>
                <p className="text-emerald-400 mt-2 font-medium">Strong • Improving</p>
              </div>

              {/* Blast Radius */}
              <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-8">
                <p className="text-red-400 text-sm uppercase tracking-widest mb-4">BLAST RADIUS</p>
                <div className="text-7xl font-bold">12</div>
                <p className="text-zinc-400 mt-1">Critical Issues</p>
              </div>

              {/* Security */}
              <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-8">
                <p className="text-violet-400 text-sm uppercase tracking-widest mb-4">SECURITY</p>
                <div className="text-7xl font-bold">47</div>
                <p className="text-zinc-400 mt-1">mm exposure</p>
              </div>
            </div>

            {/* Performance Card */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-8 flex items-center justify-between">
              <div>
                <p className="text-cyan-400 text-sm uppercase tracking-widest">PERFORMANCE</p>
                <div className="text-7xl font-bold mt-3">68<span className="text-4xl text-zinc-500">/100</span></div>
              </div>
              <Zap className="w-16 h-16 text-amber-400" />
            </div>

            {/* Detailed Analysis */}
            <div className="bg-zinc-900/70 border border-white/10 rounded-3xl p-10">
              <div className="flex items-center gap-3 mb-8">
                <Zap className="text-violet-400" />
                <h2 className="text-3xl font-semibold">Detailed Analysis</h2>
              </div>

              {results ? (
                <AnalysisRenderer content={results.analysis} />
              ) : (
                <div className="min-h-[500px] flex items-center justify-center text-center">
                  <div>
                    <div className="text-6xl mb-6 opacity-30">⚡</div>
                    <h3 className="text-3xl font-medium mb-3">Select a repository</h3>
                    <p className="text-zinc-400">Choose one from the left to begin a deep technical review</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}