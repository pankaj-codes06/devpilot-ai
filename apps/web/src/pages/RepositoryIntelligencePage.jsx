import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Brain,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Layers,
  Code2,
  Users,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  Wrench,
} from 'lucide-react';
import { Header } from '../components/Header.jsx';
import { api } from '../services/api.js';

export const RepositoryIntelligencePage = () => {
  const { id } = useParams();
  const [repo, setRepo] = useState(null);
  const [overview, setOverview] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const pollIntervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [repoData, overviewData, tasksData] = await Promise.all([
        api.repositories.getById(id),
        api.analysis.getOverview(id),
        api.analysis.getTasks(id),
      ]);
      setRepo(repoData);
      setOverview(overviewData);
      setTasks(tasksData);

      // Check if active run is in progress; if so, schedule polling
      const latestStatus = overviewData?.latestRun?.status;
      if (latestStatus === 'QUEUED' || latestStatus === 'RUNNING') {
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(() => {
            fetchData();
          }, 3000);
        }
      } else {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to fetch repository analysis',
      });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchData]);

  const handleTriggerAnalysis = async () => {
    if (!id) return;
    try {
      setIsTriggering(true);
      setFeedback(null);
      await api.analysis.triggerAnalysis(id);
      setFeedback({
        type: 'success',
        message: 'Analysis job queued successfully in BullMQ. Worker is processing codebase...',
      });
      fetchData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to start analysis run',
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const isAnalyzing =
    overview?.latestRun?.status === 'QUEUED' || overview?.latestRun?.status === 'RUNNING';

  const filteredTasks = tasks.filter((t) => {
    if (selectedPriority === 'ALL') return true;
    return t.priority === selectedPriority;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-950/60 border-red-800/80';
      case 'HIGH':
        return 'text-amber-400 bg-amber-950/60 border-amber-800/80';
      case 'MEDIUM':
        return 'text-blue-400 bg-blue-950/60 border-blue-800/80';
      case 'LOW':
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Repository Intelligence & Backlog"
        description="Autonomous codebase architecture analysis, team module mapping, and prioritized improvements."
      />

      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Navigation & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              to="/repositories"
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition"
              title="Back to repositories"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {repo?.fullName || 'Repository'}
                </h2>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {repo?.defaultBranch || 'main'}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  {repo?.lastAnalyzedAt
                    ? `Last analyzed ${new Date(repo.lastAnalyzedAt).toLocaleString()}`
                    : 'Not yet analyzed'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition"
              title="Refresh analysis"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleTriggerAnalysis}
              disabled={isAnalyzing || isTriggering}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>
                {isAnalyzing
                  ? 'Analyzing Codebase...'
                  : isTriggering
                    ? 'Queueing...'
                    : 'Analyze Repository'}
              </span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-red-950/40 border-red-800/60 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* In-Progress Progress Banner */}
        {isAnalyzing && (
          <div className="p-5 rounded-2xl bg-blue-950/30 border border-blue-800/60 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Brain className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Autonomous Codebase Analysis in Progress
                </div>
                <div className="text-[11px] text-blue-300">
                  Worker is inspecting file trees, package manifests, and team modules. Task suggestions will appear below automatically.
                </div>
              </div>
            </div>
            <div className="text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
              {overview?.latestRun?.status}
            </div>
          </div>
        )}

        {/* Top Overview Grid */}
        {overview?.architecture ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Architecture Card */}
            <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Architecture & Stack</h3>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {overview.architecture.projectType}
                </span>
              </div>

              {/* Language Breakdown */}
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
                  Language Distribution
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(overview.architecture.languages || {}).map(([lang, pct]) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-slate-200"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>{lang}</span>
                      <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Frameworks & Package Manager */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
                    Detected Frameworks
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {overview.architecture.frameworks?.map((fw) => (
                      <span
                        key={fw}
                        className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium"
                      >
                        {fw}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
                    Testing & Tooling
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {overview.architecture.testFrameworks?.map((tf) => (
                      <span
                        key={tf}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium"
                      >
                        {tf}
                      </span>
                    ))}
                    {overview.architecture.hasCi && (
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                        CI Active
                      </span>
                    )}
                    {overview.architecture.hasDocumentation && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                        Docs Present
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Executive Summary Quote */}
              {overview.latestRun?.summary && (
                <div className="pt-3 border-t border-slate-800 text-xs text-slate-300 leading-relaxed italic bg-slate-800/20 p-3 rounded-lg border border-slate-800">
                  &ldquo;{overview.latestRun.summary}&rdquo;
                </div>
              )}
            </div>

            {/* Team Modules Breakdown */}
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Team Modules</h3>
                </div>
                <span className="text-xs text-slate-400">
                  {overview.architecture.modules?.length || 0} Segments
                </span>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-72 pr-1">
                {overview.architecture.modules?.map((mod) => (
                  <div
                    key={mod.name}
                    className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{mod.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {mod.fileCount} files
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 truncate">
                      {mod.pathPattern}
                    </div>
                    {mod.ownerName ? (
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1 pt-0.5">
                        <Users className="w-3 h-3" />
                        <span>Owner: {mod.ownerName}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 pt-0.5">Unassigned ownership</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !isLoading && !isAnalyzing ? (
          <div className="p-16 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
            <Brain className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-semibold text-white">
                No Architecture Analysis Performed Yet
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Trigger DevPilot AI to safely inspect this repository’s structure, detect languages and
                frameworks, evaluate team modules, and generate a prioritized improvement backlog.
              </p>
            </div>
            <button
              onClick={handleTriggerAnalysis}
              disabled={isTriggering}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/20 transition flex items-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4" />
              <span>Run Initial Architecture Analysis</span>
            </button>
          </div>
        ) : null}

        {/* Prioritized Task Backlog Section */}
        {tasks.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-400" />
                  <span>Prioritized Development Backlog</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Grounded engineering tasks identified from static analysis and architectural inspection.
                </p>
              </div>

              {/* Priority Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-medium">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPriority(p)}
                    className={`px-3 py-1 rounded-md transition ${
                      selectedPriority === p
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p}
                    {p !== 'ALL' && overview?.tasksByPriority?.[p] ? (
                      <span className="ml-1.5 opacity-70">
                        ({overview.tasksByPriority[p]})
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Cards List */}
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isExpanded = expandedTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className="rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition overflow-hidden shadow-sm"
                  >
                    {/* Task Header */}
                    <div
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className="p-5 cursor-pointer flex items-start justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border font-mono ${getPriorityColor(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>

                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            {task.category}
                          </span>

                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                            Complexity: {task.estimatedComplexity}
                          </span>

                          {task.moduleName && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <Tag className="w-2.5 h-2.5" />
                              <span>{task.moduleName}</span>
                            </span>
                          )}

                          {task.assignedMember && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                              <Users className="w-2.5 h-2.5" />
                              <span>{task.assignedMember}</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-slate-200">{task.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>
                      </div>

                      <button className="text-slate-500 hover:text-slate-300 p-1 rounded">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Expandable Task Deep Dive */}
                    {isExpanded && (
                      <div className="p-5 bg-slate-950/40 border-t border-slate-800 space-y-4 text-xs">
                        {/* Evidence */}
                        {task.evidence && (
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                              Supporting Codebase Evidence
                            </span>
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 leading-relaxed">
                              {task.evidence}
                            </div>
                          </div>
                        )}

                        {/* File References */}
                        {task.relevantFiles && task.relevantFiles.length > 0 && (
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                              Affected Files
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {task.relevantFiles.map((file) => (
                                <span
                                  key={file}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-slate-300"
                                >
                                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                                  <span>{file}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Approach & Tests */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          {task.suggestedApproach && (
                            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                              <span className="font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                                <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Suggested Implementation</span>
                              </span>
                              <p className="text-slate-400 leading-relaxed">
                                {task.suggestedApproach}
                              </p>
                            </div>
                          )}

                          {task.requiredTests && (
                            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                              <span className="font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Required Verification Tests</span>
                              </span>
                              <p className="text-slate-400 leading-relaxed">{task.requiredTests}</p>
                            </div>
                          )}
                        </div>

                        {task.expectedBenefit && (
                          <div className="text-[11px] text-slate-400 pt-1">
                            <strong className="text-slate-300">Expected Value:</strong>{' '}
                            {task.expectedBenefit}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
