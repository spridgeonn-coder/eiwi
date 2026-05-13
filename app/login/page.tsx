'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Login() {
  const handleGitHubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="max-w-md w-full px-8 text-center">
        <a href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white mb-12 inline-flex">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </a>

        <div className="mb-10">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-600 rounded-3xl flex items-center justify-center">
            <span className="font-bold text-6xl">E</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight">Sign In</h1>
          <p className="text-zinc-400 mt-3 text-lg">Connect with GitHub to continue</p>
        </div>

        <Button 
          onClick={handleGitHubLogin}
          size="lg"
          className="w-full py-8 text-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700"
        >
          <span className="mr-4 text-2xl">🐙</span>
          Continue with GitHub
        </Button>

        <p className="text-zinc-500 text-sm mt-8">
          You’ll be redirected to GitHub to authorize Eiwi
        </p>
      </div>
    </div>
  );
}