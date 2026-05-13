'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, User, GitBranch, Save, Edit, X } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
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
      }
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);

    await supabase
      .from('profile')
      .upsert({
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      });

    if (email !== user.email) {
      await supabase.auth.updateUser({ email });
    }

    alert("✅ Profile saved!");
    setIsEditing(false);
    loadProfile();
    setSaving(false);
  };

  const cancelEdit = () => {
    setFirstName(profile?.first_name || '');
    setLastName(profile?.last_name || '');
    setEmail(user?.email || '');
    setIsEditing(false);
  };

  const reconnectGitHub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;

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
            <a href="/dashboard" className="text-zinc-400 hover:text-white">Dashboard</a>
            <Button onClick={handleSignOut} variant="outline" className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <h2 className="text-5xl font-bold tracking-tight mb-2">Profile Settings</h2>
        <p className="text-zinc-400 mb-10">Manage your account information</p>

        <Card className="bg-zinc-900/70 border border-zinc-700 backdrop-blur">
          <CardHeader className="border-b border-zinc-700 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-2xl text-white flex items-center gap-3">
              <User className="w-6 h-6" />
              Account Information
            </CardTitle>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </CardHeader>

          <CardContent className="pt-8 space-y-6">
            {isEditing ? (
              // Edit mode
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label>First Name</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-zinc-800 border-zinc-700 mt-1" />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-zinc-800 border-zinc-700 mt-1" />
                  </div>
                </div>

                <div>
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="bg-zinc-800 border-zinc-700 mt-1" />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={saveProfile} disabled={saving} className="flex-1">
                    Save Changes
                  </Button>
                  <Button onClick={cancelEdit} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              // View mode
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-zinc-700 rounded-2xl flex items-center justify-center text-5xl">
                  👤
                </div>
                <div>
                  <p className="text-3xl font-semibold">
                    {firstName || lastName ? `${firstName} ${lastName}`.trim() : "No name set"}
                  </p>
                  <p className="text-zinc-400">{email}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GitHub Connection */}
        <Card className="bg-zinc-900/70 border border-zinc-700 backdrop-blur mt-8">
          <CardHeader className="border-b border-zinc-700 pb-4">
            <CardTitle className="text-2xl text-white flex items-center gap-3">
              <GitBranch className="w-6 h-6" />
              GitHub Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="p-6 bg-zinc-800 rounded-2xl flex justify-between items-center">
              <div>
                <p className="font-medium">Connected GitHub Account</p>
                <p className="text-emerald-400 text-sm mt-1">✅ OAuth connected • Repos accessible</p>
              </div>
              <Button onClick={reconnectGitHub} variant="outline">
                Reconnect GitHub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}