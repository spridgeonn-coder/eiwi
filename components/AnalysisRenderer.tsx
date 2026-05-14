'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy } from 'lucide-react';
import { useState } from 'react';

interface AnalysisRendererProps {
  content: string;
}

export default function AnalysisRenderer({ content }: AnalysisRendererProps) {
  const [copied, setCopied] = useState(false);

  const copyAll = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="prose prose-invert max-w-none text-zinc-200 text-[17px] leading-relaxed">
      <div className="flex justify-end mb-4">
        <button
          onClick={copyAll}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied!' : 'Copy Section'}
        </button>
      </div>

      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}