'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from "lucide-react";

export default function Login() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/dashboard';
      }
    });
  }, []);

  const handleGitHubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0b0b14' }}>

      <a href="/" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors mb-16 text-sm">
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </a>

      <div className="w-full max-w-sm text-center">

        <div className="w-16 h-16 mx-auto mb-8 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M4 14L11 21L24 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Welcome to eiwi</h1>
        <p className="text-zinc-500 text-sm mb-10">AI-powered code intelligence for your repos</p>

        <button
          onClick={handleGitHubLogin}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-white text-sm font-medium transition-all"
          style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.08)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(168,85,247,0.4)';
            (e.currentTarget as HTMLButtonElement).style.background = '#1a1a28';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
            (e.currentTarget as HTMLButtonElement).style.background = '#111119';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          Continue with GitHub
        </button>

        <p className="text-zinc-700 text-xs mt-8">
          You'll be redirected to GitHub to authorize eiwi
        </p>

      </div>
    </div>
  );
}