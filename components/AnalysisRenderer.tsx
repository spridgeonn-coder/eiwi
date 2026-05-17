'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function parseSection(content: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hashMatch = content.match(
    new RegExp(`##\\s+${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|\\n#\\s|$)`)
  );
  if (hashMatch) return hashMatch[1].trim();
  const boldMatch = content.match(
    new RegExp(`\\*\\*${escaped}\\*\\*[^\\n]*\\n([\\s\\S]*?)(?=\\n\\*\\*[A-Z]|$)`)
  );
  if (boldMatch) return boldMatch[1].trim();
  return '';
}

function parseSeverityBadge(text: string): { label: string; color: string; bg: string; border: string } {
  if (/critical/i.test(text)) return { label: 'Critical', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.2)' };
  if (/high/i.test(text)) return { label: 'High', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.2)' };
  if (/medium/i.test(text)) return { label: 'Medium', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.2)' };
  return { label: 'Low', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)' };
}

// Parses ### N. numbered blocks — used for Critical Risks and Architecture only
function parseNumberedBlocks(text: string) {
  const issues: { file: string; title: string; desc: string; fix: string; severity: string }[] = [];
  const blocks = text.split(/(?=###\s+\d+\.|(?=- \*\*Risk level))/i).filter(b => b.trim());

  for (const block of blocks) {
    const titleMatch = block.match(/^###\s+\d+\.\s*(.+)/m);
    const severityMatch = block.match(/\*\*Risk level:\*?\*?\s*([^\*\n]+)/i)
      || block.match(/Risk level:\s*\*?\*?([^\*\n]+)\*?\*?/i);
    const fileMatch = block.match(/\*\*File \+ pattern:\*?\*?\s*`?([^`\n]+)`?/i)
      || block.match(/File \+ pattern:\s*`?([^`\n]+)`?/i)
      || block.match(/\*\*File:\*?\*?\s*`?([^`\n]+)`?/i);
    const attackMatch = block.match(/\*\*Attack vector:\*?\*?\s*([\s\S]+?)(?=\n-\s*\*\*|\n###|$)/i)
      || block.match(/Attack vector:\s*([^\n]+)/i);
    const impactMatch = block.match(/\*\*Production impact:\*?\*?\s*([\s\S]+?)(?=\n-\s*\*\*|\n###|$)/i)
      || block.match(/Production impact:\s*([^\n]+)/i)
      || block.match(/\*\*Impact:\*?\*?\s*([\s\S]+?)(?=\n-\s*\*\*|\n###|$)/i);
    const fixMatch = block.match(/\*\*Fix:\*?\*?\s*([\s\S]+?)(?=\n###\s+\d+\.|$)/i)
      || block.match(/Fix:\s*([\s\S]+?)(?=\n- \*\*Risk|\n\n\*\*|$)/i);

    const title = titleMatch?.[1]?.trim()
      || attackMatch?.[1]?.trim().split('\n')[0]
      || '';

    if (titleMatch || severityMatch || fileMatch) {
      issues.push({
        severity: severityMatch?.[1]?.trim() || 'High',
        file: fileMatch?.[1]?.trim().replace(/`/g, '') || '',
        title,
        desc: impactMatch?.[1]?.trim().split('\n')[0] || attackMatch?.[1]?.trim().split('\n')[0] || '',
        fix: fixMatch?.[1]?.trim() || '',
      });
    }
  }
  return issues;
}

