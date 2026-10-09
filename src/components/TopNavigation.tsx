import React from 'react';
import { Shield, Play, Pause, RefreshCw, Cpu, Layers } from 'lucide-react';

interface TopNavigationProps {
  activeTab: 'cockpit' | 'shapley' | 'covenant' | 'arbiter' | 'operator';
  setActiveTab: (tab: 'cockpit' | 'shapley' | 'covenant' | 'arbiter' | 'operator') => void;
  currentRound: number;
  isRunningAuto: boolean;
  onToggleAuto: () => void;
  onStepRound: () => void;
  isSimulating: boolean;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeTab,
  setActiveTab,
  currentRound,
  isRunningAuto,
  onToggleAuto,
  onStepRound,
  isSimulating,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-emerald-400 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              Federated AI Rewards Covenant
            </span>
          </div>

          {/* Zone 2: 5 clean navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => setActiveTab('cockpit')}
              className={`hover:text-white transition-colors whitespace-nowrap py-1 relative ${
                activeTab === 'cockpit' ? 'text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-400' : 'text-slate-400'
              }`}
            >
              Training Cockpit
            </button>
            <button
              onClick={() => setActiveTab('shapley')}
              className={`hover:text-white transition-colors whitespace-nowrap py-1 relative ${
                activeTab === 'shapley' ? 'text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-400' : 'text-slate-400'
              }`}
            >
              Shapley Valuation
            </button>
            <button
              onClick={() => setActiveTab('covenant')}
              className={`hover:text-white transition-colors whitespace-nowrap py-1 relative ${
                activeTab === 'covenant' ? 'text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-400' : 'text-slate-400'
              }`}
            >
              Covenant Charter
            </button>
            <button
              onClick={() => setActiveTab('arbiter')}
              className={`hover:text-white transition-colors whitespace-nowrap py-1 relative ${
                activeTab === 'arbiter' ? 'text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-400' : 'text-slate-400'
              }`}
            >
              AI Arbiter & Audit
            </button>
            <button
              onClick={() => setActiveTab('operator')}
              className={`hover:text-white transition-colors whitespace-nowrap py-1 relative ${
                activeTab === 'operator' ? 'text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-400' : 'text-slate-400'
              }`}
            >
              Node Operator
            </button>
          </nav>

          {/* Zone 3: Primary Action & Round Status */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums px-2.5 py-1 bg-slate-900 border border-slate-800 rounded">
              <span className="text-slate-500">Epoch</span>
              <span className="text-emerald-400 font-semibold">{currentRound}</span>
            </div>

            <button
              onClick={onToggleAuto}
              title={isRunningAuto ? 'Pause continuous rounds' : 'Start continuous federated rounds'}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                isRunningAuto
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              {isRunningAuto ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunningAuto ? 'Pause Loop' : 'Auto Loop'}</span>
            </button>

            <button
              onClick={onStepRound}
              disabled={isSimulating || isRunningAuto}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:hover:bg-emerald-400 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm shadow-emerald-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>Step FL Round</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary navigation */}
        <div className="flex md:hidden items-center gap-4 py-2 overflow-x-auto text-xs text-slate-400 border-t border-slate-900">
          <button
            onClick={() => setActiveTab('cockpit')}
            className={`whitespace-nowrap ${activeTab === 'cockpit' ? 'text-emerald-400 font-medium' : ''}`}
          >
            Cockpit
          </button>
          <button
            onClick={() => setActiveTab('shapley')}
            className={`whitespace-nowrap ${activeTab === 'shapley' ? 'text-emerald-400 font-medium' : ''}`}
          >
            Shapley
          </button>
          <button
            onClick={() => setActiveTab('covenant')}
            className={`whitespace-nowrap ${activeTab === 'covenant' ? 'text-emerald-400 font-medium' : ''}`}
          >
            Covenant
          </button>
          <button
            onClick={() => setActiveTab('arbiter')}
            className={`whitespace-nowrap ${activeTab === 'arbiter' ? 'text-emerald-400 font-medium' : ''}`}
          >
            Arbiter
          </button>
          <button
            onClick={() => setActiveTab('operator')}
            className={`whitespace-nowrap ${activeTab === 'operator' ? 'text-emerald-400 font-medium' : ''}`}
          >
            Operator
          </button>
        </div>
      </div>
    </header>
  );
};
