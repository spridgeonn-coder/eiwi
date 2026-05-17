'use client';

import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy Policy | eiwi';
  }, []);

  return (
    <div className="min-h-screen text-white" style={{ background: '#0b0b14' }}>
      <nav className="border-b border-white/[0.07] bg-black/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L6 11L12 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight">eiwi</span>
          </a>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm mb-10">
          <ArrowLeft className="w-4 h-4" />
          Back
        </a>

        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 text-sm mb-12">Last updated: May 16, 2026</p>

        <div className="space-y-10 text-zinc-400 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">1. Introduction</h2>
            <p>This Privacy Policy explains how eiwi ("we", "us", or "our"), operated by Nick Spridgeon, collects, uses, and protects your information when you use our AI-powered code analysis platform. We are committed to protecting your privacy and being transparent about how your data is used.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following information when you use eiwi:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><span className="text-zinc-300 font-medium">Account information</span> — your email address and GitHub username, collected when you sign in with GitHub</li>
              <li><span className="text-zinc-300 font-medium">Repository code</span> — the contents of files in repositories you choose to analyze, sent to our AI provider for analysis. Source files are never stored on our servers after analysis is complete.</li>
              <li><span className="text-zinc-300 font-medium">Analysis results</span> — the output of AI analysis runs, stored in our database so you can access them later</li>
              <li><span className="text-zinc-300 font-medium">Usage data</span> — a log of analysis runs including timestamps and repository names, used for rate limiting and service improvement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>To provide and operate the code analysis service</li>
              <li>To authenticate your identity and maintain your session</li>
              <li>To enforce usage limits and prevent abuse</li>
              <li>To store your analysis history so results persist between sessions</li>
              <li>To improve the accuracy and quality of our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">4. Third-Party Services</h2>
            <p className="mb-3">eiwi uses the following third-party services to operate:</p>
            <ul className="list-disc list-inside space-y-3 ml-2">
              <li>
                <span className="text-zinc-300 font-medium">Anthropic (Claude AI)</span> — when you run a code analysis, the contents of your repository files are sent to Anthropic's API to generate the analysis. Anthropic may use this data according to their policies. See <a href="https://www.anthropic.com/privacy" className="text-violet-400 hover:underline" target="_blank" rel="noopener noreferrer">Anthropic's Privacy Policy</a>.
              </li>
              <li>
                <span className="text-zinc-300 font-medium">Supabase</span> — we use Supabase to store your account information and analysis results. GitHub access tokens are never persisted to our database; they are read from your active session only and discarded after use. See <a href="https://supabase.com/privacy" className="text-violet-400 hover:underline" target="_blank" rel="noopener noreferrer">Supabase's Privacy Policy</a>.
              </li>
              <li>
                <span className="text-zinc-300 font-medium">GitHub</span> — we use GitHub OAuth to authenticate users and access repository contents with your permission. See <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" className="text-violet-400 hover:underline" target="_blank" rel="noopener noreferrer">GitHub's Privacy Policy</a>.
              </li>
              <li>
                <span className="text-zinc-300 font-medium">Vercel</span> — our platform is hosted on Vercel. See <a href="https://vercel.com/legal/privacy-policy" className="text-violet-400 hover:underline" target="_blank" rel="noopener noreferrer">Vercel's Privacy Policy</a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">5. Your Code and Repositories</h2>
            <p>We take the handling of your code seriously. Here is exactly what we do with it:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-2">
              <li>We only access repositories you explicitly choose to analyze</li>
              <li>We never write to, modify, or delete any of your repository files</li>
              <li>File contents are sent to Anthropic's Claude AI solely for the purpose of generating analysis</li>
              <li>Source files are not stored on our servers — only the analysis results are saved</li>
              <li>Your GitHub access token is read from your active OAuth session and is never written to our database</li>
              <li>We do not sell or share your code with any third parties beyond what is necessary to operate the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">6. Data Retention</h2>
            <p>We retain your account information and analysis history for as long as your account is active. If you delete your account, we will delete your personal data and analysis history within 30 days. You can revoke GitHub access at any time through your GitHub account settings, which will immediately prevent eiwi from accessing your repositories.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">7. Data Security</h2>
            <p>We implement reasonable security measures to protect your information, including secure HTTPS connections and session-based authentication. GitHub access tokens are never stored in our database — they exist only within your encrypted session cookie and are discarded when your session ends. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-2">
              <li>Access the personal data we hold about you</li>
              <li>Request deletion of your account and associated data</li>
              <li>Revoke GitHub access at any time through GitHub settings</li>
              <li>Request a copy of your analysis history</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <span className="text-violet-400">support@eiwi.app</span>.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">9. Children's Privacy</h2>
            <p>eiwi is not intended for use by anyone under the age of 13. We do not knowingly collect personal information from children under 13.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify users of significant changes by updating the date at the top of this page. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">11. Contact</h2>
            <p>If you have any questions or concerns about this Privacy Policy, please contact us at <span className="text-violet-400">support@eiwi.app</span>.</p>
          </section>

        </div>
      </div>
    </div>
  );
}