'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function EiwiDemo() {
  const [phase, setPhase] = useState<'scan' | 'overview' | 'analysis'>('scan');
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [gauge, setGauge] = useState(0);
  const [m1, setM1] = useState(0);
  const [m2, setM2] = useState(0);
  const [m3, setM3] = useState(0);
  const [m4, setM4] = useState(0);
  const [summaryText, setSummaryText] = useState('');
  const [showVlink, setShowVlink] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'issues'>('overview');

  const steps = [
    'Connecting to GitHub...',
    'Fetching files from api-core...',
    'Reading code across your repository...',
    'Running AI security audit...',
    'Analyzing security vulnerabilities...',
    'Calculating blast radius and tech debt...',
    'Processing results...',
  ];

  const summaryFull = "The biggest threat is app/api/auth/route.ts:34 — JWT secret falls back to 'dev-secret-key' when JWT_SECRET is unset, letting an attacker forge valid admin tokens using a string that's in your git history. Additionally, lib/session.ts:89 never invalidates tokens on logout.";

  const circumference = 201;
  const gaugeOffset = circumference - (gauge / 100) * circumference;

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const reset = () => {
      setPhase('scan');
      setActiveTab('overview');
      setStepIndex(0);
      setProgress(0);
      setElapsed(0);
      setGauge(0);
      setM1(0); setM2(0); setM3(0); setM4(0);
      setSummaryText('');
      setShowVlink(false);
      setShowBadge(false);
    };

    reset();

    // Elapsed timer
    let et = 0;
    const elapsedTimer = setInterval(() => {
      et++;
      setElapsed(et);
    }, 1000);

    // Step through scan
    let si = 0;
    const stepTimer = setInterval(() => {
      if (si < steps.length) {
        setStepIndex(si);
        setProgress(Math.round((si / steps.length) * 92));
        si++;
      } else {
        clearInterval(stepTimer);
      }
    }, 560);

    // Transition to overview
    timeout = setTimeout(() => {
      clearInterval(elapsedTimer);
      clearInterval(stepTimer);
      setProgress(100);
      setTimeout(() => {
        setPhase('overview');
        setActiveTab('overview');

        // Animate gauge
        let g = 0;
        const gTimer = setInterval(() => {
          g += 2;
          if (g >= 72) { setGauge(72); clearInterval(gTimer); }
          else setGauge(g);
        }, 25);

        // Animate counts
        let counts = [0, 0, 0, 0];
        const targets = [47, 31, 88, 28];
        const setters = [setM1, setM2, setM3, setM4];
        const cTimer = setInterval(() => {
          let done = true;
          counts = counts.map((c, i) => {
            const next = Math.min(targets[i], c + Math.ceil(targets[i] / 50));
            setters[i](next);
            if (next < targets[i]) done = false;
            return next;
          });
          if (done) clearInterval(cTimer);
        }, 20);

        // Type summary
        setTimeout(() => {
          let i = 0;
          const typeTimer = setInterval(() => {
            i++;
            setSummaryText(summaryFull.slice(0, i));
            if (i >= summaryFull.length) {
              clearInterval(typeTimer);
              setShowVlink(true);
            }
          }, 18);
        }, 400);
      }, 350);
    }, 4400);

    // Transition to analysis
    const analysisTimeout = setTimeout(() => {
      setPhase('analysis');
      setActiveTab('analysis');
      setShowBadge(true);
    }, 10000);

    // Loop
    const loopTimeout = setTimeout(() => {
      reset();
    }, 21000);

    return () => {
      clearInterval(elapsedTimer);
      clearInterval(stepTimer);
      clearTimeout(timeout);
      clearTimeout(analysisTimeout);
      clearTimeout(loopTimeout);
    };
  }, []);

  const pillStyle = (color: string): React.CSSProperties => ({
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '6px',
    color,
    background: 'rgba(0,0,0,0.3)',
  });

  const namePillStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#aaa',
    background: 'rgba(255,255,255,0.06)',
    padding: '2px 8px',
    borderRadius: '6px',
  };

  const statCards = [
    { name: 'Blast Radius', val: m1, unit: 'files at risk', sub: 'Files affected by a breaking change', color: '#f87171', bg: '#1a0d0d', border: 'rgba(248,113,113,0.18)', lbl: 'Critical', lc: '#f87171' },
    { name: 'Security', val: m2, unit: '/ 100', sub: 'Auth, token & env variable exposure', color: '#f87171', bg: '#1a0d0d', border: 'rgba(248,113,113,0.18)', lbl: 'Critical', lc: '#f87171' },
    { name: 'Performance', val: m3, unit: '/ 100', sub: 'Runtime efficiency & load time', color: '#4ade80', bg: '#0d1a12', border: 'rgba(74,222,128,0.18)', lbl: 'Good', lc: '#4ade80' },
    { name: 'Tech Debt', val: m4, unit: 'hrs to fix', sub: 'Estimated cleanup effort', color: '#fb923c', bg: '#1a140d', border: 'rgba(251,146,60,0.18)', lbl: 'Moderate', lc: '#fb923c' },
  ];

  const sections = [
    { dot: '#f87171', name: 'Executive Summary' },
    { dot: '#f87171', name: 'Critical / High Risks', badge: '3 issues' },
    { dot: '#fb923c', name: 'Architecture & Design Issues' },
    { dot: '#fb923c', name: 'Security & Auth Review' },
    { dot: '#a78bfa', name: 'Performance & Reliability' },
    { dot: '#a78bfa', name: 'Code Quality' },
    { dot: '#a78bfa', name: 'Refactoring Priorities' },
    { dot: '#4ade80', name: 'Quick Wins' },
    { dot: '#4ade80', name: "What's Actually Good" },
  ];

  const codeStyle: React.CSSProperties = { fontFamily: 'monospace', fontSize: '10px', color: '#c4b5fd', background: 'rgba(167,139,250,0.1)', padding: '1px 4px', borderRadius: '3px' };

  return (
    <div style={{ background: '#0b0b14', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', width: '100%', maxWidth: '860px', margin: '0 auto', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      {/* Title bar */}
      <div style={{ background: '#0d0d17', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
        </div>
        <div style={{ fontSize: '11px', color: '#333', background: 'rgba(255,255,255,0.03)', padding: '2px 16px', borderRadius: '4px', flex: 1, textAlign: 'center' }}>app.eiwi.io/dashboard</div>
      </div>

      {/* Nav */}
      <div style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 20px', height: '44px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '32px' }}>
          <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7L6 11L12 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>eiwi</span>
        </div>
        <div style={{ display: 'flex', height: '100%', flex: 1 }}>
          {(['overview', 'analysis', 'issues'] as const).map(t => (
            <div key={t} style={{ fontSize: '12px', color: activeTab === t ? 'white' : '#555', padding: '0 14px', height: '100%', display: 'flex', alignItems: 'center', borderBottom: activeTab === t ? '2px solid #a855f7' : '2px solid transparent', gap: '5px' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'issues' && showBadge && <span style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', fontSize: '10px', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>6</span>}
            </div>
          ))}
        </div>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#a855f7,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white' }}>JC</div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', height: '440px' }}>
        {/* Sidebar */}
        <div style={{ width: '188px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)', padding: '14px 10px' }}>
          <div style={{ fontSize: '9px', color: '#2e2e40', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px', fontWeight: 500 }}>Repository</div>
          {[
            { name: 'api-core', sub: phase === 'scan' ? 'Analyzing...' : 'Last analyzed just now', active: true, spinning: phase === 'scan' },
            { name: 'frontend', sub: 'Click to analyze', active: false, spinning: false },
            { name: 'auth-service', sub: 'Click to analyze', active: false, spinning: false },
          ].map(r => (
            <div key={r.name} style={{ padding: '9px 10px', borderRadius: '12px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px', background: r.active ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.015)', border: `1px solid ${r.active ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.04)'}` }}>
              <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>AI</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#d4d4d4', fontWeight: 500 }}>{r.name}</div>
                <div style={{ fontSize: '9px', color: '#3a3a50', marginTop: '1px' }}>{r.sub}</div>
              </div>
              {r.spinning && <div style={{ width: '11px', height: '11px', border: '2px solid rgba(139,92,246,0.25)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

          {/* SCAN */}
          {phase === 'scan' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '9px' }}>
              <div style={{ width: '40px', height: '40px', border: '2px solid rgba(139,92,246,0.2)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>Analyzing api-core</div>
              <div style={{ fontSize: '12px', color: '#555' }}>{steps[Math.min(stepIndex, steps.length - 1)]}</div>
              <div style={{ width: '150px', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px' }}>
                <div style={{ height: '2px', borderRadius: '1px', background: '#8b5cf6', width: `${progress}%`, transition: 'width 0.7s ease' }} />
              </div>
              <div style={{ fontSize: '10px', color: '#2a2a3a' }}>{elapsed}s elapsed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '10px', width: '240px' }}>
                {steps.slice(0, stepIndex + 1).map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < stepIndex ? '#7c3aed' : 'transparent', border: i < stepIndex ? 'none' : '2px solid #8b5cf6' }}>
                      {i < stepIndex && <svg width="7" height="7" viewBox="0 0 8 8" fill="none"><path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize: '11px', color: i < stepIndex ? '#3a3a50' : '#bbb' }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OVERVIEW */}
          {phase === 'overview' && (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', overflow: 'hidden' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'white', letterSpacing: '-0.5px', lineHeight: 1 }}>Welcome back, jordan</div>
                <div style={{ fontSize: '12px', color: '#444', marginTop: '3px' }}>Your AI Code Intelligence Platform</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '10px', flexShrink: 0 }}>
                <div style={{ background: 'linear-gradient(145deg,#1e1045,#120830,#0b0620)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(196,181,253,0.4)', marginBottom: '8px', fontWeight: 500 }}>Code Quality Score</div>
                  <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7"/>
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#a855f7" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={gaugeOffset} style={{ transition: 'stroke-dashoffset 0.05s' }}/>
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '20px', fontWeight: 700, color: 'white' }}>{gauge}%</div>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, marginTop: '6px', color: '#fb923c' }}>Moderate</div>
                  <div style={{ fontSize: '9px', color: '#1a1a2a', marginTop: '2px' }}>Overall repo health</div>
                </div>
                <div style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '14px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'white', marginBottom: '7px' }}>Summary Analysis</div>
                  <div style={{ fontSize: '10px', color: '#6a6a80', lineHeight: 1.7, flex: 1 }}>{summaryText}</div>
                  {showVlink && <div style={{ fontSize: '10px', color: '#a855f7', marginTop: '7px' }}>View full analysis →</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', flexShrink: 0 }}>
                {statCards.map(c => (
                  <div key={c.name} style={{ borderRadius: '18px', padding: '12px 14px', background: c.bg, border: `1px solid ${c.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={namePillStyle}>{c.name}</span>
                      <span style={pillStyle(c.lc)}>{c.lbl}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '30px', fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.val}</span>
                      <span style={{ fontSize: '11px', color: '#555' }}>{c.unit}</span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#2e2e2e' }}>{c.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex: 1, minHeight: 0 }}>
                <div style={{ background: '#111119', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '20px', padding: '14px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f87171' }} />
                    <span style={{ fontSize: '8px', color: '#f87171', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 600 }}>Top Priority Fix</span>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#f0f0f5', lineHeight: 1.4, marginBottom: '3px' }}>JWT signed with hardcoded fallback — forge any admin session in 30 seconds</div>
                  <div style={{ fontSize: '9px', color: '#a78bfa', fontFamily: 'monospace', marginBottom: '8px' }}>app/api/auth/route.ts — line 34</div>
                  <div style={{ background: 'rgba(248,113,113,0.06)', borderRadius: '8px', padding: '8px 10px', flex: 1 }}>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#fca5a5', lineHeight: 1.6 }}>Throw on startup if JWT_SECRET is missing; never use a fallback string</div>
                  </div>
                </div>
                <div style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '14px' }}>
                  <div style={{ fontSize: '8px', color: '#333', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 600, marginBottom: '8px' }}>Files Scanned</div>
                  {[
                    { path: 'app/api/auth/route.ts', status: 'Critical', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
                    { path: 'lib/session.ts', status: 'Critical', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
                    { path: 'middleware.ts', status: 'Review', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
                    { path: 'hooks/useAuth.ts', status: 'Review', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
                    { path: 'components/Nav.tsx', status: 'Clean', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
                    { path: 'utils/validate.ts', status: 'Clean', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
                  ].map(f => (
                    <div key={f.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#6366f1' }}>{f.path}</span>
                      <span style={{ fontSize: '8px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, color: f.color, background: f.bg }}>{f.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ANALYSIS */}
          {phase === 'analysis' && (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '7px', height: '100%', overflow: 'hidden' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'white', letterSpacing: '-0.3px' }}>api-core</div>
                <div style={{ fontSize: '11px', color: '#444', marginTop: '2px', marginBottom: '2px' }}>AI analysis complete</div>
              </div>
              {sections.map((s, i) => (
                <div key={s.name} style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f0f0f5', flex: 1 }}>{s.name}</span>
                    {s.badge && <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '5px', fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)' }}>{s.badge}</span>}
                    <span style={{ color: '#444', fontSize: '13px' }}>⌄</span>
                  </div>
                  {i === 1 && (
                    <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px', flexWrap: 'wrap' as const }}>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#c4b5fd', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', padding: '2px 8px', borderRadius: '5px' }}>app/api/auth/route.ts:34</span>
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', marginLeft: 'auto', color: '#f87171', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)' }}>Critical</span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#f0f0f5', marginBottom: '4px', lineHeight: 1.4 }}>JWT signed with hardcoded fallback — attacker can forge admin tokens for any user ID</div>
                      <div style={{ fontSize: '10px', color: '#9090a8', lineHeight: 1.65 }}>jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret-key') silently falls back when JWT_SECRET is unset. An attacker opens DevTools, runs jwt.sign(&#123;id:1,role:"admin"&#125;, "dev-secret-key") and has a valid admin session. No server access needed — this string is in your git history.</div>
                      <div style={{ marginTop: '10px', padding: '10px 12px', borderLeft: '2px solid #8b5cf6', background: 'rgba(139,92,246,0.07)', borderRadius: '0 5px 5px 0' }}>
                        <div style={{ fontSize: '8px', color: '#a78bfa', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' as const, marginBottom: '5px' }}>Fix</div>
                        <pre style={{ fontSize: '9px', fontFamily: 'monospace', color: '#ddd6fe', lineHeight: 1.7, whiteSpace: 'pre-wrap' as const, margin: 0 }}>{`if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env var required');
const token = jwt.sign(payload, process.env.JWT_SECRET, {
  expiresIn: '15m', algorithm: 'HS256'
});`}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

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

      {/* Animated Demo */}
      <div style={{ padding: '0 24px 52px' }}>
        <p style={{ textAlign: 'center', fontSize: '10px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '28px' }}>Real output from a real analysis</p>
        <EiwiDemo />
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