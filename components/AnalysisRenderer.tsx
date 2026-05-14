'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function parseSection(content: string, heading: string): string {
  const regex = new RegExp(`\\*\\*${heading}\\*\\*([\\s\\S]*?)(?=\\*\\*[A-Z]|$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function parseSeverityBadge(text: string): { label: string; color: string; bg: string } {
  if (/critical/i.test(text)) return { label: 'Critical', color: '#f87171', bg: 'rgba(248,113,113,0.15)' };
  if (/high/i.test(text)) return { label: 'High', color: '#fb923c', bg: 'rgba(251,146,60,0.15)' };
  if (/medium/i.test(text)) return { label: 'Medium', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' };
  return { label: 'Low', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' };
}

function parseIssues(text: string) {
  const issues: { file: string; title: string; desc: string; fix: string; severity: string }[] = [];
  const blocks = text.split(/(?=- \*\*Risk level)/i).filter(b => b.trim());

  for (const block of blocks) {
    const severityMatch = block.match(/Risk level:\s*([^\*\n]+)/i);
    const fileMatch = block.match(/File \+ pattern:\s*`?([^`\n]+)`?/i);
    const attackMatch = block.match(/Attack vector:\s*([^\n]+(?:\n(?!.*\*\*)[^\n]+)*)/i);
    const impactMatch = block.match(/Production impact:\s*([^\n]+(?:\n(?!.*\*\*)[^\n]+)*)/i);
    const fixMatch = block.match(/Fix:\s*([\s\S]+?)(?=\n- \*\*|$)/i);

    if (severityMatch || fileMatch) {
      issues.push({
        severity: severityMatch?.[1]?.trim() || 'Medium',
        file: fileMatch?.[1]?.trim() || '',
        title: attackMatch?.[1]?.trim() || '',
        desc: impactMatch?.[1]?.trim() || '',
        fix: fixMatch?.[1]?.trim().replace(/```[\s\S]*?```/g, m => m) || '',
      });
    }
  }
  return issues;
}

function CollapsibleSection({
  dot, title, badge, badgeColor, badgeBg, children
}: {
  dot: string;
  title: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: '12px', borderRadius: '16px', overflow: 'hidden', background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
      >
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'white', letterSpacing: '0.3px' }}>{title}</span>
        {badge && (
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, marginLeft: 'auto', marginRight: '8px', color: badgeColor, background: badgeBg }}>
            {badge}
          </span>
        )}
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ marginLeft: badge ? '0' : 'auto', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
        >
          <path d="M2 5L7 10L12 5" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function IssueBlock({ file, title, desc, fix, severity }: { file: string; title: string; desc: string; fix: string; severity: string }) {
  const badge = parseSeverityBadge(severity);
  return (
    <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#a78bfa', background: 'rgba(124,58,237,0.12)', padding: '3px 10px', borderRadius: '6px' }}>
          {file || 'Unknown file'}
        </span>
        <span style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '6px', fontWeight: 700, color: badge.color, background: badge.bg, flexShrink: 0, marginLeft: '8px' }}>
          {badge.label}
        </span>
      </div>
      {title && <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: '0 0 6px', lineHeight: 1.4 }}>{title}</p>}
      {desc && <p style={{ fontSize: '12px', color: '#6b6b7b', lineHeight: 1.6, margin: 0 }}>{desc}</p>}
      {fix && (
        <div style={{ marginTop: '12px', padding: '10px 14px', borderLeft: '2px solid #7c3aed', background: 'rgba(124,58,237,0.06)' }}>
          <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '5px' }}>Fix</div>
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#a78bfa', lineHeight: 1.7 }}>{fix}</div>
        </div>
      )}
    </div>
  );
}

