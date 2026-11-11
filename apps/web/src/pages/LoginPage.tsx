import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Bot,
  Github,
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';

export const LoginPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#090d16] text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGitHubLogin = async () => {
    try {
      setIsRedirecting(true);
      setError(null);
      // Fetch authorization URL or redirect directly
      window.location.href = '/api/auth/github';
    } catch (err) {
      setIsRedirecting(false);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to initiate GitHub authentication. Please verify server configuration.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white">DevPilot AI</span>
            <span className="ml-2 text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-mono">
              Phase 1 Foundation
            </span>
          </div>
        </div>

        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition"
        >
          <Github className="w-4 h-4" />
          <span>GitHub App Docs</span>
        </a>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-blue-400 mb-6">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Autonomous GitHub Developer Platform</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Autonomous engineering for modern teams
          </h1>
          <p className="text-base text-slate-400 leading-relaxed">
            Connect your team’s existing GitHub repositories to DevPilot AI. Understand codebase
            responsibilities, plan daily development tasks, and orchestrate verified Pull Requests.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2 max-w-md w-full">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Box */}
        <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

          <h2 className="text-xl font-semibold text-white mb-2 text-center">Sign in to DevPilot</h2>
          <p className="text-xs text-slate-400 text-center mb-6">
            Sign in with your GitHub account to access your workspace and manage authorized repositories.
          </p>

          <button
            onClick={handleGitHubLogin}
            disabled={isRedirecting}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-950 font-semibold rounded-xl text-sm transition shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-50"
          >
            <Github className="w-5 h-5" />
            <span>{isRedirecting ? 'Redirecting to GitHub...' : 'Continue with GitHub'}</span>
            {!isRedirecting && <ArrowRight className="w-4 h-4 ml-1 opacity-70" />}
          </button>

          <div className="mt-6 pt-6 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>OAuth authenticates identity; GitHub App handles repo access.</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Short-lived installation tokens. Zero secrets stored in plaintext.</span>
            </div>
          </div>
        </div>

        {/* 3-Step Process Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm mb-3 border border-blue-500/20">
              1
            </div>
            <h3 className="font-semibold text-sm text-slate-200 mb-1">OAuth Login</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authenticate securely with GitHub OAuth. No separate password or account creation required.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm mb-3 border border-indigo-500/20">
              2
            </div>
            <h3 className="font-semibold text-sm text-slate-200 mb-1">GitHub App Install</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Install the DevPilot GitHub App specifically on the team repositories you want to empower.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm mb-3 border border-emerald-500/20">
              3
            </div>
            <h3 className="font-semibold text-sm text-slate-200 mb-1">Controlled Cadence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configure daily scheduling, target branches, and path guardrails with 100% human-in-the-loop review.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-8 py-5 text-center text-xs text-slate-500">
        DevPilot AI &copy; {new Date().getFullYear()} &bull; Autonomous GitHub Developer Agent Platform &bull; Built with React, Vite, Node, TypeScript & PostgreSQL
      </footer>
    </div>
  );
};

