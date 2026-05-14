'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, FileText, User, Sparkles } from "lucide-react";
import AnalysisRenderer from '@/components/AnalysisRenderer';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    loadUserAndProfile();
  }, []);

  const loadUserAndProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data } = await supabase.from('profile').select('*').eq('user_id', user.id).single();
      setProfile(data);
    }
  };

  const fetchRepos = async () => {
    setLoadingRepos(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) {
        alert("GitHub connection expired. Please reconnect in Profile.");
        return;
      }
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
        headers: { Authorization: `Bearer ${session.provider_token}` }
      });
      if (res.ok) setRepos(await res.json());
    } catch (e) {
      alert("Failed to load repositories");
    }
    setLoadingRepos(false);
  };

  const analyzeRepo = async (repo: any) => {
    setAnalyzingRepo(repo.full_name);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) {
        alert("GitHub token expired.");
        return;
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.provider_token}`
        },
        body: JSON.stringify({ repoFullName: repo.full_name, repoName: repo.name })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setResults({ ...data, repoData: repo });
    } catch (error: any) {
      alert("Failed to analyze: " + error.message);
    }
    setAnalyzingRepo(null);
  };

  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top Navigation */}
      <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <span className="font-bold text-3xl">E</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tighter">Eiwi</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative w-80">
              <input
                type="text"
                placeholder="Search repositories..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-full py-2.5 px-5 pl-12 text-sm focus:outline-none focus:border-violet-500"
              />
              <div className="absolute left-4 top-3 text-zinc-500">🔍</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium">Nick</p>
                <p className="text-xs text-zinc-500">Pro Plan</p>
              </div>
              <div className="w-9 h-9 bg-zinc-700 rounded-full flex items-center justify-center">
                👤
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-10 flex gap-8">
        {/* Left Sidebar - Repositories */}
        <div className="w-80 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Repositories</h2>
            <Button onClick={fetchRepos} disabled={loadingRepos} size="sm" variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingRepos ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="space-y-3">
            {repos.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No repositories loaded</p>
            ) : (
              repos.map((repo: any) => (
                <Card key={repo.id} className="bg-zinc-900 border-zinc-800 hover:border-violet-500/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">{repo.name}</p>
                        <p className="text-sm text-zinc-400 line-clamp-2 mt-1">
                          {repo.description || 'No description'}
                        </p>
                      </div>
                      <Button
                        onClick={() => analyzeRepo(repo)}
                        disabled={analyzingRepo === repo.full_name}
                        className="bg-violet-600 hover:bg-violet-700 text-white"
                        size="sm"
                      >
                        {analyzingRepo === repo.full_name ? 'Analyzing...' : 'Analyze'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-8">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">Welcome back, {displayName}</h1>
            <p className="text-zinc-400 mt-2">Let's improve your code today.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Code Health</p>
                    <p className="text-5xl font-bold text-white mt-3">8.7<span className="text-2xl">/10</span></p>
                  </div>
                  <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center">
                    ⭐
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Issues Found</p>
                    <p className="text-5xl font-bold text-white mt-3">12</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
                    ⚠️
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Analysis Score</p>
                    <p className="text-5xl font-bold text-white mt-3">87<span className="text-2xl">%</span></p>
                  </div>
                  <div className="relative w-14 h-14">
                    <svg className="w-14 h-14 -rotate-12" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4F46E5" strokeWidth="3" strokeDasharray="87, 100" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-violet-400" />
                  Detailed Analysis
                </CardTitle>
                {results && (
                  <div className="text-sm text-zinc-400">
                    {results.repoData?.full_name}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-8">
              {results ? (
                <AnalysisRenderer content={results.analysis} />
              ) : (
                <div className="h-[500px] flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center mb-6">
                    📊
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">Ready to analyze</h3>
                  <p className="text-zinc-400 max-w-md">
                    Select a repository from the left and click Analyze to get a deep technical review.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}