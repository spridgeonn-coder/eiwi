'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogOut, User, GitBranch, Edit, X, Check, CheckCircle, AlertCircle } from "lucide-react";

function Toast({ message, type, onClose }: { message: string; type: 'error' | 'success'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg max-w-sm"
      style={{ background: type === 'error' ? '#1a0f0f' : '#0f1a0f', border: `1px solid ${type === 'error' ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.3)'}` }}>
      {type === 'error'
        ? <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        : <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
      <p className="text-sm leading-relaxed" style={{ color: type === 'error' ? '#fca5a5' : '#86efac' }}>{message}</p>
      <button onClick={onClose} className="ml-2 flex-shrink-0">
        <X className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400" />
      </button>
    </div>
  );
}

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [githubConnected, setGithubConnected] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    loadProfile();

    // Check if we just came back from a GitHub reconnect
    const params = new URLSearchParams(window.location.search);
    if (params.get('reconnected') === 'true') {
      showToast('GitHub reconnected successfully!', 'success');
      window.history.replaceState({}, '', '/profile');
    }
    if (params.get('error')) {
      showToast('GitHub reconnection failed. Please try again.', 'error');
      window.history.replaceState({}, '', '/profile');
    }
  }, []);

  const loadProfile = async () => {
  document.title = 'Profile Settings | eiwi';
  try {
    const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser(user);
      setEmail(user.email || '');

      const { data } = await supabase
        .from('profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setGithubConnected(!!data.github_token);
      }
    } catch (e) {
      showToast('Failed to load profile.', 'error');
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profile').upsert({
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      });
      if (email !== user.email) {
        await supabase.auth.updateUser({ email });
      }
      showToast('Profile saved successfully!', 'success');
      setIsEditing(false);
      loadProfile();
    } catch (e) {
      showToast('Failed to save profile. Please try again.', 'error');
    }
    setSaving(false);
  };

  const cancelEdit = () => {
    setFirstName(profile?.first_name || '');
    setLastName(profile?.last_name || '');
    setEmail(user?.email || '');
    setIsEditing(false);
  };

  const reconnectGitHub = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/profile?reconnected=true`,
          scopes: 'repo read:user',
        },
      });
    } catch (e) {
      showToast('Failed to start GitHub reconnection.', 'error');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const displayName = user?.user_metadata?.user_name
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b0b14' }}>
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen text-white" style={{ background: '#0b0b14' }}>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <nav className="border-b border-white/[0.07] bg-black/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-8 py-4 flex items-center gap-6">
          <a href="/dashboard" className="flex items-center gap-2.5 mr-4">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/40">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L6 11L12 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight">eiwi</span>
          </a>
          <div className="flex-1" />
          <a href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Dashboard</a>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-xl border border-white/[0.07] hover:border-white/20"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold shadow-md">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-4xl font-bold tracking-tighter mb-1">Profile Settings</h1>
        <p className="text-zinc-500 text-sm mb-10">Manage your account information</p>

        {/* Account Information */}
        <div className="rounded-3xl overflow-hidden mb-4" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-semibold text-zinc-300">Account Information</span>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-xl border border-white/[0.07] hover:border-white/20"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
          </div>

          <div className="px-8 py-8">
            {isEditing ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-500 font-medium mb-2 block">First Name</label>
                    <input
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-colors"
                      style={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(168,85,247,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-medium mb-2 block">Last Name</label>
                    <input
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-colors"
                      style={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(168,85,247,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-medium mb-2 block">Email</label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-colors"
                    style={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.08)' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(168,85,247,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all text-white"
                    style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', opacity: saving ? 0.7 : 1 }}
                  >
                    <Check className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors border border-white/[0.07] hover:border-white/20"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xl font-semibold text-white">
                    {firstName || lastName ? `${firstName} ${lastName}`.trim() : displayName}
                  </p>
                  <p className="text-sm text-zinc-500 mt-0.5">{email}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GitHub Connection */}
        <div className="rounded-3xl overflow-hidden" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 px-8 py-5 border-b border-white/[0.06]">
            <GitBranch className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-semibold text-zinc-300">GitHub Connection</span>
          </div>
          <div className="px-8 py-8">
            <div className="flex items-center justify-between p-5 rounded-2xl" style={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm font-medium text-white mb-1">Connected GitHub Account</p>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${githubConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                  <p className={`text-xs ${githubConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {githubConnected ? 'OAuth connected · Repos accessible' : 'Token missing — please reconnect'}
                  </p>
                </div>
              </div>
              <button
                onClick={reconnectGitHub}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-zinc-300 hover:text-white transition-colors border border-white/[0.07] hover:border-white/20"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                Reconnect GitHub
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}