function SimpleMarkdown({ text }: { text: string }) {
  return (
    <div style={{ padding: '16px 18px' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p style={{ fontSize: '12px', color: '#6b6b7b', lineHeight: 1.7, margin: '0 0 8px' }}>{children}</p>,
          li: ({ children }) => (
            <li style={{ fontSize: '12px', color: '#6b6b7b', lineHeight: 1.7, marginBottom: '6px' }}>{children}</li>
          ),
          ul: ({ children }) => <ul style={{ paddingLeft: '16px', margin: '0 0 8px' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingLeft: '16px', margin: '0 0 8px' }}>{children}</ol>,
          strong: ({ children }) => <strong style={{ color: '#e4e4e7', fontWeight: 600 }}>{children}</strong>,
          code: ({ children }) => (
            <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#a78bfa', background: 'rgba(124,58,237,0.12)', padding: '1px 6px', borderRadius: '4px' }}>{children}</code>
          ),
          pre: ({ children }) => (
            <pre style={{ background: 'rgba(124,58,237,0.06)', borderLeft: '2px solid #7c3aed', padding: '10px 14px', margin: '8px 0', overflowX: 'auto' }}>{children}</pre>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default function AnalysisRenderer({ content }: { content: string }) {
  if (!content) return null;

  const execSummary = parseSection(content, 'Executive Summary');
  const criticalRisks = parseSection(content, 'Critical / High Risks');
  const architecture = parseSection(content, 'Architecture & Design Issues');
  const security = parseSection(content, 'Security & Auth Review');
  const performance = parseSection(content, 'Performance & Reliability');
  const codeQuality = parseSection(content, 'Code Quality');
  const refactoring = parseSection(content, 'Refactoring Priorities');
  const quickWins = parseSection(content, 'Quick Wins');
  const whatsGood = parseSection(content, "What's Actually Good");

  const criticalIssues = parseIssues(criticalRisks);
  const criticalCount = criticalIssues.length;

  const sections = [
    { key: 'security-auth', dot: '#fb923c', title: 'Security & Auth Review', content: security, badge: security ? '1 issue' : undefined, badgeColor: '#fb923c', badgeBg: 'rgba(251,146,60,0.15)' },
    { key: 'architecture', dot: '#fb923c', title: 'Architecture & Design Issues', content: architecture },
    { key: 'performance', dot: '#a78bfa', title: 'Performance & Reliability', content: performance },
    { key: 'code-quality', dot: '#a78bfa', title: 'Code Quality', content: codeQuality },
    { key: 'refactoring', dot: '#a78bfa', title: 'Refactoring Priorities', content: refactoring },
    { key: 'quick-wins', dot: '#4ade80', title: 'Quick Wins', content: quickWins },
    { key: 'whats-good', dot: '#4ade80', title: "What's Actually Good", content: whatsGood, badgeColor: '#4ade80', badgeBg: 'rgba(74,222,128,0.12)' },
  ].filter(s => s.content);

  return (
    <div style={{ fontFamily: 'sans-serif' }}>

      {/* Executive Summary */}
      {execSummary && (
        <CollapsibleSection dot="#f87171" title="Executive Summary">
          <p style={{ fontSize: '12px', color: '#6b6b7b', lineHeight: 1.7, padding: '16px 18px', margin: 0 }}>
            {execSummary}
          </p>
        </CollapsibleSection>
      )}

      {/* Critical / High Risks */}
      {criticalRisks && (
        <CollapsibleSection
          dot="#f87171"
          title="Critical / High Risks"
          badge={criticalCount > 0 ? `${criticalCount} issue${criticalCount > 1 ? 's' : ''}` : undefined}
          badgeColor="#f87171"
          badgeBg="rgba(248,113,113,0.15)"
        >
          {criticalIssues.length > 0 ? (
            criticalIssues.map((issue, i) => (
              <IssueBlock key={i} {...issue} />
            ))
          ) : (
            <SimpleMarkdown text={criticalRisks} />
          )}
        </CollapsibleSection>
      )}

      {/* All other sections */}
      {sections.map(s => (
        <CollapsibleSection
          key={s.key}
          dot={s.dot}
          title={s.title}
          badge={s.badge}
          badgeColor={s.badgeColor}
          badgeBg={s.badgeBg}
        >
          <SimpleMarkdown text={s.content} />
        </CollapsibleSection>
      ))}

    </div>
  );
}