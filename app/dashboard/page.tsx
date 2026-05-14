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
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Top Navigation */}
      <nav className="border-b border-white/10 bg-black/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
              <span className="font-bold">E</span>
            </div>
            <span className="text-2xl font-semibold tracking-tighter">eiwi</span>
          </div>

          <div className="flex items-center gap-8 text-sm">
            <a className="text-white border-b-2 border-violet-500 pb-1">Overview</a>
            <a className="text-zinc-400 hover:text-white">Analysis</a>
            <a className="text-zinc-400 hover:text-white">Issues</a>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Connected
            </div>
            <div className="w-9 h-9 bg-violet-600 rounded-2xl flex items-center justify-center font-bold">N</div>
          </div>
        </div>
      </nav>

      <div className="max-w-screen-2xl mx-auto px-8 py-10 flex gap-8">
        {/* Left Sidebar - Repositories */}
        <div className="w-80 flex-shrink-0">
          <h2 className="text-lg font-semibold mb-6">Repositories</h2>
          <div className="space-y-3">
            {repos.map((repo) => (
              <div
                key={repo.id}
                onClick={() => analyzeRepo(repo)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedRepo?.id === repo.id 
                    ? 'border-violet-500 bg-violet-950/30' 
                    : 'border-white/10 hover:border-white/30 bg-zinc-900/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-xs">AI</div>
                  <div className="flex-1">
                    <p className="font-medium">{repo.name}</p>
                    <p className="text-xs text-zinc-500">Last analyzed moments ago</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="mb-10">
            <h1 className="text-6xl font-bold tracking-tighter">Welcome back, Nick</h1>
            <p className="text-zinc-400 mt-2">Your AI Code Intelligence Platform</p>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Code Quality Score */}
            <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-violet-500/30 rounded-3xl p-10">
              <p className="uppercase text-xs tracking-widest text-violet-400 mb-4">CODE QUALITY SCORE</p>
              <div className="flex items-baseline gap-4">
                <span className="text-[110px] font-bold leading-none">87</span>
                <span className="text-6xl text-zinc-400">%</span>
              </div>
              <div className="text-emerald-400 text-lg font-medium mt-2">Strong • Improving</div>
            </div>

            {/* Blast Radius & Security */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-zinc-900 border border-red-500/30 rounded-3xl p-8">
                <p className="text-red-400 text-sm uppercase tracking-widest">BLAST RADIUS</p>
                <div className="text-6xl font-bold mt-4">12</div>
                <p className="text-zinc-400">Critical Issues</p>
              </div>

              <div className="bg-zinc-900 border border-violet-500/30 rounded-3xl p-8">
                <p className="text-violet-400 text-sm uppercase tracking-widest">SECURITY</p>
                <div className="text-6xl font-bold mt-4">47</div>
                <p className="text-zinc-400">mm exposure</p>
              </div>
            </div>

            {/* Performance */}
            <div className="col-span-12 lg:col-span-3 bg-zinc-900 border border-cyan-500/30 rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <p className="text-cyan-400 text-sm uppercase tracking-widest">PERFORMANCE</p>
                <div className="text-6xl font-bold mt-6">68</div>
                <p className="text-zinc-400">/100</p>
              </div>
              <Zap className="w-12 h-12 text-amber-400 self-end" />
            </div>
          </div>

          {/* Detailed Analysis */}
          <div className="mt-8 bg-zinc-900 border border-white/10 rounded-3xl p-10">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="text-violet-400" />
              <h2 className="text-3xl font-semibold">Detailed Analysis</h2>
            </div>

            {results ? (
              <AnalysisRenderer content={results.analysis} />
            ) : (
              <div className="h-[500px] flex items-center justify-center text-center">
                <div>
                  <div className="text-7xl mb-6 opacity-40">⚡</div>
                  <h3 className="text-3xl">Select a repository</h3>
                  <p className="text-zinc-400 mt-3">Click any repo on the left to start analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}