'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, RefreshCw, FileText, Copy, User, Sparkles } from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("summary");

  useEffect(() => {
    loadUserAndProfile();
  }, []);

  const loadUserAndProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data } = await supabase
        .from('profile')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setProfile(data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const fetchRepos = async () => {
    setLoadingRepos(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) {
        alert("GitHub connection expired. Please reconnect in Profile.");
        setLoadingRepos(false);
        return;
      }

      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRepos(data);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to load repositories");
    }
    setLoadingRepos(false);
  };

  const analyzeRepo = async (repo: any, mode: 'normal' | '10star' = 'normal') => {
    setAnalyzingRepo(repo.full_name);
    setResults(null);
    setActiveSectionId("summary");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) {
        alert("GitHub token expired. Please reconnect in Profile.");
        return;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.provider_token}`
        },
        body: JSON.stringify({ 
          repoFullName: repo.full_name, 
          repoName: repo.name,
          mode 
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResults({ ...data, repoData: repo });
    } catch (error: any) {
      console.error(error);
      alert("Failed to analyze repo: " + error.message);
    }
    setAnalyzingRepo(null);
  };

  const parseSections = (text: string) => {
    const sections = text.split(/\n\n(?=##|###|\*\*)/).map(section => {
      const titleMatch = section.match(/^(##|###|\*\*)(.+?)\*\*/m) || section.match(/^(.+?)(?=\n)/);
      const title = titleMatch ? titleMatch[2] || titleMatch[1] : "Section";
      const id = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return { id, title: title.trim(), content: section.trim() };
    });
    return sections;
  };

  const parsedSections = results?.analysis ? parseSections(results.analysis) : [];
  const currentSection = parsedSections.find(s => s.id === activeSectionId) || parsedSections[0];

  const extractRating = (text: string) => {
    const match = text.match(/Rating:\s*(\d+)\/10/i);
    return match ? parseInt(match[1]) : null;
  };

  const ratingScore = results?.analysis ? extractRating(results.analysis) : null;

  const copyAll = () => {
    if (results?.analysis) {
      navigator.clipboard.writeText(results.analysis);
      alert("Analysis copied to clipboard!");
    }
  };

  const displayName = profile && (profile.first_name || profile.last_name) 
    ? `${profile.first_name} ${profile.last_name}`.trim() 
    : user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="font-bold text-2xl">E</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tighter">Eiwi</h1>
          </div>

          <div className="flex items-center gap-6">
            <a href="/profile" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </a>
            <span className="text-zinc-400">Welcome, {displayName}</span>
            <Button onClick={handleSignOut} variant="outline" className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-5xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-zinc-400 mt-2 text-lg">AI-powered code analysis</p>
          </div>
          <Button onClick={fetchRepos} disabled={loadingRepos} size="lg" className="gap-3">
            <RefreshCw className={`w-5 h-5 ${loadingRepos ? 'animate-spin' : ''}`} />
            {loadingRepos ? 'Loading...' : 'Refresh Repositories'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Repositories List */}
          <div className="lg:col-span-5">
            <Card className="bg-zinc-900/70 border border-zinc-700 backdrop-blur overflow-hidden h-fit">
              <CardHeader className="border-b border-zinc-700 pb-4">
                <CardTitle className="text-2xl text-white">Your Repositories</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {repos.length > 0 ? (
                  repos.map((repo) => (
                    <div key={repo.id} className="p-5 bg-zinc-800/80 rounded-2xl border border-transparent hover:border-violet-500/30 transition-all flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg text-white">{repo.name}</p>
                        <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{repo.description || 'No description'}</p>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => analyzeRepo(repo, 'normal')}
                          disabled={analyzingRepo === repo.full_name}
                          className="bg-violet-600 hover:bg-violet-700 px-6"
                        >
                          {analyzingRepo === repo.full_name ? "Analyzing..." : "Analyze"}
                        </Button>
                        <Button 
                          onClick={() => analyzeRepo(repo, '10star')}
                          disabled={analyzingRepo === repo.full_name}
                          variant="outline"
                          className="border-violet-500 text-violet-400 hover:bg-violet-950"
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          10 Stars
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-zinc-400">
                    No repositories loaded. Click Refresh above.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis */}
          <div className="lg:col-span-7">
            <Card className="bg-zinc-900/70 border border-zinc-700 backdrop-blur overflow-hidden">
              <CardHeader className="border-b border-zinc-700 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-2xl text-white flex items-center gap-3">
                  <FileText className="w-6 h-6 text-violet-400" />
                  Detailed Analysis
                </CardTitle>

                <div className="flex items-center gap-3">
                  {/* 10 Stars Button - Purple with black text */}
                  <Button 
                    onClick={() => results?.repoData && analyzeRepo(results.repoData, '10star')}
                    disabled={!results}
                    className="bg-violet-600 hover:bg-violet-700 text-black font-medium px-6 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    10 Stars
                  </Button>

                  {/* Copy All */}
                  <Button 
                    onClick={copyAll} 
                    disabled={!results}
                    variant="outline"
                    className="border-zinc-700 hover:bg-zinc-800"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {results ? (
                  <div className="flex h-[700px]">
                    {/* Sidebar */}
                    <div className="w-64 border-r border-zinc-700 p-4 bg-zinc-950 overflow-auto">
                      <div className="uppercase text-xs tracking-widest text-zinc-500 mb-3">SECTIONS</div>
                      <div className="space-y-1">
                        {parsedSections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => setActiveSectionId(section.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                              activeSectionId === section.id 
                                ? 'bg-violet-600 text-white' 
                                : 'hover:bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {section.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-8 overflow-auto bg-gradient-to-br from-zinc-950 to-zinc-900">
                      <h3 className="text-3xl font-bold text-violet-400 mb-6">
                        {currentSection?.title || "Summary"}
                      </h3>
                      <div className="prose prose-invert max-w-none text-zinc-200 leading-relaxed">
                        {currentSection?.content || results.analysis}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[600px] flex flex-col items-center justify-center text-center text-zinc-400">
                    <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center mb-6">
                      <FileText className="w-10 h-10 text-violet-500" />
                    </div>
                    <p className="text-xl font-medium text-white">Ready when you are</p>
                    <p className="mt-2">Pick a repo on the left and click Analyze or 10 Stars</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}