function FilePill({ name }: { name: string }) {
  if (!name) return null;
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
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ marginLeft: badge ? '0' : 'auto', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
          <path d="M2 5L7 10L12 5" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// Full issue card — Critical Risks and Architecture & Design Issues
function IssueBlock({ file, title, desc, fix, severity }: { file: string; title: string; desc: string; fix: string; severity: string }) {
  const badge = parseSeverityBadge(severity);
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
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
              p: ({ children }) => <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ddd6fe', lineHeight: 1.7, margin: '0 0 4px' }}>{children}</p>,
              code: ({ children }) => <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ddd6fe', background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '3px' }}>{children}</code>,
              pre: ({ children }) => <pre style={{ margin: '6px 0 0', overflowX: 'auto', fontSize: '11px', color: '#ddd6fe', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>{children}</pre>,
            }}
          >{fix}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

// Full markdown renderer — used for all prose and list-based sections.
// Handles bold labels, inline code, fenced code blocks, numbered lists,
// bullet lists, and multi-line content without truncating anything.
function RichMarkdown({ text }: { text: string }) {
  return (
    <div style={{ padding: '16px 20px' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p style={{ fontSize: '13px', color: '#c4c4d4', lineHeight: 1.75, margin: '0 0 10px' }}>{children}</p>,
          li: ({ children }) => <li style={{ fontSize: '13px', color: '#c4c4d4', lineHeight: 1.75, marginBottom: '8px' }}>{children}</li>,
          ul: ({ children }) => <ul style={{ paddingLeft: '18px', margin: '0 0 12px' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingLeft: '18px', margin: '0 0 12px' }}>{children}</ol>,
          strong: ({ children }) => <strong style={{ color: '#f0f0f5', fontWeight: 600 }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: '#a78bfa', fontStyle: 'italic' }}>{children}</em>,
          h3: ({ children }) => <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#f0f0f5', margin: '16px 0 6px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{children}</h3>,
          h4: ({ children }) => <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#a78bfa', margin: '12px 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{children}</h4>,
          code: ({ children }) => (
            <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#c4b5fd', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)', padding: '2px 7px', borderRadius: '5px' }}>{children}</code>
          ),
          pre: ({ children }) => (
            <pre style={{ background: 'rgba(0,0,0,0.25)', borderLeft: '2px solid #8b5cf6', padding: '12px 14px', margin: '8px 0 12px', overflowX: 'auto', borderRadius: '6px', fontSize: '11px', color: '#ddd6fe', lineHeight: 1.6 }}>{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: '2px solid rgba(167,139,250,0.4)', paddingLeft: '12px', margin: '8px 0', color: '#9090a8' }}>{children}</blockquote>
          ),
          hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '12px 0' }} />,
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
  const architecture  = parseSection(content, 'Architecture & Design Issues') || parseSection(content, 'Architecture');
  const security      = parseSection(content, 'Security & Auth Review') || parseSection(content, 'Security');
  const performance   = parseSection(content, 'Performance & Reliability') || parseSection(content, 'Performance');
  const codeQuality   = parseSection(content, 'Code Quality[^\\n]*') || parseSection(content, 'Code Quality');
  const refactoring   = parseSection(content, 'Refactoring Priorities') || parseSection(content, 'Refactoring');
  const quickWins     = parseSection(content, 'Quick Wins');
  const whatsGood     = parseSection(content, "What's Actually Good") || parseSection(content, "What's Good");

  const criticalItems = parseNumberedBlocks(criticalRisks);
  const archItems     = parseNumberedBlocks(architecture);

  const hasSections = execSummary || criticalRisks || architecture || security || performance || codeQuality;

  if (!hasSections) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <RichMarkdown text={content} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif' }}>

      {/* Executive Summary — prose */}
      {execSummary && (
        <CollapsibleSection dot="#f87171" title="Executive Summary">
          <RichMarkdown text={execSummary} />
        </CollapsibleSection>
      )}

      {/* Critical / High Risks — structured issue cards */}
      {criticalRisks && (
        <CollapsibleSection
          dot="#f87171" title="Critical / High Risks"
          badge={criticalItems.length > 0 ? `${criticalItems.length} issue${criticalItems.length > 1 ? 's' : ''}` : undefined}
          badgeColor="#f87171" badgeBg="rgba(248,113,113,0.12)" badgeBorder="rgba(248,113,113,0.2)"
        >
          {criticalItems.length > 0
            ? criticalItems.map((r, i) => <IssueBlock key={i} {...r} />)
            : <RichMarkdown text={criticalRisks} />}
        </CollapsibleSection>
      )}

      {/* Architecture & Design Issues — structured issue cards */}
      {architecture && (
        <CollapsibleSection
          dot="#fb923c" title="Architecture & Design Issues"
          badge={archItems.length > 0 ? `${archItems.length} issue${archItems.length > 1 ? 's' : ''}` : undefined}
          badgeColor="#fb923c" badgeBg="rgba(251,146,60,0.12)" badgeBorder="rgba(251,146,60,0.2)"
        >
          {archItems.length > 0
            ? archItems.map((r, i) => <IssueBlock key={i} {...r} />)
            : <RichMarkdown text={architecture} />}
        </CollapsibleSection>
      )}

      {/* Security & Auth Review — full markdown, prose + lists */}
      {security && (
        <CollapsibleSection dot="#fb923c" title="Security & Auth Review">
          <RichMarkdown text={security} />
        </CollapsibleSection>
      )}

      {/* Performance & Reliability — full markdown */}
      {performance && (
        <CollapsibleSection dot="#a78bfa" title="Performance & Reliability">
          <RichMarkdown text={performance} />
        </CollapsibleSection>
      )}

      {/* Code Quality — full markdown with score */}
      {codeQuality && (
        <CollapsibleSection dot="#a78bfa" title="Code Quality">
          <RichMarkdown text={codeQuality} />
        </CollapsibleSection>
      )}

      {/* Refactoring Priorities — full markdown, numbered list */}
      {refactoring && (
        <CollapsibleSection dot="#a78bfa" title="Refactoring Priorities">
          <RichMarkdown text={refactoring} />
        </CollapsibleSection>
      )}

      {/* Quick Wins — full markdown, preserves current/replacement code */}
      {quickWins && (
        <CollapsibleSection dot="#4ade80" title="Quick Wins">
          <RichMarkdown text={quickWins} />
        </CollapsibleSection>
      )}

      {/* What's Actually Good — full markdown */}
      {whatsGood && (
        <CollapsibleSection dot="#4ade80" title="What's Actually Good">
          <RichMarkdown text={whatsGood} />
        </CollapsibleSection>
      )}

    </div>
  );
}