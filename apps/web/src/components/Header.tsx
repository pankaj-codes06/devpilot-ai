import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { api } from '../services/api.js';

interface HeaderProps {
  title: string;
  description?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, description }) => {
  const navigate = useNavigate();
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'checking' | 'error'>('checking');

  useEffect(() => {
    let isMounted = true;
    api.system
      .checkHealth()
      .then((data) => {
        if (isMounted) {
          setHealthStatus(data.status === 'healthy' ? 'healthy' : 'error');
        }
      })
      .catch(() => {
        if (isMounted) {
          setHealthStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 bg-[#090d16]/90 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-white tracking-tight">{title}</h1>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>

      <div className="flex items-center space-x-4">
        {/* Timezone pill */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Asia/Kolkata (IST)</span>
        </div>

        {/* System Health */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
          {healthStatus === 'healthy' ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">System Online</span>
            </>
          ) : healthStatus === 'checking' ? (
            <>
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-amber-400 font-medium">Checking</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-red-400" />
              <span className="text-red-400 font-medium">Degraded</span>
            </>
          )}
        </div>

        {/* Quick Connect Repo Button */}
        <button
          onClick={() => navigate('/repositories?action=connect')}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition shadow-blue-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Connect Repository</span>
        </button>
      </div>
    </header>
  );
};

