'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function parseSection(content: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\*\\*${escaped}\\*\\*[^\\n]*\\n([\\s\\S]*?)(?=\\n\\*\\*[A-Z]|$)`);
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function parseSeverityBadge(text: string): { label: string; color: string; bg: string; border: string } {
  if (/critical/i.test(text)) return { label: 'Critical', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.2)' };
  if (/high/i.test(text)) return { label: 'High', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.2)' };
  if (/medium/i.test(text)) return { label: 'Medium', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.2)' };
  return { label: 'Low', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)' };
}

function parseRisks(text: string) {
  const issues: { file: string; title: string; desc: string; fix: string; severity: string }[] = [];
  const blocks = text.split(/(?=- \*\*Risk level)/i).filter(b => b.trim());
  for (const block of blocks) {
    const severityMatch = block.match(/Risk level:\s*\*?\*?([^\*\n]+)\*?\*?/i);
    const fileMatch = block.match(/File \+ pattern:\s*`?([^`\n]+)`?/i);
    const attackMatch = block.match(/Attack vector:\s*([^\n]+)/i);
    const impactMatch = block.match(/Production impact:\s*([^\n]+)/i);
    const fixMatch = block.match(/Fix:\s*([\s\S]+?)(?=\n- \*\*Risk|\n\n\*\*|$)/i);
    if (severityMatch) {
      issues.push({
        severity: severityMatch[1]?.trim() || 'High',
        file: fileMatch?.[1]?.trim().replace(/`/g, '') || '',
        title: attackMatch?.[1]?.trim() || '',
        desc: impactMatch?.[1]?.trim() || '',
        fix: fixMatch?.[1]?.trim() || '',
      });
    }
  }
  return issues;
}

