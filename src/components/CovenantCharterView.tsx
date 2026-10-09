import React, { useState } from 'react';
import { Covenant, CovenantArticle } from '../types/covenant';
import { COVENANT_ARTICLES } from '../utils/mockFederatedData';
import { Scroll, Shield, Check, Plus, BookOpen, Scale, ArrowRight } from 'lucide-react';

interface CovenantCharterViewProps {
  covenants: Covenant[];
  activeCovenantId: string;
  onSelectCovenant: (covenantId: string) => void;
  onCreateCovenant: (newCovenant: Covenant) => void;
}

export const CovenantCharterView: React.FC<CovenantCharterViewProps> = ({
  covenants,
  activeCovenantId,
  onSelectCovenant,
  onCreateCovenant,
}) => {
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: 'NeuroGen Genomic Consortia',
    domain: 'Bio-Informatics',
    targetModel: 'GenomicTransformer-7B Splice Variant Detector',
    description: 'Privacy-preserving whole genome sequencing analysis across international genomic biobanks.',
    rewardPool: 300000,
    aggregationAlgorithm: 'Multi-Krum' as const,
    valuationMetric: 'Data-Shapley' as const,
    epsilonDP: 0.75,
    minStake: 20000,
    slashingPenaltyPercent: 50,
    vestingEpochs: 10,
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCov: Covenant = {
      id: `cov-custom-${Date.now()}`,
      name: formData.name,
      domain: formData.domain,
      targetModel: formData.targetModel,
      description: formData.description,
      rewardPool: Number(formData.rewardPool),
      allocatedRewards: 0,
      aggregationAlgorithm: formData.aggregationAlgorithm,
      valuationMetric: formData.valuationMetric,
      epsilonDP: Number(formData.epsilonDP),
      deltaDP: 1e-5,
      minStake: Number(formData.minStake),
      slashingPenaltyPercent: Number(formData.slashingPenaltyPercent),
      vestingEpochs: Number(formData.vestingEpochs),
      currentRound: 1,
      totalNodes: 5,
      globalAccuracy: 0.81,
      globalLoss: 0.42,
      status: 'Active',
    };
    onCreateCovenant(newCov);
    setIsDrafting(false);
  };

  return (
    <div className="space-y-6">
      {/* Introduction to the Covenant */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Scroll className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">
                The Constitution of the Federated AI Rewards Covenant
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              A foundational decentralized framework encoding the cryptographic, differential privacy, game-theoretic, and economic rules governing collaborative AI training across sovereign edge participants.
            </p>
          </div>

          <button
            onClick={() => setIsDrafting(!isDrafting)}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors flex items-center gap-2 whitespace-nowrap self-start md:self-auto font-sans"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isDrafting ? 'Cancel Drafting' : 'Draft New Covenant'}</span>
          </button>
        </div>
      </div>

      {/* Drafting Modal / Form */}
      {isDrafting && (
        <form onSubmit={handleCreateSubmit} className="p-6 bg-slate-900 border border-emerald-500/50 rounded-lg space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-white">
              Draft & Ratify a New Federated AI Covenant
            </h3>
            <p className="text-xs text-slate-400">
              Set mathematical constraints, Byzantine tolerance thresholds, and economic reward curves.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1 font-sans">Covenant Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded p-2 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-sans">Target Domain</label>
              <input
                type="text"
                required
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded p-2 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-sans">Target AI Model</label>
              <input
                type="text"
                required
                value={formData.targetModel}
                onChange={(e) => setFormData({ ...formData, targetModel: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded p-2 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-sans">Reward Pool ($COV)</label>
              <input
                type="number"
                min="10000"
                step="5000"
                value={formData.rewardPool}
                onChange={(e) => setFormData({ ...formData, rewardPool: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded p-2 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-sans">Byzantine Aggregator</label>
              <select
                value={formData.aggregationAlgorithm}
                onChange={(e) => setFormData({ ...formData, aggregationAlgorithm: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded p-2 focus:border-emerald-500"
              >
                <option value="Multi-Krum">Multi-Krum (Highest Byzantine resistance)</option>
                <option value="Coordinate-wise Median">Coordinate-wise Median (Outlier robust)</option>
                <option value="Trimmed-Mean">Trimmed-Mean (20% trim)</option>
                <option value="FedProx">FedProx (System heterogeneity)</option>
                <option value="FedAvg">FedAvg (Classical baseline)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-sans">Contribution Metric</label>
              <select
                value={formData.valuationMetric}
                onChange={(e) => setFormData({ ...formData, valuationMetric: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded p-2 focus:border-emerald-500"
              >
                <option value="Data-Shapley">Data-Shapley (Strict marginal fairness)</option>
                <option value="Monte-Carlo Shapley">Monte-Carlo Shapley (High efficiency)</option>
                <option value="Influence Function">Influence Function (Hessian approx)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-sans">Differential Privacy Budget (ε)</label>
              <input
                type="number"
                min="0.1"
                max="5.0"
                step="0.05"
                value={formData.epsilonDP}
                onChange={(e) => setFormData({ ...formData, epsilonDP: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded p-2 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-sans">Minimum Node Stake (COV)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={formData.minStake}
                onChange={(e) => setFormData({ ...formData, minStake: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded p-2 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-sans">Slashing Penalty (%)</label>
              <input
                type="number"
                min="10"
                max="100"
                value={formData.slashingPenaltyPercent}
                onChange={(e) => setFormData({ ...formData, slashingPenaltyPercent: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded p-2 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsDrafting(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded font-sans"
            >
              Ratify & Deploy Covenant
            </button>
          </div>
        </form>
      )}

      {/* Active Covenants in Network */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">
          Active Covenants in the Global Registry
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {covenants.map((cov) => {
            const isSelected = cov.id === activeCovenantId;
            return (
              <div
                key={cov.id}
                onClick={() => onSelectCovenant(cov.id)}
                className={`p-5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{cov.name}</h4>
                      {isSelected && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800 font-mono">
                          ACTIVE IN COCKPIT
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {cov.domain} · {cov.targetModel}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                  {cov.description}
                </p>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Reward Pool</span>
                    <strong className="text-white">{cov.rewardPool.toLocaleString()} COV</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Defense</span>
                    <strong className="text-slate-300">{cov.aggregationAlgorithm}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Privacy (ε)</span>
                    <strong className="text-emerald-400">{cov.epsilonDP}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* The 5 Articles of the Covenant */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">
            The Five Articles of the FAIRC Covenant
          </h3>
        </div>

        <div className="space-y-4">
          {COVENANT_ARTICLES.map((article) => (
            <div
              key={article.number}
              className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    {article.number} · {article.latinName}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-0.5">
                    {article.title}
                  </h4>
                </div>
                <div className="p-2 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-emerald-400 self-start sm:self-auto">
                  {article.formalEquation}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {article.summary}
              </p>

              <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded text-[11px] text-slate-400 font-mono">
                <strong className="text-slate-300 font-sans">Protocol Specification: </strong>
                {article.specification}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
