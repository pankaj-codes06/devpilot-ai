import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderArchive,
  Upload,
  Brain,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Header } from '../components/Header.jsx';
import { api } from '../services/api.js';

export const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.projects.list();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a project ZIP archive');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      if (projectName.trim()) {
        formData.append('name', projectName.trim());
      }
      if (projectDescription.trim()) {
        formData.append('description', projectDescription.trim());
      }

      await api.projects.uploadZip(formData);
      setShowUploadModal(false);
      setProjectName('');
      setProjectDescription('');
      setSelectedFile(null);
      await fetchProjects();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload archive');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProject = async (projectId, name) => {
    if (!window.confirm(`Are you sure you want to delete project "${name}"? All extracted workspaces, teams, and generated tasks will be permanently removed.`)) {
      return;
    }

    try {
      await api.projects.delete(projectId);
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Hybrid Projects"
        description="Upload project archives, inspect isolated workspaces, analyze codebase architecture, and manage autonomous teams."
        actions={
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-500/20 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Project ZIP</span>
          </button>
        }
      />

      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-200">
              Dismiss
            </button>
          </div>
        )}

        {/* Project List */}
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">No Projects Uploaded Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Upload a project ZIP file to start autonomous repository analysis, automatic team mapping, and development task formulation without requiring GitHub access.
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-500/20 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const activeVer = project.activeVersion;
              return (
                <div
                  key={project.id}
                  className="rounded-xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700/80 transition group shadow-sm"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                          <FolderArchive className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition">
                            {project.name}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400">
                            v{activeVer?.versionNumber ?? 1} • {activeVer?.fileCount ?? 0} files
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {activeVer?.status || 'READY'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px]">
                      {project.description || 'No description provided.'}
                    </p>

                    {/* Stats pills */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div className="bg-slate-800/40 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block">Versions</span>
                        <span className="font-semibold text-slate-200">{project.versionsCount ?? 1}</span>
                      </div>
                      <div className="bg-slate-800/40 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block">Teams</span>
                        <span className="font-semibold text-slate-200">{project.teamsCount ?? 0}</span>
                      </div>
                      <div className="bg-slate-800/40 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block">Tasks</span>
                        <span className="font-semibold text-slate-200">{project.tasksCount ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-800 flex items-center justify-between">
                    <Link
                      to={`/projects/${project.id}/intelligence`}
                      className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Project Intelligence</span>
                    </Link>

                    <button
                      onClick={() => handleDeleteProject(project.id, project.name)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Upload Project Archive</h3>
                  <p className="text-[11px] text-slate-400">Upload a clean ZIP archive of your source code</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Fullstack App"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Brief description of the application and its purpose..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">ZIP Archive File</label>
                <div className="border border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-slate-500 transition cursor-pointer relative bg-slate-800/30">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FolderArchive className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <span className="text-slate-300 font-medium block">
                    {selectedFile ? selectedFile.name : 'Click to select or drag and drop ZIP file'}
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-1">
                    Max size 100MB. node_modules and .git will be automatically omitted.
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center space-x-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting & Sanitizing...</span>
                    </>
                  ) : (
                    <span>Upload & Extract</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
