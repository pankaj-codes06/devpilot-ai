import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bot,
  Clock,
  GitBranch,
  Save,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { Header } from '../components/Header.jsx';
import { api } from '../services/api.js';
import {
  DEFAULT_TIMEZONE,
  SUPPORTED_TIMEZONES,
  DEFAULT_SCHEDULE_CRON,
  DEFAULT_BRANCH_PREFIX,
} from '@devpilot/shared';

export const AgentSettingsPage = () => {
  const [searchParams] = useSearchParams();
  const [repositories, setRepositories] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [scheduleCron, setScheduleCron] = useState(DEFAULT_SCHEDULE_CRON);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [branchPrefix, setBranchPrefix] = useState(DEFAULT_BRANCH_PREFIX);
  const [allowedPaths, setAllowedPaths] = useState('');
  const [excludedPaths, setExcludedPaths] = useState('.github/**, docker/**, .env*');
  const [maxDailyRuns, setMaxDailyRuns] = useState(3);
  const [requirePrReview, setRequirePrReview] = useState(true);

  // Load repositories
  useEffect(() => {
    api.repositories
      .list()
      .then((repos) => {
        setRepositories(repos);
        const queryRepoId = searchParams.get('repoId');
        if (queryRepoId && repos.some((r) => r.id === queryRepoId)) {
          setSelectedRepoId(queryRepoId);
        } else if (repos.length > 0) {
          setSelectedRepoId(repos[0].id);
        }
      })
      .catch((err) => {
        setFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to load repositories',
        });
      })
      .finally(() => setIsLoading(false));
  }, [searchParams]);

  // When selected repo changes, populate form
  useEffect(() => {
    if (!selectedRepoId) return;
    const repo = repositories.find((r) => r.id === selectedRepoId);
    if (repo?.agentSettings) {
      const s = repo.agentSettings;
      setIsEnabled(s.isEnabled);
      setScheduleCron(s.scheduleCron);
      setTimezone(s.timezone);
      setBranchPrefix(s.branchPrefix);
      setAllowedPaths((s.allowedPaths || []).join(', '));
      setExcludedPaths((s.excludedPaths || []).join(', '));
      setMaxDailyRuns(s.maxDailyRuns);
      setRequirePrReview(s.requirePrReview);
    }
  }, [selectedRepoId, repositories]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedRepoId) return;

    try {
      setIsSaving(true);
      setFeedback(null);

      const payload = {
        isEnabled,
        scheduleCron,
        timezone,
        branchPrefix,
        allowedPaths: allowedPaths
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        excludedPaths: excludedPaths
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        maxDailyRuns: Number(maxDailyRuns),
        requirePrReview,
      };

      await api.repositories.updateSettings(selectedRepoId, payload);

      setFeedback({
        type: 'success',
        message: 'Agent configuration successfully updated and saved to PostgreSQL.',
      });

      // Update local state
      setRepositories((prev) =>
        prev.map((r) =>
          r.id === selectedRepoId
            ? {
                ...r,
                agentSettings: {
                  ...r.agentSettings,
                  ...payload,
                  allowedPaths: payload.allowedPaths || [],
                  excludedPaths: payload.excludedPaths || [],
                  maxDailyRuns: payload.maxDailyRuns || 3,
                  requirePrReview: payload.requirePrReview ?? true,
                },
              }
            : r
        )
      );
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Agent Settings"
        description="Configure autonomous execution schedule, path boundaries, and branch policies."
      />

      <div className="p-8 max-w-4xl w-full mx-auto space-y-6">
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-red-950/40 border-red-800/60 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Repository Selector */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Target Repository
            </label>
            <p className="text-xs text-slate-400">
              Select which connected repository to inspect and configure.
            </p>
          </div>

          <div className="sm:w-72">
            <select
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              disabled={isLoading || repositories.length === 0}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {repositories.length === 0 ? (
                <option value="">No repositories connected</option>
              ) : (
                repositories.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section: Autonomous Cadence */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <Bot className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Execution Mode & Cadence</h3>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-200">
                  Autonomous Daily Execution
                </div>
                <div className="text-[11px] text-slate-400">
                  When enabled, DevPilot schedules daily repository analysis and task execution.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cron Schedule</span>
                </label>
                <input
                  type="text"
                  value={scheduleCron}
                  onChange={(e) => setScheduleCron(e.target.value)}
                  placeholder="0 9 * * 1-5"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  Default: 0 9 * * 1-5 (Mon–Fri at 09:00 AM)
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Timezone</span>
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {SUPPORTED_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Default scheduling timezone is Asia/Kolkata (IST).
                </p>
              </div>
            </div>
          </div>

          {/* Section: Git & Branch Strategy */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <GitBranch className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Branch & Guardrail Strategy</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Autonomous Branch Prefix
                </label>
                <input
                  type="text"
                  value={branchPrefix}
                  onChange={(e) => setBranchPrefix(e.target.value)}
                  placeholder="devpilot/"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  All automated branches will begin with this prefix (e.g. devpilot/task-123).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Max Daily Task Runs
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxDailyRuns}
                  onChange={(e) => setMaxDailyRuns(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Maximum daily autonomous executions allowed per repository.
                </p>
              </div>
            </div>

            {/* Path controls */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Allowed Paths (Whitelist)
                </label>
                <input
                  type="text"
                  value={allowedPaths}
                  onChange={(e) => setAllowedPaths(e.target.value)}
                  placeholder="e.g. src/modules/**, lib/** (leave empty to allow entire repository)"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Comma-separated glob patterns.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Excluded Protected Paths (Blacklist)
                </label>
                <input
                  type="text"
                  value={excludedPaths}
                  onChange={(e) => setExcludedPaths(e.target.value)}
                  placeholder=".github/**, docker/**, .env*"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Autonomous agent will never modify or touch files matching these patterns.
                </p>
              </div>
            </div>

            {/* Human in the loop */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-200">
                  Require Human Pull Request Review
                </div>
                <div className="text-[11px] text-slate-400">
                  All agent proposals must be submitted as Pull Requests. Never merge directly.
                </div>
              </div>
              <input
                type="checkbox"
                checked={requirePrReview}
                onChange={(e) => setRequirePrReview(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !selectedRepoId}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Agent Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
