'use client';

import { Button } from "@/components/ui/button";

export default function Home() {
  const handleLogin = () => {
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="max-w-md text-center px-8">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
            <span className="font-bold text-6xl">E</span>
          </div>
        </div>

        <h1 className="text-7xl font-bold tracking-tighter mb-4">Eiwi</h1>
        <p className="text-2xl text-zinc-400 mb-12">
          AI-powered code analysis for developers
        </p>

        <Button 
          onClick={handleLogin}
          size="lg"
          className="w-full py-8 text-xl bg-violet-600 hover:bg-violet-700 rounded-2xl"
        >
          Sign In to Continue
        </Button>

        <p className="text-zinc-500 mt-8 text-sm">
          Connect your GitHub • Get instant AI insights
        </p>
      </div>
    </div>
  );
}