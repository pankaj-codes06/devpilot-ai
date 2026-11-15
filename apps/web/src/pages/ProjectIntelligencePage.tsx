import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Brain,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Layers,
  Code2,
  Users,
  ChevronDown,
  ChevronUp,
  Wrench,
} from 'lucide-react';
import { Header } from '../components/Header.js';
import { api } from '../services/api.js';
import type {
  ProjectDto,
  TeamDto,
  ProjectModuleDto,
  DevelopmentTaskDto,
  ArchitectureSummary,
} from '@devpilot/shared';

export const ProjectIntelligencePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [overview, setOverview] = useState<any | null>(null);
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [modules, setModules] = useState<ProjectModuleDto[]>([]);
  const [tasks, setTasks] = useState<DevelopmentTaskDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'tasks'>('overview');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const [projData, overviewData, teamsData, modulesData, tasksData] = await Promise.all([
        api.projects.getById(id),
        api.projects.getAnalysis(id).catch(() => null),
        api.projects.listTeams(id).catch(() => []),
        api.projects.listModules(id).catch(() => []),
        api.projects.getTasks(id).catch(() => []),
      ]);

      setProject(projData);
      setOverview(overviewData);
      setTeams(teamsData);
      setModules(modulesData);
      setTasks(tasksData);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to fetch project details',
      });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTriggerAnalysis = async () => {
    if (!id) return;
    try {
      setIsTriggering(true);
      setFeedback(null);
      const result = await api.projects.analyze(id);
      setFeedback({
        type: 'success',
        message: `Intelligence analysis complete! Formulated ${result.tasks?.length || 0} grounded development tasks.`,
      });
      await fetchData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Analysis failed',
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleSuggestTeams = async () => {
    if (!id) return;
    try {
      setIsSuggesting(true);
      setFeedback(null);
      const result = await api.projects.suggestTeamsAndModules(id);
      setFeedback({
        type: 'success',
        message: `Suggested ${result.teams.length} autonomous teams and ${result.modules.length} module boundaries!`,
      });
      await fetchData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Suggestion failed',
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedPriority === 'ALL') return true;
    return t.priority === selectedPriority;
  });

  const architecture: ArchitectureSummary | null = overview?.architecture || null;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title={project ? `${project.name} — Project Intelligence` : 'Project Intelligence'}
        description="Autonomous codebase architecture analysis, team mapping, and development backlog."
        actions={
          <div className="flex items-center space-x-2">
            <Link
              to="/projects"
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Projects</span>
            </Link>

            <button
              onClick={handleSuggestTeams}
              disabled={isSuggesting}
              className="px-3.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isSuggesting ? 'Mapping Teams...' : 'Auto-Suggest Teams'}</span>
            </button>

            <button
              onClick={handleTriggerAnalysis}
              disabled={isTriggering}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              {isTriggering ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing Codebase...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Intelligence Analysis</span>
                </>
              )}
            </button>
          </div>
        }
      />

      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {feedback && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-red-950/40 border-red-800/60 text-red-300'
                }`}
              >
                <span>{feedback.message}</span>
                <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-200">
                  Dismiss
                </button>
              </div>
            )}

            {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 text-xs font-medium space-x-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Architecture Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'teams'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teams & Modules ({teams.length} teams, {modules.length} modules)</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'tasks'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Development Backlog ({tasks.length} tasks)</span>
          </button>
        </div>

        {/* TAB 1: ARCHITECTURE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {overview?.reportSummary && (
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                  <Brain className="w-4 h-4" />
                  <span>Executive AI Summary</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{overview.reportSummary}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 text-[11px] block uppercase tracking-wider font-semibold">Total Files</span>
                <span className="text-xl font-bold text-white mt-1 block">{architecture?.totalFiles || project?.activeVersion?.fileCount || 0}</span>
                <span className="text-[11px] text-slate-400 mt-1 block">Sanitized workspace</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 text-[11px] block uppercase tracking-wider font-semibold">Project Type</span>
                <span className="text-xl font-bold text-white mt-1 block">{architecture?.projectType || 'Generic'}</span>
                <span className="text-[11px] text-slate-400 mt-1 block">Package: {architecture?.packageManager || 'npm'}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 text-[11px] block uppercase tracking-wider font-semibold">Autonomous Teams</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block">{teams.length}</span>
                <span className="text-[11px] text-slate-400 mt-1 block">{modules.length} mapped modules</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 text-[11px] block uppercase tracking-wider font-semibold">Backlog Tasks</span>
                <span className="text-xl font-bold text-blue-400 mt-1 block">{tasks.length}</span>
                <span className="text-[11px] text-slate-400 mt-1 block">Grounded in code</span>
              </div>
            </div>

            {/* Languages and Frameworks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-400" />
                  <span>Detected Languages</span>
                </h4>
                {architecture?.languages ? (
                  <div className="space-y-3">
                    {Object.entries(architecture.languages).map(([lang, pct]) => (
                      <div key={lang} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>{lang}</span>
                          <span className="font-mono text-slate-400">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Run analysis to inspect languages.</p>
                )}
              </div>

              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Frameworks & Tooling</span>
                </h4>
                {architecture?.frameworks && architecture.frameworks.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {architecture.frameworks.map((fw) => (
                      <span key={fw} className="px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        {fw}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No frameworks detected yet.</p>
                )}

                <div className="pt-4 border-t border-slate-800/60 space-y-2">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">Entry Points</span>
                  {architecture?.entryPoints && architecture.entryPoints.length > 0 ? (
                    <div className="space-y-1">
                      {architecture.entryPoints.map((ep) => (
                        <div key={ep} className="text-xs font-mono text-slate-300 bg-slate-800/60 px-2 py-1 rounded border border-slate-800">
                          {ep}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">None detected</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEAMS & MODULES */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Autonomous Development Teams</h3>
              <p className="text-xs text-slate-400 mt-0.5">Teams owning distinct functional segments of the codebase.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {teams.map((t) => (
                <div key={t.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-[11px] font-mono text-slate-400">{t.modulesCount ?? 0} modules</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{t.name}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.description || 'No description'}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
                    <span>Tasks: {t.tasksCount ?? 0}</span>
                    <span className="truncate">{t.leadName || 'Unassigned Lead'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <h3 className="text-sm font-semibold text-white mb-3">Codebase Module Ownership</h3>
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800 overflow-hidden">
                {modules.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-200">{m.name}</span>
                        {m.isShared ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Shared Core
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {m.teamName || 'Unassigned'}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">{m.description || 'No description'}</p>
                    </div>

                    <div className="font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700/60">
                      {m.pathPattern}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEVELOPMENT BACKLOG */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Prioritized Improvement Backlog</h3>
                <p className="text-xs text-slate-400 mt-0.5">Actionable engineering tasks formulated by the intelligence engine.</p>
              </div>

              {/* Priority filter */}
              <div className="flex space-x-1.5 text-xs">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPriority(p)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                      selectedPriority === p
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No development tasks found matching filter.
                </div>
              ) : (
                filteredTasks.map((t) => {
                  const isExpanded = expandedTaskId === t.id;
                  return (
                    <div
                      key={t.id}
                      className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden hover:border-slate-700/80 transition"
                    >
                      <div
                        onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                        className="p-4 flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                              t.priority === 'CRITICAL'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : t.priority === 'HIGH'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {t.priority}
                          </span>
                          <div>
                            <h4 className="text-xs font-semibold text-slate-200">{t.title}</h4>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                              <span>Category: {t.category}</span>
                              <span>•</span>
                              <span>Team: {t.teamName || 'Unassigned'}</span>
                              <span>•</span>
                              <span>Complexity: {t.estimatedComplexity}</span>
                            </div>
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-3 text-xs bg-slate-900/40">
                          <div>
                            <span className="text-[11px] text-slate-500 font-semibold block uppercase tracking-wider mb-1">
                              Description & Rationale
                            </span>
                            <p className="text-slate-300 leading-relaxed">{t.description}</p>
                          </div>

                          {t.suggestedApproach && (
                            <div>
                              <span className="text-[11px] text-slate-500 font-semibold block uppercase tracking-wider mb-1">
                                Suggested Approach
                              </span>
                              <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-800/60 p-2.5 rounded border border-slate-800">
                                {t.suggestedApproach}
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div>
                              <span className="text-[11px] text-slate-500 font-semibold block uppercase tracking-wider mb-1">
                                Target Files
                              </span>
                              <div className="space-y-1">
                                {t.relevantFiles.map((rf) => (
                                  <div key={rf} className="font-mono text-[11px] text-blue-400">
                                    {rf}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="text-[11px] text-slate-500 font-semibold block uppercase tracking-wider mb-1">
                                Expected Benefit
                              </span>
                              <p className="text-slate-300">{t.expectedBenefit || 'Increases codebase quality and stability.'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};
