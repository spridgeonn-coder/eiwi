'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    document.title = 'eiwi — AI Code Intelligence';
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/dashboard';
      } else {
        setChecking(false);
      }
    });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b0b14' }}>
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ background: '#0b0b14', fontFamily: 'sans-serif', color: 'white', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 32px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L6 11L12 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>eiwi</span>
        </div>
        <a href="/login" style={{ marginLeft: 'auto', fontSize: '12px', color: '#888', padding: '6px 14px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}>
          Log in
        </a>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '72px 32px 52px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#a78bfa', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', padding: '4px 14px', borderRadius: '20px', marginBottom: '22px' }}>
          ✦ Staff-engineer-level code reviews, in seconds
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '18px' }}>
          Your codebase has issues.<br />
          <span style={{ color: '#a855f7' }}>eiwi finds them first.</span>
        </h1>
        <p style={{ fontSize: '14px', color: '#555', maxWidth: '420px', margin: '0 auto 30px', lineHeight: 1.7 }}>
          Connect your GitHub repos and get a brutally honest, file-level security and architecture audit — powered by AI trained to think like a principal engineer.
        </p>
        <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white', fontSize: '13px', fontWeight: 500, padding: '13px 26px', borderRadius: '12px', textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          Analyze my repos — it's free
        </a>
        <p style={{ fontSize: '11px', color: '#444', marginTop: '12px' }}>Read-only · No credit card · Takes 30 seconds</p>
      </div>

      {/* Screenshot */}
      <div style={{ padding: '0 24px 52px' }}>
        <p style={{ textAlign: 'center', fontSize: '10px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '28px' }}>Real output from a real analysis</p>

        <div style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden', maxWidth: '900px', margin: '0 auto' }}>
          {/* Browser bar */}
          <div style={{ background: '#0a0a12', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#28c840' }} />
            <span style={{ marginLeft: '10px', fontSize: '10px', color: '#333', fontFamily: 'monospace' }}>app.eiwi.io/dashboard</span>
          </div>

          {/* App nav */}
          <div style={{ background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '20px', height: '20px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="9" height="9" viewBox="0 0 14 14" fill="none"><path d="M2 7L6 11L12 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>eiwi</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginLeft: '12px' }}>
              {['Overview', 'Analysis', 'Issues'].map((t, i) => (
                <span key={t} style={{ fontSize: '10px', color: i === 0 ? 'white' : '#555', paddingBottom: '1px', borderBottom: i === 0 ? '1.5px solid #a855f7' : 'none' }}>
                  {t}{i === 2 && <span style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', fontSize: '8px', padding: '1px 4px', borderRadius: '3px', marginLeft: '3px' }}>6</span>}
                </span>
              ))}
            </div>
            <div style={{ width: '22px', height: '22px', borderRadius: '7px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, marginLeft: 'auto' }}>JC</div>
          </div>

          {/* App body */}
          <div style={{ display: 'flex' }}>
            {/* Sidebar */}
            <div style={{ width: '130px', padding: '10px', borderRight: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
              <div style={{ fontSize: '8px', color: '#333', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Repository</div>
              {[
                { name: 'api-core', sub: 'Just analyzed', active: true },
                { name: 'frontend', sub: 'Click to analyze', active: false },
                { name: 'auth-service', sub: 'Click to analyze', active: false },
              ].map(r => (
                <div key={r.name} style={{ padding: '7px 8px', borderRadius: '7px', border: `1px solid ${r.active ? 'rgba(168,85,247,0.4)' : 'transparent'}`, background: r.active ? 'rgba(168,85,247,0.08)' : 'transparent', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '20px', height: '20px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', fontWeight: 700, flexShrink: 0 }}>AI</div>
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: 500 }}>{r.name}</div>
                    <div style={{ fontSize: '8px', color: '#444' }}>{r.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main */}
            <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
              <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '1px' }}>Welcome back, jordan</div>
              <div style={{ fontSize: '9px', color: '#555', marginBottom: '12px' }}>Your AI Code Intelligence Platform</div>

              {/* Top row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '8px', marginBottom: '8px' }}>
                <div style={{ background: 'linear-gradient(145deg,#2d1b69,#1a0f3c,#0f0820)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '7px', color: 'rgba(167,139,250,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Code quality score</div>
                  <svg width="66" height="66" viewBox="0 0 70 70">
                    <circle cx="35" cy="35" r="27" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
                    <circle cx="35" cy="35" r="27" fill="none" stroke="#a855f7" strokeWidth="5" strokeLinecap="round" strokeDasharray="169.6" strokeDashoffset="50.9" transform="rotate(-90 35 35)"/>
                    <text x="35" y="39" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">78%</text>
                  </svg>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: '#fb923c', marginTop: '2px' }}>Moderate</div>
                  <div style={{ fontSize: '7px', color: '#555', marginTop: '1px' }}>Overall repo health</div>
                </div>

                <div style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '6px' }}>Summary Analysis</div>
                  <div style={{ fontSize: '9px', color: '#888', lineHeight: 1.6 }}>
                    The biggest threat is in{' '}
                    <span style={{ fontFamily: 'monospace', fontSize: '8px', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '1px 5px', borderRadius: '4px' }}>routes/users.ts:47</span>
                    {' '}— the{' '}
                    <span style={{ fontFamily: 'monospace', fontSize: '8px', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '1px 5px', borderRadius: '4px' }}>DELETE /admin/users/:id</span>
                    {' '}endpoint has no authentication middleware. Any unauthenticated HTTP request can permanently delete any user from the database right now.
                    <br /><br />
                    Additionally,{' '}
                    <span style={{ fontFamily: 'monospace', fontSize: '8px', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '1px 5px', borderRadius: '4px' }}>lib/db.ts:23</span>
                    {' '}exposes raw Postgres error messages to the client, leaking your schema on malformed queries.
                  </div>
                  <div style={{ fontSize: '8px', color: '#7c3aed', marginTop: '6px', cursor: 'pointer' }}>View full analysis →</div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', marginBottom: '8px' }}>
                {[
                  { badge: 'Blast Radius', val: '31', unit: 'files', sub: 'Files at risk', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', sev: 'Critical' },
                  { badge: 'Security', val: '38', unit: '/ 100', sub: 'Exposure risk', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', sev: 'Critical' },
                  { badge: 'Performance', val: '91', unit: '/ 100', sub: 'Runtime efficiency', color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.25)', sev: 'Good' },
                  { badge: 'Tech Debt', val: '34', unit: 'hrs', sub: 'Cleanup effort', color: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.25)', sev: 'Moderate' },
                ].map(c => (
                  <div key={c.badge} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '7px 9px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '7px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', color: '#aaa' }}>{c.badge}</span>
                      <span style={{ fontSize: '7px', fontWeight: 600, padding: '1px 5px', borderRadius: '3px', color: c.color, background: 'rgba(0,0,0,0.2)' }}>{c.sev}</span>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: c.color }}>{c.val}<span style={{ fontSize: '8px', color: '#555', marginLeft: '2px' }}>{c.unit}</span></div>
                    <div style={{ fontSize: '7px', color: '#555', marginTop: '1px' }}>{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* Bottom row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#111119', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f87171' }} />
                    <span style={{ fontSize: '8px', fontWeight: 600, color: '#f87171', textTransform: 'uppercase', letterSpacing: '1px' }}>Top priority fix</span>
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px', lineHeight: 1.4 }}>Unauthenticated DELETE endpoint — anyone can wipe your user table</div>
                  <span style={{ fontFamily: 'monospace', fontSize: '8px', color: '#a78bfa', display: 'block', marginBottom: '6px' }}>routes/users.ts — line 47</span>
                  <div style={{ background: 'rgba(248,113,113,0.08)', borderRadius: '6px', padding: '6px 8px', fontSize: '8px', fontFamily: 'monospace', color: '#fca5a5', lineHeight: 1.5 }}>
                    Fix: router.delete('/admin/users/:id', requireAuth, deleteUser)
                  </div>
                </div>
                <div style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '8px', fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Files scanned</div>
                  {[
                    { name: 'routes/users.ts', status: 'Critical', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
                    { name: 'lib/db.ts', status: 'Critical', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
                    { name: 'middleware/auth.ts', status: 'Review', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
                    { name: 'models/user.ts', status: 'Review', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
                    { name: 'config/database.ts', status: 'Clean', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
                    { name: 'utils/validation.ts', status: 'Clean', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
                  ].map(f => (
                    <div key={f.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '8px', fontFamily: 'monospace', color: '#6366f1' }}>{f.name}</span>
                      <span style={{ fontSize: '7px', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, color: f.color, background: f.bg }}>{f.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', padding: '0 24px 52px', maxWidth: '900px', margin: '0 auto' }}>
        {[
          {
            icon: '🔒',
            title: 'Not "you have a security issue"',
            quote: '"routes/users.ts:47 — DELETE /admin/users/:id has no auth middleware"',
            desc: 'Exact file, exact line, exact exploit chain. The kind of finding that saves you from a 3am incident.',
          },
          {
            icon: '💥',
            title: 'Blast radius before you merge',
            quote: '"31 files affected if this breaks"',
            desc: 'Know exactly what a refactor touches before it hits production. Not after.',
          },
          {
            icon: '⏱️',
            title: 'Tech debt your PM will understand',
            quote: '"34 hours to clean this up"',
            desc: 'A real estimate you can drop into a sprint. Not vibes — actual hours, actual files.',
          },
        ].map(f => (
          <div key={f.title} style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>{f.icon}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{f.title}</div>
            <div style={{ fontSize: '10px', color: '#4ade80', fontStyle: 'italic', marginBottom: '8px', lineHeight: 1.5 }}>{f.quote}</div>
            <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: 'center', padding: '40px 32px 52px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '10px' }}>What's hiding in your codebase?</h2>
        <p style={{ fontSize: '13px', color: '#555', marginBottom: '26px' }}>Connect your GitHub in 30 seconds and find out. Free to start.</p>
        <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white', fontSize: '13px', fontWeight: 500, padding: '13px 26px', borderRadius: '12px', textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          Analyze my repos — it's free
        </a>
        <div style={{ fontSize: '11px', color: '#333', marginTop: '14px' }}>
          <a href="/terms" style={{ color: '#444', textDecoration: 'underline' }}>Terms of Service</a>
          {' · '}
          <a href="/privacy" style={{ color: '#444', textDecoration: 'underline' }}>Privacy Policy</a>
        </div>
      </div>

    </div>
  );
}