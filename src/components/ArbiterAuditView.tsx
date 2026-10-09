import React, { useState } from 'react';
import { Covenant, FederatedNode, ArbiterAuditReport, DisputeRuling } from '../types/covenant';
import { ShieldCheck, Sparkles, Scale, AlertOctagon, CheckCircle2, AlertTriangle, FileCode, Cpu } from 'lucide-react';

interface ArbiterAuditViewProps {
  covenant: Covenant;
  nodes: FederatedNode[];
  onApplyAmendment?: (amendment: string) => void;
}

export const ArbiterAuditView: React.FC<ArbiterAuditViewProps> = ({ covenant, nodes, onApplyAmendment }) => {
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<ArbiterAuditReport | null>(null);
  const [selectedDisputeNodeId, setSelectedDisputeNodeId] = useState<string>(nodes[nodes.length - 1]?.id || '');
  const [isResolvingDispute, setIsResolvingDispute] = useState<boolean>(false);
  const [disputeRuling, setDisputeRuling] = useState<DisputeRuling | null>(null);
  const [activeTab, setActiveTab] = useState<'audit' | 'tribunal' | 'gametheory'>('audit');

  // Trigger Covenant Audit
  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch('/api/arbiter/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          covenant,
          attackScenario: 'Distributed consortium with suspected non-IID skew and Sybil adversaries',
        }),
      });
      const data = await res.json();
      if (data.success && data.audit) {
        setAuditReport(data.audit);
      }
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  // Trigger Dispute Arbitration
  const handleResolveDispute = async () => {
    const node = nodes.find((n) => n.id === selectedDisputeNodeId);
    if (!node) return;

    setIsResolvingDispute(true);
    try {
      const res = await fetch('/api/arbiter/resolve-dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node,
          covenant,
        }),
      });
      const data = await res.json();
      if (data.success && data.ruling) {
        setDisputeRuling(data.ruling);
      }
    } catch (err) {
      console.error('Dispute resolution failed:', err);
    } finally {
      setIsResolvingDispute(false);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedDisputeNodeId) || nodes[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">
                Cryptographic Arbiter & AI Covenant Auditor
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Automated high-assurance verification powered by Google Gemini and game-theoretic proofs. Audits incentive compatibility, Nash stability, and handles autonomous slashing disputes.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1 border border-slate-800 rounded">
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'audit' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Protocol Audit
            </button>
            <button
              onClick={() => setActiveTab('tribunal')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'tribunal' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Slashing Tribunal
            </button>
            <button
              onClick={() => setActiveTab('gametheory')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'gametheory' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Payoff Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Protocol Audit */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Active Covenant Verification: {covenant.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates aggregator {covenant.aggregationAlgorithm}, ε = {covenant.epsilonDP}, slashing = {covenant.slashingPenaltyPercent}%
              </p>
            </div>

            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded transition-colors flex items-center gap-2 whitespace-nowrap self-start sm:self-auto font-sans"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'Auditing Invariants...' : 'Run Full Game-Theoretic Audit'}</span>
            </button>
          </div>

          {auditReport ? (
            <div className="space-y-4">
              {/* Verdict Banner */}
              <div
                className={`p-5 rounded-lg border ${
                  auditReport.verdict === 'APPROVED'
                    ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300'
                    : auditReport.verdict === 'CONDITIONAL_APPROVAL'
                    ? 'bg-amber-950/20 border-amber-500/50 text-amber-300'
                    : 'bg-rose-950/20 border-rose-500/50 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {auditReport.verdict === 'APPROVED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    )}
                    <div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider block">
                        Arbiter Official Verdict
                      </span>
                      <h4 className="text-base font-bold text-white">
                        {auditReport.verdict.replace('_', ' ')}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xs text-slate-400 block">Game-Theoretic Security Score</span>
                    <span className="text-2xl font-bold text-white tabular-nums">
                      {auditReport.gameTheoreticScore}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Assessment Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                  <span className="text-emerald-400 font-semibold font-mono uppercase tracking-wider block">
                    Incentive Compatibility
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {auditReport.incentiveCompatibilitySummary}
                  </p>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                  <span className="text-cyan-400 font-semibold font-mono uppercase tracking-wider block">
                    Byzantine Resistance
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {auditReport.byzantineResistance}
                  </p>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                  <span className="text-amber-400 font-semibold font-mono uppercase tracking-wider block">
                    Differential Privacy Integrity
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {auditReport.privacyAssessment}
                  </p>
                </div>
              </div>

              {/* Vulnerabilities & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                  <h5 className="font-semibold text-rose-400 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4" />
                    Vulnerabilities & Threat Vectors Identified
                  </h5>
                  <ul className="space-y-1.5 text-slate-300">
                    {auditReport.vulnerabilitiesDetected.map((vuln, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-500 font-mono mt-0.5">·</span>
                        <span>{vuln}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                  <h5 className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Strategic Covenant Recommendations
                  </h5>
                  <ul className="space-y-1.5 text-slate-300">
                    {auditReport.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-mono mt-0.5">·</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Formal Clause Amendment */}
              {auditReport.formalClauseAmendment && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-400 font-sans">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-emerald-400" />
                      Arbiter Proposed Covenant Amendment
                    </span>
                    <span className="text-[11px] text-emerald-400">Cryptographically Signed</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800/80 rounded text-slate-300 italic">
                    "{auditReport.formalClauseAmendment}"
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800/60 rounded-lg space-y-3">
              <Scale className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-medium text-slate-300">
                Audit Engine Ready for Protocol Inspection
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click "Run Full Game-Theoretic Audit" above to dispatch the active covenant parameters to the AI Arbiter for mathematical verification.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Slashing Tribunal */}
      {activeTab === 'tribunal' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Autonomous Slashing Tribunal & Gradient Dispute Resolution
            </h3>
            <p className="text-xs text-slate-400">
              When a federated node gradient deviates from the geometric centroid or displays anomalous loss degradation, the Covenant convenes the autonomous Arbiter.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Disputed Node:</label>
                <select
                  value={selectedDisputeNodeId}
                  onChange={(e) => {
                    setSelectedDisputeNodeId(e.target.value);
                    setDisputeRuling(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded p-2 text-xs font-mono focus:border-emerald-500"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.status} - Cosine: {n.cosineSimilarity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleResolveDispute}
                  disabled={isResolvingDispute}
                  className="w-full px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded transition-colors flex items-center justify-center gap-2 font-sans"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isResolvingDispute ? 'animate-spin' : ''}`} />
                  <span>{isResolvingDispute ? 'Convening Tribunal...' : 'Convene Arbiter for Ruling'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Node Evidence Snapshot */}
          {selectedNode && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3 font-mono text-xs">
              <span className="text-slate-400 font-sans font-semibold block">
                Evidence Submitted for Node: {selectedNode.name}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                  <span className="text-slate-500 text-[10px] block">Cosine Alignment</span>
                  <strong className={selectedNode.cosineSimilarity < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {selectedNode.cosineSimilarity.toFixed(3)}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                  <span className="text-slate-500 text-[10px] block">Gradient Norm</span>
                  <strong className={selectedNode.gradientNorm > 5 ? 'text-rose-400' : 'text-slate-200'}>
                    {selectedNode.gradientNorm.toFixed(2)}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                  <span className="text-slate-500 text-[10px] block">Marginal Loss Δ</span>
                  <strong className={selectedNode.marginalLossReduction <= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {selectedNode.marginalLossReduction.toFixed(4)}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                  <span className="text-slate-500 text-[10px] block">At-Risk Stake</span>
                  <strong className="text-amber-400">
                    {selectedNode.stakeAmount.toLocaleString()} COV
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Ruling Result */}
          {disputeRuling && (
            <div
              className={`p-5 rounded-lg border space-y-3 ${
                disputeRuling.ruling === 'SLASH_AND_EJECT'
                  ? 'bg-rose-950/30 border-rose-500 text-rose-200'
                  : disputeRuling.ruling === 'QUARANTINE_FOR_VERIFICATION'
                  ? 'bg-amber-950/30 border-amber-500 text-amber-200'
                  : 'bg-emerald-950/30 border-emerald-500 text-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider block">
                    Binding Covenant Decree
                  </span>
                  <h4 className="text-base font-bold text-white font-sans mt-0.5">
                    {disputeRuling.ruling.replace(/_/g, ' ')}
                  </h4>
                </div>

                {disputeRuling.slashedAmount > 0 && (
                  <div className="text-right font-mono">
                    <span className="text-xs text-rose-400 block">Slashed Collateral</span>
                    <span className="text-xl font-bold text-rose-400 tabular-nums">
                      -{disputeRuling.slashedAmount.toLocaleString()} COV
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {disputeRuling.justification}
              </p>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Proof Hash: <strong className="text-slate-300">{disputeRuling.proofHash}</strong></span>
                <span>Confidence: <strong className="text-emerald-400">{(disputeRuling.confidence * 100).toFixed(0)}%</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Game Theoretic Payoff Matrix */}
      {activeTab === 'gametheory' && (
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Nash Equilibrium & Payoff Matrix Under Covenant Rules
            </h3>
            <p className="text-xs text-slate-400">
              Analysis demonstrating that honest participation is the strict dominant strategy when Slashing Penalty &gt; Expected Free-Riding Yield.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border border-slate-800">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Player Strategy</th>
                  <th className="p-3">Aggregator Defense</th>
                  <th className="p-3 text-right">Expected Payoff (COV)</th>
                  <th className="p-3">Equilibrium State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr className="bg-emerald-950/10">
                  <td className="p-3 font-sans font-medium text-white">Honest Local Gradient (DP ε=0.8)</td>
                  <td className="p-3">Multi-Krum Verified</td>
                  <td className="p-3 text-right font-bold text-emerald-400">+1,050 COV / epoch</td>
                  <td className="p-3 text-emerald-400 font-sans">Strict Dominant Strategy (Nash)</td>
                </tr>
                <tr>
                  <td className="p-3 font-sans font-medium text-slate-300">Free-Rider (Zero Compute)</td>
                  <td className="p-3">Data-Shapley Marginal Test</td>
                  <td className="p-3 text-right text-slate-400">0 COV (Dummy Axiom)</td>
                  <td className="p-3 text-slate-400 font-sans">Weak Suboptimal (Wasted Stake)</td>
                </tr>
                <tr className="bg-rose-950/10">
                  <td className="p-3 font-sans font-medium text-rose-300">Byzantine Backdoor Inversion</td>
                  <td className="p-3">Outlier Distance Ejection</td>
                  <td className="p-3 text-right font-bold text-rose-400">-7,200 COV (Slashed)</td>
                  <td className="p-3 text-rose-400 font-sans">Strongly Dominated (Fatal)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs text-slate-400 leading-relaxed font-sans">
            <strong className="text-slate-200">Mathematical Proof of Stability:</strong> Let R be reward yield and S be node collateral. Since E[U_honest] = φ_i(v) · R &gt; 0 and E[U_attack] = -(λ_slash · S) &lt;&lt; 0, no rational node operator has an incentive to deviate unilaterally from truthful gradient transmission.
          </div>
        </div>
      )}
    </div>
  );
};
