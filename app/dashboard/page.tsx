'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, Zap } from "lucide-react";
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
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Top Navigation - Futuristic */}
      <nav className="border-b border-white/10 bg-black/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/50">
              <span className="font-bold text-2xl tracking-tighter">eiwi</span>
            </div>
          </div>

          <div className="flex items-center gap-8 text-sm">
            <div className="flex gap-8">
              <a href="#" className="text-white font-medium border-b-2 border-violet-500 pb-1">Overview</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Analysis</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Issues</a>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-zinc-900 border border-white/10 rounded-full px-4 py-2 text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Connected
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center text-sm font-bold">
                N
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-screen-2xl mx-auto px-8 py-8 flex gap-8">
        {/* Left Sidebar - Repos */}
        <div className="w-80 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold tracking-tight">Repositories</h2>
            <Button onClick={fetchRepos} disabled={loadingRepos} variant="ghost" size="sm">
              <RefreshCw className={`w-4 h-4 ${loadingRepos ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="space-y-3">
            {repos.map((repo) => (
              <div
                key={repo.id}
                onClick={() => analyzeRepo(repo)}
                className={`group bg-zinc-900/70 border border-white/10 hover:border-violet-500/50 rounded-3xl p-5 cursor-pointer transition-all duration-300 ${selectedRepo?.id === repo.id ? 'border-violet-500 bg-violet-950/30' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-xs font-bold">AI</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg truncate">{repo.name}</p>
                    <p className="text-xs text-zinc-500">Last analyzed: moments ago</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Dashboard Area */}
        <div className="flex-1 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-6xl font-bold tracking-tighter bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Welcome back, Nick
              </h1>
              <p className="text-zinc-400 mt-2 text-lg">Your AI Code Intelligence Platform</p>
            </div>
          </div>

          {/* Code Quality Score */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(at_50%_30%,rgba(139,92,246,0.15),transparent)]" />
              <h3 className="text-sm uppercase tracking-[3px] text-violet-400 mb-4">CODE QUALITY SCORE</h3>
              <div className="flex items-end gap-6">
                <div className="text-[120px] font-bold leading-none text-white">87</div>
                <div className="text-5xl text-zinc-500 mb-6">%</div>
              </div>
              <div className="text-emerald-400 text-lg font-medium">Strong • Improving</div>
            </div>

            {/* Right Side Cards */}
            <div className="col-span-12 lg:col-span-7 grid grid-cols-2 gap-6">
              <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-8">
                <div className="text-sm text-red-400 mb-2">BLAST RADIUS</div>
                <div className="text-6xl font-bold">12</div>
                <div className="text-zinc-400">Critical Issues</div>
              </div>

              <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-8">
                <div className="text-sm text-violet-400 mb-2">SECURITY</div>
                <div className="text-6xl font-bold">47</div>
                <div className="text-zinc-400">mm exposure</div>
              </div>

              <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-8 col-span-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-cyan-400">PERFORMANCE</div>
                    <div className="text-5xl font-bold mt-2">68<span className="text-2xl">/100</span></div>
                  </div>
                  <div className="text-7xl opacity-20">⚡</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Analysis Area */}
          <div className="bg-zinc-900/70 border border-white/10 rounded-3xl p-10 min-h-[600px]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-semibold flex items-center gap-3">
                <Zap className="text-violet-400" /> Detailed Analysis
              </h2>
              {results && <div className="text-sm text-zinc-400">{results.repoData?.full_name}</div>}
            </div>

            {results ? (
              <AnalysisRenderer content={results.analysis} />
            ) : (
              <div className="h-[500px] flex items-center justify-center text-center">
                <div>
                  <div className="text-6xl mb-6 opacity-40">⚡</div>
                  <h3 className="text-3xl font-semibold mb-3">Select a repository</h3>
                  <p className="text-zinc-400 max-w-md mx-auto">
                    Click on any repo from the sidebar to run a deep staff-level code review.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}