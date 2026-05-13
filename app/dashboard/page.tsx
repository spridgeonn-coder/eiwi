'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, RefreshCw, FileText, Star, Copy, User } from "lucide-react";

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
      if (data) setProfile(data);
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
        alert("GitHub connection expired. Please go to Profile and reconnect.");
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
      } else {
        alert("Failed to load repositories.");
      }
    } catch (error) {
      console.error(error);
      alert("Error loading repositories");
    }
    setLoadingRepos(false);
  };

  const analyzeRepo = async (repo: any) => {
    setAnalyzingRepo(repo.full_name);
    setResults(null);
    setActiveSectionId("summary");

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: repo.full_name, repoName: repo.name })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        alert("Analysis failed: " + data.error);
      } else {
        setResults(data);
      }
    } catch (error: any) {
      console.error("Analyze error:", error);
      alert("Failed to analyze repo. Check console (F12) for details.");
    }
    setAnalyzingRepo(null);
  };

  const parseSections = (text: string) => {
    const sections: { title: string; content: string; id: string }[] = [];
    let currentTitle = '';
    let currentContent: string[] = [];

    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^\*\*.*?\*\*$/) || trimmed.match(/^#{1,3}\s/)) {
        if (currentTitle) {
          sections.push({
            title: currentTitle,
            content: currentContent.join('\n').trim(),
            id: currentTitle.toLowerCase().replace(/\s+/g, '-')
          });
        }
        currentTitle = trimmed.replace(/^\*\*|\*\*$|^#{1,3}\s/g, '').trim();
        currentContent = [];
      } else if (currentTitle) {
        currentContent.push(line);
      }
    }

    if (currentTitle) {
      sections.push({
        title: currentTitle,
        content: currentContent.join('\n').trim(),
        id: currentTitle.toLowerCase().replace(/\s+/g, '-')
      });
    }

    return sections.length > 0 ? sections : [{ title: "Analysis", content: text, id: "analysis" }];
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
      alert("All results copied!");
    }
  };

  const displayName = profile && (profile.first_name || profile.last_name) 
    ? `${profile.first_name} ${profile.last_name}`.trim() 
    : user?.email?.split('@')[0] || 'User';

  if (!user) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white text-xl">Loading Eiwi...</div>;
  }

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
            <p className="text-zinc-400 mt-2 text-lg">AI-powered testing & documentation</p>
          </div>
          <Button onClick={fetchRepos} disabled={loadingRepos} size="lg" className="gap-3">
            <RefreshCw className={`w-5 h-5 ${loadingRepos ? 'animate-spin' : ''}`} />
            {loadingRepos ? 'Loading...' : 'Refresh Repositories'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Repositories */}
          <div className="lg:col-span-5">
            <Card className="bg-zinc-900/70 border border-zinc-700 backdrop-blur overflow-hidden h-fit">
              <CardHeader className="border-b border-zinc-700 pb-4">
                <CardTitle className="text-2xl text-white">Your Repositories</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {repos.length > 0 ? (
                  <div className="space-y-4">
                    {repos.map((repo) => (
                      <div key={repo.id} className="flex justify-between items-center p-5 bg-zinc-800/80 rounded-2xl hover:border-violet-500/30 border border-transparent transition-all">
                        <div className="flex-1">
                          <p className="font-semibold text-lg text-white">{repo.name}</p>
                          <p className="text-zinc-400 text-sm mt-1">{repo.description || 'No description'}</p>
                        </div>
                        <Button 
                          onClick={() => analyzeRepo(repo)}
                          disabled={analyzingRepo === repo.full_name}
                          className="bg-violet-600 hover:bg-violet-700 px-8"
                        >
                          {analyzingRepo === repo.full_name ? "Analyzing..." : "Analyze"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-zinc-400">
                    Click "Refresh Repositories" to load your repos
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Results */}
          <div className="lg:col-span-7 space-y-8">
            {results && ratingScore !== null && (
              <Card className="bg-zinc-900/70 border border-violet-500/30 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center gap-3">
                    Code Quality Rating
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="flex items-center gap-6">
                    <div className="text-7xl font-bold text-violet-400">{ratingScore}</div>
                    <div>
                      <div className="text-3xl text-zinc-500">/10</div>
                      <div className="flex mt-2">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <Star key={i} className={`w-8 h-8 ${i < ratingScore ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-700'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-zinc-900/70 border border-zinc-700 backdrop-blur min-h-[600px] flex flex-col">
              <CardHeader className="border-b border-zinc-700 flex flex-row items-center justify-between">
                <CardTitle className="text-2xl text-white flex items-center gap-3">
                  <FileText className="w-6 h-6" />
                  Detailed Analysis
                </CardTitle>
                {results && (
                  <Button onClick={copyAll} variant="outline" size="sm" className="gap-2">
                    <Copy className="w-4 h-4" />
                    Copy All
                  </Button>
                )}
              </CardHeader>

              <div className="flex flex-1 overflow-hidden">
                <div className="w-64 border-r border-zinc-700 p-4 bg-zinc-900/50 overflow-auto">
                  <div className="text-sm font-medium text-zinc-400 mb-3 px-3">SECTIONS</div>
                  {parsedSections
                    .filter(s => !s.title.toLowerCase().includes("rating"))
                    .map((section, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveSectionId(section.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-all text-sm ${
                          activeSectionId === section.id 
                            ? 'bg-violet-600 text-white font-medium' 
                            : 'hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {section.title}
                      </button>
                    ))}
                </div>

                <div className="flex-1 p-8 overflow-auto">
                  {results && currentSection ? (
                    <div>
                      <h3 className="text-3xl font-semibold text-violet-400 mb-6">
                        {currentSection.title}
                      </h3>
                      <div className="text-white text-[15.5px] leading-relaxed whitespace-pre-wrap">
                        {currentSection.content}
                      </div>
                    </div>
                  ) : results ? (
                    <p className="text-zinc-400">Select a section from the left</p>
                  ) : (
                    <div className="text-center py-32 text-zinc-400">
                      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-3xl flex items-center justify-center mb-6 border border-violet-500/20">
                        <FileText className="w-10 h-10 text-violet-400" />
                      </div>
                      <p className="text-xl font-medium text-white">Ready when you are</p>
                      <p className="mt-3">Pick a repo on the left and click Analyze</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}