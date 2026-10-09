import React, { useState, useEffect, useRef } from 'react';
import { Covenant, FederatedNode, TrainingRound, ByzantineAttackConfig } from './types/covenant';
import { INITIAL_COVENANTS, INITIAL_NODES, INITIAL_ROUNDS_HISTORY } from './utils/mockFederatedData';
import { filterByzantineGradients, computeMonteCarloShapley } from './utils/shapley';
import { TopNavigation } from './components/TopNavigation';
import { TrainingCockpit } from './components/TrainingCockpit';
import { ShapleyEngineView } from './components/ShapleyEngineView';
import { CovenantCharterView } from './components/CovenantCharterView';
import { ArbiterAuditView } from './components/ArbiterAuditView';
import { NodeOperatorPortal } from './components/NodeOperatorPortal';
import { Shield } from 'lucide-react';

export default function App() {
  const [covenants, setCovenants] = useState<Covenant[]>(INITIAL_COVENANTS);
  const [activeCovenantId, setActiveCovenantId] = useState<string>(INITIAL_COVENANTS[0].id);
  const [nodes, setNodes] = useState<FederatedNode[]>(INITIAL_NODES);
  const [recentRounds, setRecentRounds] = useState<TrainingRound[]>(INITIAL_ROUNDS_HISTORY);
  
  const [activeTab, setActiveTab] = useState<'cockpit' | 'shapley' | 'covenant' | 'arbiter' | 'operator'>('cockpit');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [simulationPhase, setSimulationPhase] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isRunningAuto, setIsRunningAuto] = useState<boolean>(false);

  const [attackConfig, setAttackConfig] = useState<ByzantineAttackConfig>({
    type: 'none',
    targetNodeId: 'node-adversary-06',
    intensity: 0.8,
  });

  const activeCovenant = covenants.find((c) => c.id === activeCovenantId) || covenants[0];
  const autoLoopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Execute a Single Federated Learning Round
  const executeRoundStep = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    // Phase 1: Broadcast
    setSimulationPhase(1);

    setTimeout(() => {
      // Phase 2: Local Edge Training
      setSimulationPhase(2);

      setTimeout(() => {
        // Phase 3: Byzantine Defense Check
        setSimulationPhase(3);

        // Update node telemetry according to attack config
        const updatedNodes = nodes.map((node) => {
          if (node.id === 'node-adversary-06') {
            if (attackConfig.type === 'label-flip') {
              return {
                ...node,
                isAdversary: true,
                adversaryType: 'label-flip' as const,
                cosineSimilarity: -0.45,
                gradientNorm: 8.2,
                marginalLossReduction: -0.05,
              };
            } else if (attackConfig.type === 'free-rider') {
              return {
                ...node,
                isAdversary: true,
                adversaryType: 'free-rider' as const,
                cosineSimilarity: 0.05,
                gradientNorm: 0.02,
                marginalLossReduction: 0.0,
              };
            } else if (attackConfig.type === 'gradient-explosion') {
              return {
                ...node,
                isAdversary: true,
                adversaryType: 'gradient-explosion' as const,
                cosineSimilarity: 0.1,
                gradientNorm: 22.4,
                marginalLossReduction: -0.08,
              };
            } else {
              // Honest
              return {
                ...node,
                isAdversary: false,
                cosineSimilarity: 0.72,
                gradientNorm: 1.5,
                marginalLossReduction: 0.012,
              };
            }
          }
          // Slight natural jitter on honest nodes
          const jitter = (Math.random() - 0.5) * 0.02;
          return {
            ...node,
            gradientNorm: Math.max(0.5, node.gradientNorm + jitter),
            cosineSimilarity: Math.min(0.99, Math.max(0.65, node.cosineSimilarity + jitter)),
          };
        });

        const defenseResult = filterByzantineGradients(updatedNodes, activeCovenant.aggregationAlgorithm);

        setTimeout(() => {
          // Phase 4: Shapley Settlement
          setSimulationPhase(4);

          // Calculate Shapley values for accepted nodes
          const shapleyScores = computeMonteCarloShapley(updatedNodes, 100);

          let totalSlashedCOV = 0;
          const finalNodes = updatedNodes.map((node) => {
            const isSlashed = defenseResult.slashedNodes.some((sn) => sn.id === node.id);
            const isFlagged = defenseResult.flaggedNodes.some((fn) => fn.id === node.id);

            let status = node.status;
            let currentStake = node.stakeAmount;
            let currentSlashed = node.slashedLosses;
            let earnedInRound = 0;
            const nodeShapley = isSlashed ? 0 : shapleyScores[node.id]?.shapleyValue || 0;

            if (isSlashed) {
              status = 'Slashed' as const;
              const penalty = Math.round(currentStake * (activeCovenant.slashingPenaltyPercent / 100));
              currentStake = Math.max(1000, currentStake - penalty);
              currentSlashed += penalty;
              totalSlashedCOV += penalty;
            } else if (isFlagged) {
              status = 'Flagged' as const;
              earnedInRound = Math.round(nodeShapley * 1500); // reduced reward
            } else {
              status = 'Verified' as const;
              earnedInRound = Math.round(nodeShapley * 3500);
            }

            return {
              ...node,
              status,
              stakeAmount: currentStake,
              slashedLosses: currentSlashed,
              shapleyValue: nodeShapley,
              accumulatedRewards: node.accumulatedRewards + earnedInRound,
              lastStateHash: '0x' + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            };
          });

          setNodes(finalNodes);

          // Update active covenant stats
          const nextRoundNumber = activeCovenant.currentRound + 1;
          const lossDelta = -(0.003 + Math.random() * 0.004);
          const accDelta = +(0.002 + Math.random() * 0.003);

          const newLoss = Math.max(0.04, activeCovenant.globalLoss + lossDelta);
          const newAcc = Math.min(0.995, activeCovenant.globalAccuracy + accDelta);

          const updatedCovenants = covenants.map((c) =>
            c.id === activeCovenant.id
              ? {
                  ...c,
                  currentRound: nextRoundNumber,
                  globalLoss: Number(newLoss.toFixed(4)),
                  globalAccuracy: Number(newAcc.toFixed(4)),
                  allocatedRewards: c.allocatedRewards + 3500,
                }
              : c
          );
          setCovenants(updatedCovenants);

          // Append round record
          const newRoundRecord: TrainingRound = {
            roundNumber: nextRoundNumber,
            timestamp: new Date().toLocaleTimeString(),
            globalLoss: Number(newLoss.toFixed(4)),
            lossDelta: Number(lossDelta.toFixed(4)),
            globalAccuracy: Number(newAcc.toFixed(4)),
            accuracyDelta: Number(accDelta.toFixed(4)),
            activeNodesCount: defenseResult.acceptedNodes.length,
            byzantineDetectedCount: defenseResult.slashedNodes.length,
            slashedTotalCOV: totalSlashedCOV,
            rewardDistributedCOV: 3500,
            merkleRoot: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            auditPassed: true,
            nodeSnapshots: finalNodes.map((fn) => ({
              nodeId: fn.id,
              shapleyShare: fn.shapleyValue,
              rewardEarned: Math.round(fn.shapleyValue * 3500),
              status: fn.status,
              cosineSim: fn.cosineSimilarity,
              gradientNorm: fn.gradientNorm,
            })),
          };

          setRecentRounds([newRoundRecord, ...recentRounds.slice(0, 9)]);

          setTimeout(() => {
            setSimulationPhase(0);
            setIsSimulating(false);
          }, 800);
        }, 800);
      }, 800);
    }, 800);
  };

  // Auto-loop execution
  useEffect(() => {
    if (isRunningAuto) {
      autoLoopTimerRef.current = setInterval(() => {
        executeRoundStep();
      }, 4000);
    } else {
      if (autoLoopTimerRef.current) {
        clearInterval(autoLoopTimerRef.current);
      }
    }

    return () => {
      if (autoLoopTimerRef.current) {
        clearInterval(autoLoopTimerRef.current);
      }
    };
  }, [isRunningAuto, activeCovenant, nodes, isSimulating, attackConfig]);

  const handleUpdateNodeStake = (nodeId: string, deltaStake: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, stakeAmount: n.stakeAmount + deltaStake } : n))
    );
  };

  const handleClaimRewards = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, accumulatedRewards: 0 } : n))
    );
  };

  const handleCreateCovenant = (newCov: Covenant) => {
    setCovenants([newCov, ...covenants]);
    setActiveCovenantId(newCov.id);
  };

  const handleRequestDispute = (node: FederatedNode) => {
    setSelectedNodeId(node.id);
    setActiveTab('arbiter');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Top Navigation Contract */}
      <TopNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRound={activeCovenant.currentRound}
        isRunningAuto={isRunningAuto}
        onToggleAuto={() => setIsRunningAuto(!isRunningAuto)}
        onStepRound={executeRoundStep}
        isSimulating={isSimulating}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'cockpit' && (
          <TrainingCockpit
            covenant={activeCovenant}
            nodes={nodes}
            recentRounds={recentRounds}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            simulationPhase={simulationPhase}
            attackConfig={attackConfig}
            onUpdateAttack={setAttackConfig}
            onStepRound={executeRoundStep}
            isSimulating={isSimulating}
            onRequestDispute={handleRequestDispute}
          />
        )}

        {activeTab === 'shapley' && (
          <ShapleyEngineView
            nodes={nodes}
            covenant={activeCovenant}
          />
        )}

        {activeTab === 'covenant' && (
          <CovenantCharterView
            covenants={covenants}
            activeCovenantId={activeCovenantId}
            onSelectCovenant={setActiveCovenantId}
            onCreateCovenant={handleCreateCovenant}
          />
        )}

        {activeTab === 'arbiter' && (
          <ArbiterAuditView
            covenant={activeCovenant}
            nodes={nodes}
          />
        )}

        {activeTab === 'operator' && (
          <NodeOperatorPortal
            nodes={nodes}
            covenant={activeCovenant}
            onUpdateNodeStake={handleUpdateNodeStake}
            onClaimRewards={handleClaimRewards}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-300">
              Federated AI Rewards Covenant Protocol
            </span>
            <span>·</span>
            <span>v2.4-Sovereign</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Aggregator: {activeCovenant.aggregationAlgorithm}</span>
            <span>·</span>
            <span>Shapley Engine: Monte Carlo Data-Shapley</span>
            <span>·</span>
            <span>Zero-Knowledge Proofs: Enforced</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
