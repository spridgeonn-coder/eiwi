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
      const { data } = await supabase.from('profile').select('*').eq('user_id', user.id).single();
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

  const analyzeRepo = async (repo: any, mode: 'normal' | '10star' = 'normal') => {
    setAnalyzingRepo(repo.full_name);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) {
        alert("GitHub token expired. Please reconnect.");
        return;
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.provider_token}`
        },
        body: JSON.stringify({ repoFullName: repo.full_name, repoName: repo.name, mode })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults({ ...data, repoData: repo });
      setActiveSectionId("summary");
    } catch (error: any) {
      alert("Failed to analyze: " + error.message);
    }
    setAnalyzingRepo(null);
  };

  // Improved parsing
  const parseSections = (text: string) => {
    if (!text) return [];

    const sections = text.split(/(?=^#{1,3}\s|^##\s|^###\s|^\*\*.*?\*\*)/gm)
      .filter(s => s.trim().length > 10)
      .map(section => {
        let title = "Section";
        const titleMatch = section.match(/^(#{1,3})\s+(.+?)(?=\n|$)/m) || 
                          section.match(/^\*\*(.+?)\*\*/m);
        if (titleMatch) title = titleMatch[2].trim();

        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return { id, title, content: section.trim() };
      });

    return sections.length > 0 ? sections : [{ id: "summary", title: "Analysis", content: text }];
  };

  const parsedSections = results?.analysis ? parseSections(results.analysis) : [];
  const currentSection = parsedSections.find(s => s.id === activeSectionId) || parsedSections[0];

  const copyAll = () => {
    if (results?.analysis) {
      navigator.clipboard.writeText(results.analysis);
      alert("✅ Copied to clipboard");
    }
  };

  const displayName = profile?.first_name || profile?.last_name 
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
    : user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav - unchanged */}
      <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <span className="font-bold text-2xl">E</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tighter">Eiwi</h1>
          </div>
          <div className="flex items-center gap-6">
            <a href="/profile" className="text-zinc-400 hover:text-white flex items-center gap-2">
              <User className="w-4 h-4" /> Profile
            </a>
            <span className="text-zinc-400">Welcome, {displayName}</span>
            <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-5xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-zinc-400 mt-2">AI-powered code analysis</p>
          </div>
          <Button onClick={fetchRepos} disabled={loadingRepos} className="gap-3">
            <RefreshCw className={`w-5 h-5 ${loadingRepos ? 'animate-spin' : ''}`} />
            Refresh Repositories
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Repos List - unchanged */}
          <div className="lg:col-span-5">
            <Card className="bg-zinc-900/70 border border-zinc-700">
              <CardHeader><CardTitle>Your Repositories</CardTitle></CardHeader>
              <CardContent className="pt-6 space-y-4">
                {repos.map((repo) => (
                  <div key={repo.id} className="p-5 bg-zinc-800 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{repo.name}</p>
                      <p className="text-sm text-zinc-400">{repo.description || 'No description'}</p>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => analyzeRepo(repo, 'normal')} disabled={analyzingRepo === repo.full_name}>
                        Analyze
                      </Button>
                      <Button onClick={() => analyzeRepo(repo, '10star')} disabled={analyzingRepo === repo.full_name} variant="outline">
                        <Sparkles className="w-4 h-4 mr-1" />10 Stars
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Clean Detailed Analysis */}
          <div className="lg:col-span-7">
            <Card className="bg-zinc-900/70 border border-zinc-700 overflow-hidden">
              <CardHeader className="border-b border-zinc-700 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-violet-400" />
                  Detailed Analysis
                </CardTitle>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => results?.repoData && analyzeRepo(results.repoData, '10star')}
                    disabled={!results}
                    className="bg-violet-600 hover:bg-violet-700 text-black font-medium"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    10 Stars
                  </Button>
                  <Button onClick={copyAll} disabled={!results} variant="outline">
                    <Copy className="w-4 h-4 mr-2" /> Copy All
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {results ? (
                  <div className="flex h-[720px]">
                    {/* Sidebar */}
                    <div className="w-72 border-r border-zinc-700 bg-zinc-950 p-4 overflow-auto">
                      <div className="uppercase text-xs tracking-widest text-zinc-500 mb-4">SECTIONS</div>
                      <div className="space-y-1">
                        {parsedSections.map((sec) => (
                          <button
                            key={sec.id}
                            onClick={() => setActiveSectionId(sec.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                              activeSectionId === sec.id 
                                ? 'bg-violet-600 text-white font-medium' 
                                : 'hover:bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {sec.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Main Content - Much cleaner */}
                    <div className="flex-1 p-10 overflow-auto prose prose-invert max-w-none">
                      <h2 className="text-4xl font-bold text-white mb-8 tracking-tight">
                        {currentSection?.title}
                      </h2>
                      <div className="text-zinc-200 leading-relaxed text-[17px]">
                        {currentSection?.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[720px] flex items-center justify-center text-center">
                    <div>
                      <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
                      <p className="text-2xl text-white">Ready when you are</p>
                      <p className="text-zinc-400 mt-3">Select a repository and choose Analyze or 10 Stars</p>
                    </div>
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