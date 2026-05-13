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
        alert("GitHub connection expired. Please go to Profile → Reconnect GitHub.");
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
        alert("Failed to load repositories. Try reconnecting GitHub in Profile.");
      }
    } catch (error) {
      console.error(error);
      alert("Error loading repositories");
    }
    setLoadingRepos(false);
  };

  // ... rest of your functions (parseSections, analyzeRepo, etc.) stay the same

  const analyzeRepo = async (repo: any) => {
    setAnalyzingRepo(repo.full_name);
    setResults(null);
    setActiveSectionId("summary");

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ (await supabase.auth.getSession()).data.session?.provider_token }`
        },
        body: JSON.stringify({ repoFullName: repo.full_name, repoName: repo.name })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      alert("Failed to analyze repo");
    }
    setAnalyzingRepo(null);
  };

  // (Keep all your existing parseSections, extractRating, copyAll, displayName logic here)
  // ... I'll assume you still have them from before

  const displayName = profile && (profile.first_name || profile.last_name) 
    ? `${profile.first_name} ${profile.last_name}`.trim() 
    : user?.email?.split('@')[0] || 'User';

  if (!user) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white text-xl">Loading Eiwi...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navbar */}
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

      {/* Rest of dashboard remains the same as before */}
      {/* ... (your existing repo list and AI analysis cards) ... */}
    </div>
  );
}