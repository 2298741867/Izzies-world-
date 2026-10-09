import React, { useState } from 'react';
import { FederatedNode, Covenant } from '../types/covenant';
import { Server, Coins, Lock, Download, CheckCircle, ShieldCheck, ArrowUpRight, Cpu } from 'lucide-react';

interface NodeOperatorPortalProps {
  nodes: FederatedNode[];
  covenant: Covenant;
  onUpdateNodeStake: (nodeId: string, deltaStake: number) => void;
  onClaimRewards: (nodeId: string) => void;
}

export const NodeOperatorPortal: React.FC<NodeOperatorPortalProps> = ({
  nodes,
  covenant,
  onUpdateNodeStake,
  onClaimRewards,
}) => {
  const [activeNodeId, setActiveNodeId] = useState<string>(nodes[0]?.id || '');
  const [stakeInput, setStakeInput] = useState<string>('5000');
  const [localEpochs, setLocalEpochs] = useState<number>(3);
  const [learningRate, setLearningRate] = useState<number>(0.001);
  const [showClaimSuccess, setShowClaimSuccess] = useState<boolean>(false);

  const activeNode = nodes.find((n) => n.id === activeNodeId) || nodes[0];

  const handleStake = (delta: number) => {
    onUpdateNodeStake(activeNode.id, delta);
  };

  const handleClaim = () => {
    if (activeNode.accumulatedRewards <= 0) return;
    onClaimRewards(activeNode.id);
    setShowClaimSuccess(true);
    setTimeout(() => setShowClaimSuccess(false), 3000);
  };

  const downloadReceipt = () => {
    const receiptData = {
      protocol: 'Federated AI Rewards Covenant',
      covenantId: covenant.id,
      covenantName: covenant.name,
      nodeId: activeNode.id,
      nodeName: activeNode.name,
      institution: activeNode.institution,
      currentRound: covenant.currentRound,
      stakedAmountCOV: activeNode.stakeAmount,
      lifetimeRewardsCOV: activeNode.accumulatedRewards,
      shapleyContributionShare: activeNode.shapleyValue,
      merkleRoot: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timestamp: new Date().toISOString(),
      covenantArticlesAdherence: ['Article I Verified', 'Article II Computed', 'Article III Cleared', 'Article IV DP Bound', 'Article V Settled'],
    };

    const blob = new Blob([JSON.stringify(receiptData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fairc-receipt-${activeNode.id}-round-${covenant.currentRound}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Node Selector and Overview */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">
                Federated Node Operator Control & Staking Escrow
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Manage your edge compute node, stake COV tokens to satisfy Covenant Article III minimums, adjust private local training hyperparameters, and claim accrued Shapley rewards.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Acting as Node:</span>
            <select
              value={activeNodeId}
              onChange={(e) => setActiveNodeId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded p-2 text-xs font-mono focus:border-emerald-500"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Operator Financial & Staking Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Staked Collateral</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {activeNode.stakeAmount.toLocaleString()} <span className="text-xs text-amber-400 font-sans">COV</span>
          </div>
          <p className="text-xs text-slate-500">
            Covenant Requirement: ≥ {covenant.minStake.toLocaleString()} COV
          </p>

          <div className="pt-2 flex items-center gap-2">
            <input
              type="number"
              min="1000"
              step="1000"
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              className="w-28 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 font-mono focus:border-emerald-500"
            />
            <button
              onClick={() => handleStake(Number(stakeInput) || 1000)}
              className="flex-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded transition-colors whitespace-nowrap"
            >
              Add Stake
            </button>
          </div>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Claimable Shapley Rewards</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {activeNode.accumulatedRewards.toLocaleString()} <span className="text-xs text-slate-400 font-sans">COV</span>
          </div>
          <p className="text-xs text-slate-500">
            Current Round Share: {(activeNode.shapleyValue * 100).toFixed(1)}%
          </p>

          <div className="pt-2">
            <button
              onClick={handleClaim}
              disabled={activeNode.accumulatedRewards <= 0}
              className="w-full px-4 py-1.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 text-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Claim Accrued Payout</span>
            </button>
          </div>
          {showClaimSuccess && (
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>Disbursed to node sovereign address</span>
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Node Reputation Score</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
            {activeNode.reputationScore} <span className="text-xs text-slate-400 font-sans">/ 100</span>
          </div>
          <p className="text-xs text-slate-500">
            Uptime: 99.8% · Gradient Drift: Nominal
          </p>

          <div className="pt-2">
            <button
              onClick={downloadReceipt}
              className="w-full px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Proof Receipt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Local Edge Hyperparameter Controls */}
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Local Edge Training Engine Configuration
          </h3>
          <p className="text-xs text-slate-400">
            Calculated on-premise without exposing private raw patient or financial tensors (Article I).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
            <label className="text-slate-400 font-sans block">Local Epochs per Round</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="10"
                value={localEpochs}
                onChange={(e) => setLocalEpochs(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <span className="text-white font-bold w-6">{localEpochs}</span>
            </div>
            <span className="text-[10px] text-slate-500">Prevents client drift in non-IID regimes</span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
            <label className="text-slate-400 font-sans block">Learning Rate (η)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.0005"
                min="0.0001"
                max="0.05"
                value={learningRate}
                onChange={(e) => setLearningRate(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded text-xs"
              />
            </div>
            <span className="text-[10px] text-slate-500">AdamW with weight decay 0.01</span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
            <label className="text-slate-400 font-sans block">Differential Privacy Noise (σ)</label>
            <div className="text-emerald-400 font-bold text-sm">
              {(Math.sqrt(2 * Math.log(1.25 / 1e-5)) / covenant.epsilonDP).toFixed(3)} (Calibrated)
            </div>
            <span className="text-[10px] text-slate-500">Automated by Covenant ε = {covenant.epsilonDP}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
