import React, { useState } from 'react';
import { FederatedNode, Covenant, TrainingRound, ByzantineAttackConfig } from '../types/covenant';
import { NetworkTopologyCanvas } from './NetworkTopologyCanvas';
import { 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp, 
  Coins, 
  Zap, 
  Lock, 
  ExternalLink, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Sliders,
  Sparkles
} from 'lucide-react';

interface TrainingCockpitProps {
  covenant: Covenant;
  nodes: FederatedNode[];
  recentRounds: TrainingRound[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  simulationPhase: number;
  attackConfig: ByzantineAttackConfig;
  onUpdateAttack: (config: ByzantineAttackConfig) => void;
  onStepRound: () => void;
  isSimulating: boolean;
  onRequestDispute: (node: FederatedNode) => void;
}

export const TrainingCockpit: React.FC<TrainingCockpitProps> = ({
  covenant,
  nodes,
  recentRounds,
  selectedNodeId,
  onSelectNode,
  simulationPhase,
  attackConfig,
  onUpdateAttack,
  onStepRound,
  isSimulating,
  onRequestDispute,
}) => {
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const latestRound = recentRounds[0];

  const phaseNames = [
    'Idle & Synchronized',
    'Phase 1: Global Weight Broadcast & Task Dispatch',
    'Phase 2: Local Edge Training & DP Gaussian Perturbation',
    'Phase 3: Byzantine Robust Aggregation & Slashing Consensus',
    'Phase 4: Shapley Contribution Allocation & Token Settlement',
  ];

  return (
    <div className="space-y-6">
      {/* 4 Primary KPI metric strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>Global Validation Accuracy</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {(covenant.globalAccuracy * 100).toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-emerald-400">
              +{((latestRound?.accuracyDelta || 0.004) * 100).toFixed(2)}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Model: {covenant.targetModel}
          </p>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>Aggregated Validation Loss</span>
            <Sliders className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {covenant.globalLoss.toFixed(4)}
            </span>
            <span className="text-xs font-mono text-emerald-400">
              {(latestRound?.lossDelta || -0.007).toFixed(4)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centroid Defense: {covenant.aggregationAlgorithm}
          </p>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>Staked Collateral in Escrow</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {nodes.reduce((acc, n) => acc + n.stakeAmount, 0).toLocaleString()} COV
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Slashing Reserve: {nodes.reduce((acc, n) => acc + n.slashedLosses, 0).toLocaleString()} COV
          </p>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>Differential Privacy Budget</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              ε = {covenant.epsilonDP}
            </span>
            <span className="text-xs font-mono text-slate-400">
              δ = 10⁻⁵
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rényi DP composition theorem active
          </p>
        </div>
      </div>

      {/* Real-time FL Simulation Stage Progress & Attack Injector */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                Round Execution Protocol
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-400 font-mono">
                Round #{covenant.currentRound}
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-200 mt-0.5">
              {phaseNames[simulationPhase]}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Attack scenario selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 whitespace-nowrap">Adversary Vector:</span>
              <select
                value={attackConfig.type}
                onChange={(e) =>
                  onUpdateAttack({
                    ...attackConfig,
                    type: e.target.value as any,
                  })
                }
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="none">Honest Consortium (Clean)</option>
                <option value="label-flip">Label-Flipping Backdoor (Byzantine)</option>
                <option value="free-rider">Free-Rider Zero-Compute Exploit</option>
                <option value="gradient-explosion">Gradient Explosion Outlier</option>
              </select>
            </div>

            <button
              onClick={onStepRound}
              disabled={isSimulating}
              className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isSimulating ? 'Executing...' : 'Trigger Round Step'}</span>
            </button>
          </div>
        </div>

        {/* 4-step execution progress bar */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {[1, 2, 3, 4].map((step) => {
            const isActive = simulationPhase === step;
            const isCompleted = simulationPhase > step;
            return (
              <div key={`step-${step}`} className="space-y-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                      : isCompleted
                      ? 'bg-emerald-600'
                      : 'bg-slate-800'
                  }`}
                />
                <span className="text-[10px] text-slate-500 block truncate font-mono">
                  {step === 1 && '1. Model Broadcast'}
                  {step === 2 && '2. Local Edge DP'}
                  {step === 3 && '3. Byzantine Slashing'}
                  {step === 4 && '4. Shapley Settlement'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Network Topology Canvas */}
      <NetworkTopologyCanvas
        nodes={nodes}
        covenant={covenant}
        selectedNodeId={selectedNodeId}
        onSelectNode={(id) => onSelectNode(id === selectedNodeId ? null : id)}
        simulationPhase={simulationPhase}
      />

      {/* High-density Node Telemetry & Verification Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Federated Node Telemetry & Verification Registry
            </h3>
            <p className="text-xs text-slate-400">
              Live mathematical parameters for validation accuracy contribution and covenant adherence
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {nodes.length} Nodes Registered · {nodes.filter((n) => n.status === 'Verified').length} Verified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-mono">
              <tr>
                <th className="py-2.5 px-4 font-medium">Node & Institution</th>
                <th className="py-2.5 px-3 font-medium">Category</th>
                <th className="py-2.5 px-3 font-medium text-right">Samples & Volume</th>
                <th className="py-2.5 px-3 font-medium text-right">Data Quality</th>
                <th className="py-2.5 px-3 font-medium text-right">Grad Norm ||g||₂</th>
                <th className="py-2.5 px-3 font-medium text-right">Cosine Alignment</th>
                <th className="py-2.5 px-3 font-medium text-right">Shapley Share</th>
                <th className="py-2.5 px-3 font-medium text-center">Covenant Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {nodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const isSlashed = node.status === 'Slashed';
                const isFlagged = node.status === 'Flagged';

                return (
                  <tr
                    key={node.id}
                    onClick={() => onSelectNode(node.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-800/70'
                        : isSlashed
                        ? 'bg-rose-950/10 hover:bg-rose-950/20'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3 px-4 font-sans font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        {isSlashed ? (
                          <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : isFlagged ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <div>
                          <div className="text-white font-medium">{node.name}</div>
                          <div className="text-[11px] text-slate-500">{node.institution}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-sans text-slate-400">
                      {node.category}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums text-slate-300">
                      {node.sampleCount.toLocaleString()}
                      <span className="text-[10px] text-slate-500 block">
                        {node.computeTflops} TFLOPS
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums">
                      <span
                        className={
                          node.dataQualityScore > 0.85
                            ? 'text-emerald-400'
                            : node.dataQualityScore > 0.6
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }
                      >
                        {(node.dataQualityScore * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        H: {node.nonIidDiversity.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums">
                      <span
                        className={
                          node.gradientNorm > 5.0
                            ? 'text-rose-400 font-semibold'
                            : 'text-slate-300'
                        }
                      >
                        {node.gradientNorm.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums">
                      <span
                        className={
                          node.cosineSimilarity > 0.7
                            ? 'text-emerald-400'
                            : node.cosineSimilarity > 0.2
                            ? 'text-amber-400'
                            : 'text-rose-400 font-semibold'
                        }
                      >
                        {node.cosineSimilarity > 0 ? '+' : ''}
                        {node.cosineSimilarity.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-emerald-400">
                      {(node.shapleyValue * 100).toFixed(1)}%
                      <span className="text-[10px] text-slate-500 block font-normal">
                        +{(node.shapleyValue * 3500).toFixed(0)} COV
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[11px] font-sans px-2 py-0.5 rounded ${
                          isSlashed
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : isFlagged
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {node.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestDispute(node);
                          }}
                          className="px-2 py-1 text-[11px] font-sans text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                        >
                          Audit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Node Deep-Inspection Drawer / Panel */}
      {selectedNode && (
        <div className="p-4 bg-slate-900 border border-slate-700/80 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">
                  Node Telemetry Inspection: {selectedNode.name}
                </h4>
                <span className="text-xs text-slate-500 font-mono">{selectedNode.id}</span>
              </div>
              <p className="text-xs text-slate-400">
                {selectedNode.institution} · {selectedNode.region}
              </p>
            </div>

            <button
              onClick={() => onSelectNode(null)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-800 rounded"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded space-y-2">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block">
                Cryptographic State Commitment
              </span>
              <div className="truncate text-slate-300">
                Hash: {selectedNode.lastStateHash}
              </div>
              <div className="text-slate-400">
                Stake Collateral: <strong className="text-white">{selectedNode.stakeAmount.toLocaleString()} COV</strong>
              </div>
              <div className="text-slate-400">
                Lifetime Slashed: <strong className="text-rose-400">-{selectedNode.slashedLosses} COV</strong>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded space-y-2">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block">
                Differential Privacy Local Noise
              </span>
              <div className="text-slate-300">
                Gaussian Noise σ: <strong className="text-emerald-400">{(Math.sqrt(2 * Math.log(1.25 / 1e-5)) / covenant.epsilonDP).toFixed(3)}</strong>
              </div>
              <div className="text-slate-300">
                Clipping Bound C: <strong className="text-slate-200">1.0 L2-norm</strong>
              </div>
              <div className="text-slate-400">
                Inversion Resistance: <strong className="text-emerald-400">Provably Bounded</strong>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded space-y-2">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block">
                Marginal Shapley Attribution
              </span>
              <div className="text-slate-300">
                Valuation Share: <strong className="text-emerald-400">{(selectedNode.shapleyValue * 100).toFixed(2)}%</strong>
              </div>
              <div className="text-slate-300">
                Marginal Loss Δ: <strong className="text-cyan-400">{selectedNode.marginalLossReduction > 0 ? '-' : ''}{Math.abs(selectedNode.marginalLossReduction).toFixed(4)}</strong>
              </div>
              <div className="text-slate-400">
                Reputation Score: <strong className="text-white">{selectedNode.reputationScore} / 100</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => onRequestDispute(selectedNode)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Submit to AI Arbiter for Formal Ruling</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