function parseKeyValueSection(text: string) {
  const items: { file: string; issue: string; fix: string }[] = [];
  const blocks = text.split(/(?=\n?[-\d]+\.?\s*\*\*File|\n?[-\d]+\.?\s*`)/i).filter(b => b.trim());
  for (const block of blocks) {
    const fileMatch = block.match(/\*\*File:\*\*\s*`?([^`\n]+)`?/i) || block.match(/`([^`\n]+\.(?:tsx?|jsx?|md|json))`/i);
    const issueMatch = block.match(/\*\*(?:Current code|Issue|Pattern):\*\*\s*([^\n]+)/i);
    const fixMatch = block.match(/\*\*(?:Replacement|Fix):\*\*\s*([^\n]+)/i);
    if (fileMatch) {
      items.push({
        file: fileMatch[1]?.trim() || '',
        issue: issueMatch?.[1]?.trim() || '',
        fix: fixMatch?.[1]?.trim() || '',
      });
    }
  }
  return items;
}

function FilePill({ name }: { name: string }) {
  return (
    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#c4b5fd', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)', padding: '3px 10px', borderRadius: '6px', display: 'inline-block' }}>
      {name}
    </span>
  );
}

function CollapsibleSection({
  dot, title, badge, badgeColor, badgeBg, badgeBorder, children
}: {
  dot: string;
  title: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: '10px', borderRadius: '14px', overflow: 'hidden', background: '#16161f', border: '1px solid rgba(255,255,255,0.09)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
      >
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0f0f5', letterSpacing: '0.2px' }}>{title}</span>
        {badge && (
          <span style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '6px', fontWeight: 700, marginLeft: 'auto', marginRight: '8px', color: badgeColor, background: badgeBg, border: `1px solid ${badgeBorder}` }}>
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
    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        {file && <FilePill name={file} />}
        <span style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '6px', fontWeight: 700, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, marginLeft: 'auto', flexShrink: 0 }}>
          {badge.label}
        </span>
      </div>
      {title && <p style={{ fontSize: '13px', fontWeight: 700, color: '#f0f0f5', margin: '0 0 6px', lineHeight: 1.4 }}>{title}</p>}
      {desc && <p style={{ fontSize: '12px', color: '#9090a8', lineHeight: 1.65, margin: 0 }}>{desc}</p>}
      {fix && (
        <div style={{ marginTop: '12px', padding: '11px 14px', borderLeft: '2px solid #8b5cf6', background: 'rgba(139,92,246,0.08)' }}>
          <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '5px' }}>Fix</div>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ddd6fe', lineHeight: 1.7, margin: 0 }}>{children}</p>,
              code: ({ children }) => <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ddd6fe' }}>{children}</code>,
              pre: ({ children }) => <pre style={{ margin: '8px 0 0', overflowX: 'auto', fontSize: '11px', color: '#ddd6fe' }}>{children}</pre>,
            }}
          >{fix}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function KeyValueBlock({ file, issue, fix }: { file: string; issue: string; fix: string }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {file && <div style={{ marginBottom: '8px' }}><FilePill name={file} /></div>}
      {issue && <p style={{ fontSize: '12px', color: '#9090a8', lineHeight: 1.65, margin: '0 0 8px' }}>{issue}</p>}
      {fix && (
        <div style={{ padding: '10px 14px', borderLeft: '2px solid #8b5cf6', background: 'rgba(139,92,246,0.08)' }}>
          <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '4px' }}>Fix</div>
          <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ddd6fe', lineHeight: 1.6, margin: 0 }}>{fix}</p>
        </div>
      )}
    </div>
  );
}

function SimpleMarkdown({ text }: { text: string }) {
  return (
    <div style={{ padding: '16px 20px' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p style={{ fontSize: '13px', color: '#c4c4d4', lineHeight: 1.75, margin: '0 0 10px' }}>{children}</p>,
          li: ({ children }) => <li style={{ fontSize: '13px', color: '#c4c4d4', lineHeight: 1.75, marginBottom: '6px' }}>{children}</li>,
          ul: ({ children }) => <ul style={{ paddingLeft: '18px', margin: '0 0 10px' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingLeft: '18px', margin: '0 0 10px' }}>{children}</ol>,
          strong: ({ children }) => <strong style={{ color: '#f0f0f5', fontWeight: 600 }}>{children}</strong>,
          code: ({ children }) => (
            <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#c4b5fd', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)', padding: '2px 7px', borderRadius: '5px' }}>{children}</code>
          ),
          pre: ({ children }) => (
            <pre style={{ background: 'rgba(139,92,246,0.08)', borderLeft: '2px solid #8b5cf6', padding: '10px 14px', margin: '8px 0', overflowX: 'auto' }}>{children}</pre>
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

  const execSummary   = parseSection(content, 'Executive Summary');
  const criticalRisks = parseSection(content, 'Critical / High Risks');
  const architecture  = parseSection(content, 'Architecture & Design Issues');
  const security      = parseSection(content, 'Security & Auth Review');
  const performance   = parseSection(content, 'Performance & Reliability');
  const codeQuality   = parseSection(content, 'Code Quality[^\\n]*');
  const refactoring   = parseSection(content, 'Refactoring Priorities');
  const quickWins     = parseSection(content, 'Quick Wins');
  const whatsGood     = parseSection(content, "What's Actually Good");

  const risks      = parseRisks(criticalRisks);
  const quickItems = parseKeyValueSection(quickWins);
  const goodItems  = parseKeyValueSection(whatsGood);

  return (
    <div style={{ fontFamily: 'sans-serif' }}>

      {execSummary && (
        <CollapsibleSection dot="#f87171" title="Executive Summary">
          <div style={{ padding: '18px 20px' }}>
            <p style={{ fontSize: '13px', color: '#c4c4d4', lineHeight: 1.75, margin: 0 }}>{execSummary}</p>
          </div>
        </CollapsibleSection>
      )}

      {criticalRisks && (
        <CollapsibleSection
          dot="#f87171" title="Critical / High Risks"
          badge={risks.length > 0 ? `${risks.length} issue${risks.length > 1 ? 's' : ''}` : undefined}
          badgeColor="#f87171" badgeBg="rgba(248,113,113,0.12)" badgeBorder="rgba(248,113,113,0.2)"
        >
          {risks.length > 0
            ? risks.map((r, i) => <IssueBlock key={i} {...r} />)
            : <SimpleMarkdown text={criticalRisks} />}
        </CollapsibleSection>
      )}

      {architecture && (
        <CollapsibleSection dot="#fb923c" title="Architecture & Design Issues">
          <SimpleMarkdown text={architecture} />
        </CollapsibleSection>
      )}

      {security && (
        <CollapsibleSection dot="#fb923c" title="Security & Auth Review">
          <SimpleMarkdown text={security} />
        </CollapsibleSection>
      )}

      {performance && (
        <CollapsibleSection dot="#a78bfa" title="Performance & Reliability">
          <SimpleMarkdown text={performance} />
        </CollapsibleSection>
      )}

      {codeQuality && (
        <CollapsibleSection dot="#a78bfa" title="Code Quality">
          <SimpleMarkdown text={codeQuality} />
        </CollapsibleSection>
      )}

      {refactoring && (
        <CollapsibleSection dot="#a78bfa" title="Refactoring Priorities">
          <SimpleMarkdown text={refactoring} />
        </CollapsibleSection>
      )}

      {quickWins && (
        <CollapsibleSection dot="#4ade80" title="Quick Wins">
          {quickItems.length > 0
            ? quickItems.map((q, i) => <KeyValueBlock key={i} {...q} />)
            : <SimpleMarkdown text={quickWins} />}
        </CollapsibleSection>
      )}

      {whatsGood && (
        <CollapsibleSection dot="#4ade80" title="What's Actually Good">
          {goodItems.length > 0
            ? goodItems.map((g, i) => <KeyValueBlock key={i} {...g} />)
            : <SimpleMarkdown text={whatsGood} />}
        </CollapsibleSection>
      )}

    </div>
  );
}