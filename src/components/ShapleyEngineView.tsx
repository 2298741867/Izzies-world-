import React, { useState } from 'react';
import { FederatedNode, Covenant } from '../types/covenant';
import { computeMonteCarloShapley, compareRewardAllocationModels } from '../utils/shapley';
import { Calculator, Play, Info, AlertTriangle, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface ShapleyEngineViewProps {
  nodes: FederatedNode[];
  covenant: Covenant;
}

export const ShapleyEngineView: React.FC<ShapleyEngineViewProps> = ({ nodes, covenant }) => {
  const [permutations, setPermutations] = useState<number>(150);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [shapleyResults, setShapleyResults] = useState<{
    [nodeId: string]: { shapleyValue: number; variance: number; rawUtility: number };
  } | null>(null);

  const [activeAxiomTab, setActiveAxiomTab] = useState<'dummy' | 'efficiency' | 'symmetry' | 'additivity'>('dummy');

  const comparisonData = compareRewardAllocationModels(nodes);

  const handleRunMonteCarlo = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const results = computeMonteCarloShapley(nodes, permutations);
      setShapleyResults(results);
      setIsCalculating(false);
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* Header and Formal Equation */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">
                Cooperative Game Theory & Data-Shapley Valuation Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              In accordance with <strong>Article II of the Covenant</strong>, token rewards are disbursed strictly according to marginal contribution to the global validation accuracy coalition $v(S)$.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-300">
            <span className="text-slate-500 block text-[10px] uppercase">Classical Shapley Formula</span>
            <div className="text-emerald-400 font-semibold py-1">
              ϕᵢ(v) = ∑ [|S|!(|N|-|S|-1)! / |N|!] · [v(S ∪ {'{i}'}) - v(S)]
            </div>
          </div>
        </div>

        {/* Monte Carlo Simulator Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400 font-medium">Permutation Sample Count:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded">
              {[50, 150, 300, 600].map((count) => (
                <button
                  key={count}
                  onClick={() => setPermutations(count)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    permutations === count
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {count} M
                </button>
              ))}
            </div>
            <span className="text-slate-500 text-[11px] hidden sm:inline">
              (Higher M decreases Monte Carlo standard variance)
            </span>
          </div>

          <button
            onClick={handleRunMonteCarlo}
            disabled={isCalculating}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded transition-colors flex items-center gap-2 font-sans"
          >
            <Play className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>{isCalculating ? 'Computing Permutations...' : `Run ${permutations} Monte Carlo Samples`}</span>
          </button>
        </div>
      </div>

      {/* Comparison Grid: Why Naive Volume-Based Allocation Fails */}
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Model Allocation Comparison: Data-Shapley vs. Naive Volume vs. Equal Split
            </h3>
            <p className="text-xs text-slate-400">
              Notice how naive sample-volume weighting rewards low-quality spam, while Data-Shapley correctly identifies genuine value.
            </p>
          </div>
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Prevents Sybil & Junk-Data Flooding
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 font-sans font-medium">Node Entity</th>
                <th className="py-2.5 px-3 text-right">Data Samples</th>
                <th className="py-2.5 px-3 text-right">Data Quality</th>
                <th className="py-2.5 px-3 text-right text-emerald-400 bg-emerald-950/20">
                  Data-Shapley Share
                </th>
                <th className="py-2.5 px-3 text-right text-amber-300">
                  Volume-Proportional
                </th>
                <th className="py-2.5 px-3 text-right text-slate-400">
                  Equal Split
                </th>
                <th className="py-2.5 px-4 text-center font-sans">Covenant Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {nodes.map((node) => {
                const comp = comparisonData.find((c) => c.nodeId === node.id);
                const currentShapley = shapleyResults
                  ? shapleyResults[node.id]?.shapleyValue || 0
                  : node.shapleyValue;
                const volumeShare = comp?.volumeShare || 0;
                const equalShare = comp?.equalShare || 0;

                const isAdversary = node.isAdversary;

                return (
                  <tr
                    key={node.id}
                    className={`transition-colors ${
                      isAdversary ? 'bg-rose-950/20' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3 px-4 font-sans text-slate-200 font-medium">
                      <div className="flex items-center gap-2">
                        {isAdversary && <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />}
                        <div>
                          <div className={isAdversary ? 'text-rose-300' : 'text-white'}>
                            {node.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {node.category} · Entropy: {node.nonIidDiversity.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums text-slate-300">
                      {node.sampleCount.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums">
                      <span className={node.dataQualityScore > 0.8 ? 'text-emerald-400' : 'text-rose-400'}>
                        {(node.dataQualityScore * 100).toFixed(0)}%
                      </span>
                    </td>

                    {/* Data Shapley (True Fair Share) */}
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-emerald-400 bg-emerald-950/20">
                      {(currentShapley * 100).toFixed(1)}%
                    </td>

                    {/* Naive Volume */}
                    <td className="py-3 px-3 text-right tabular-nums text-amber-300">
                      {(volumeShare * 100).toFixed(1)}%
                    </td>

                    {/* Equal Share */}
                    <td className="py-3 px-3 text-right tabular-nums text-slate-400">
                      {(equalShare * 100).toFixed(1)}%
                    </td>

                    <td className="py-3 px-4 text-center font-sans">
                      {isAdversary ? (
                        <span className="text-[10px] text-rose-400 font-medium bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                          Exploit Blocked (0.0% Payout)
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          Fair Marginal Reward
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200">The Incentive Compatibility Insight:</strong> Notice that{' '}
          <span className="text-rose-300 font-mono">Shadow Node 06</span> submitted 9,500 fake samples. Under a naive volume-based system, it would steal <strong className="text-amber-300">25.5%</strong> of the rewards. Under Data-Shapley, its marginal contribution is zero (or negative), granting it <strong className="text-emerald-400">0.0%</strong> and subjecting it to slashing under Article III.
        </div>
      </div>

      {/* The 4 Classical Axioms of Shapley Governance */}
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            The Four Cooperative Game-Theoretic Invariants of FAIRC
          </h3>
          <p className="text-xs text-slate-400">
            How the Covenant guarantees mathematical fairness across decentralized node operators
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setActiveAxiomTab('dummy')}
            className={`p-3 rounded border text-left transition-colors ${
              activeAxiomTab === 'dummy'
                ? 'bg-slate-800 border-emerald-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-xs font-bold">1. Dummy Player</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Zero value = Zero reward</div>
          </button>

          <button
            onClick={() => setActiveAxiomTab('efficiency')}
            className={`p-3 rounded border text-left transition-colors ${
              activeAxiomTab === 'efficiency'
                ? 'bg-slate-800 border-emerald-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-xs font-bold">2. Efficiency</div>
            <div className="text-[11px] text-slate-400 mt-0.5">100% of pool distributed</div>
          </button>

          <button
            onClick={() => setActiveAxiomTab('symmetry')}
            className={`p-3 rounded border text-left transition-colors ${
              activeAxiomTab === 'symmetry'
                ? 'bg-slate-800 border-emerald-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-xs font-bold">3. Symmetry</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Identical value = Equal reward</div>
          </button>

          <button
            onClick={() => setActiveAxiomTab('additivity')}
            className={`p-3 rounded border text-left transition-colors ${
              activeAxiomTab === 'additivity'
                ? 'bg-slate-800 border-emerald-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-xs font-bold">4. Additivity</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Multi-task linearity</div>
          </button>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-800 rounded text-xs space-y-2">
          {activeAxiomTab === 'dummy' && (
            <div>
              <div className="font-semibold text-emerald-400 font-mono">
                ∀S ⊆ N \ {'{i}'}: v(S ∪ {'{i}'}) = v(S) ⟹ ϕᵢ(v) = 0
              </div>
              <p className="text-slate-300 mt-1">
                If a participant provides data that does not improve validation loss over any subset of other clients (e.g. redundant copies, empty batches, or uninformative noise), their allocated reward is strictly zero.
              </p>
            </div>
          )}

          {activeAxiomTab === 'efficiency' && (
            <div>
              <div className="font-semibold text-emerald-400 font-mono">
                ∑_{'{i ∈ N}'} ϕᵢ(v) = v(N) - v(∅)
              </div>
              <p className="text-slate-300 mt-1">
                The entire reward pool allocated for epoch t is distributed among participating honest nodes. The Covenant protocol takes zero rent; all economic surplus generated by the AI model flows to data creators.
              </p>
            </div>
          )}

          {activeAxiomTab === 'symmetry' && (
            <div>
              <div className="font-semibold text-emerald-400 font-mono">
                ∀S ⊆ N \ {'{i, j}'}: v(S ∪ {'{i}'}) = v(S ∪ {'{j}'}) ⟹ ϕᵢ(v) = ϕⱼ(v)
              </div>
              <p className="text-slate-300 mt-1">
                Two nodes providing identical marginal statistical utility receive identical compensation, regardless of brand, server location, or operator identity.
              </p>
            </div>
          )}

          {activeAxiomTab === 'additivity' && (
            <div>
              <div className="font-semibold text-emerald-400 font-mono">
                ϕᵢ(u + v) = ϕᵢ(u) + ϕᵢ(v)
              </div>
              <p className="text-slate-300 mt-1">
                When a federated model trains on multi-objective losses (e.g. segmentation dice loss + bounding box IoU), the reward equals the exact sum of contributions to each respective objective.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
