import React, { useState, useEffect, useRef } from 'react';
import { Covenant, FederatedNode, TrainingRound, ByzantineAttackConfig, DisputeRuling } from './types/covenant';
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
  const roundBusyRef = useRef(false);
  const nodesRef = useRef(nodes);
  const covenantsRef = useRef(covenants);
  const attackConfigRef = useRef(attackConfig);
  nodesRef.current = nodes;
  covenantsRef.current = covenants;
  attackConfigRef.current = attackConfig;

  // Execute a Single Federated Learning Round
  const executeRoundStep = () => {
    if (roundBusyRef.current) return;
    roundBusyRef.current = true;
    setIsSimulating(true);
    const roundCovenantId = activeCovenant.id;
    const initialStatuses = new Map(nodesRef.current.map((node) => [node.id, node.status]));

    // Phase 1: Broadcast
    setSimulationPhase(1);

    setTimeout(() => {
      // Phase 2: Local Edge Training
      setSimulationPhase(2);

      setTimeout(() => {
        // Phase 3: Byzantine Defense Check
        setSimulationPhase(3);

        // Update node telemetry according to attack config
        const currentAttack = attackConfigRef.current;
        const updatedNodes = nodesRef.current.map((node) => {
          if (node.status === 'Slashed') return node;
          if (node.id === currentAttack.targetNodeId) {
            if (currentAttack.type === 'label-flip') {
              return {
                ...node,
                isAdversary: true,
                adversaryType: 'label-flip' as const,
                cosineSimilarity: -0.45,
                gradientNorm: 8.2,
                marginalLossReduction: -0.05,
              };
            } else if (currentAttack.type === 'free-rider') {
              return {
                ...node,
                isAdversary: true,
                adversaryType: 'free-rider' as const,
                cosineSimilarity: 0.05,
                gradientNorm: 0.02,
                marginalLossReduction: 0.0,
              };
            } else if (currentAttack.type === 'gradient-explosion') {
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

        setTimeout(() => {
          // Phase 4: Shapley Settlement
          setSimulationPhase(4);

          const roundCovenant = covenantsRef.current.find((c) => c.id === roundCovenantId)!;
          const telemetryById = new Map(updatedNodes.map((node) => [node.id, node]));
          const mergeTelemetry = (currentNodes: FederatedNode[]) => currentNodes.map((node) => {
            const telemetry = telemetryById.get(node.id);
            if (!telemetry || node.status === 'Slashed') return node;
            return {
              ...node,
              isAdversary: telemetry.isAdversary,
              adversaryType: telemetry.adversaryType,
              cosineSimilarity: telemetry.cosineSimilarity,
              gradientNorm: telemetry.gradientNorm,
              marginalLossReduction: telemetry.marginalLossReduction,
            };
          });
          const settlementNodes = mergeTelemetry(nodesRef.current);
          const defenseResult = filterByzantineGradients(
            settlementNodes.filter((node) => node.status !== 'Slashed'),
            roundCovenant.aggregationAlgorithm
          );
          const slashedIds = new Set(defenseResult.slashedNodes.map((node) => node.id));
          const flaggedIds = new Set(defenseResult.flaggedNodes.map((node) => node.id));
          const shapleyScores = computeMonteCarloShapley(
            settlementNodes.filter((node) => node.status !== 'Slashed' && !slashedIds.has(node.id)),
            100
          );

          const stateHashes = new Map(settlementNodes.map((node) => [
            node.id,
            '0x' + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          ]));
          const settleNode = (node: FederatedNode) => {
            const isSlashed = slashedIds.has(node.id);
            const newlyQuarantined = node.status === 'Flagged' && initialStatuses.get(node.id) !== 'Flagged';
            const isFlagged = flaggedIds.has(node.id) || newlyQuarantined;

            let status = node.status;
            let currentStake = node.stakeAmount;
            let currentSlashed = node.slashedLosses;
            let earnedInRound = 0;
            const nodeShapley = isSlashed || node.status === 'Slashed' ? 0 : shapleyScores[node.id]?.shapleyValue || 0;
            let penalty = 0;

            if (node.status === 'Slashed') {
              status = 'Slashed';
            } else if (isSlashed) {
              status = 'Slashed' as const;
              const requestedPenalty = Math.round(currentStake * (roundCovenant.slashingPenaltyPercent / 100));
              penalty = Number.isFinite(requestedPenalty)
                ? Math.min(Math.max(0, currentStake), Math.max(0, requestedPenalty))
                : 0;
              currentStake -= penalty;
              currentSlashed += penalty;
            } else if (isFlagged) {
              status = 'Flagged' as const;
              earnedInRound = Math.round(nodeShapley * 1500); // reduced reward
            } else {
              status = 'Verified' as const;
              earnedInRound = Math.round(nodeShapley * 3500);
            }

            return {
              node: {
                ...node,
                status,
                stakeAmount: currentStake,
                slashedLosses: currentSlashed,
                shapleyValue: nodeShapley,
                accumulatedRewards: node.accumulatedRewards + earnedInRound,
                lastStateHash: stateHashes.get(node.id) || node.lastStateHash,
              },
              earnedInRound,
              penalty,
            };
          };
          const settlements = settlementNodes.map(settleNode);
          const totalSlashedCOV = settlements.reduce((sum, result) => sum + result.penalty, 0);
          const totalRewards = settlements.reduce((sum, result) => sum + result.earnedInRound, 0);

          setNodes((prev) => mergeTelemetry(prev).map((node) => settleNode(node).node));

          // Update active covenant stats
          const nextRoundNumber = roundCovenant.currentRound + 1;
          const lossDelta = -(0.003 + Math.random() * 0.004);
          const accDelta = +(0.002 + Math.random() * 0.003);

          const newLoss = Math.max(0.04, roundCovenant.globalLoss + lossDelta);
          const newAcc = Math.min(0.995, roundCovenant.globalAccuracy + accDelta);

          setCovenants((prev) => prev.map((c) =>
            c.id === roundCovenantId
              ? {
                  ...c,
                  currentRound: c.currentRound + 1,
                  globalLoss: Number(Math.max(0.04, c.globalLoss + lossDelta).toFixed(4)),
                  globalAccuracy: Number(Math.min(0.995, c.globalAccuracy + accDelta).toFixed(4)),
                  allocatedRewards: c.allocatedRewards + totalRewards,
                }
              : c
          ));

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
            rewardDistributedCOV: totalRewards,
            merkleRoot: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            auditPassed: true,
            nodeSnapshots: settlements.map(({ node: fn, earnedInRound }) => ({
              nodeId: fn.id,
              shapleyShare: fn.shapleyValue,
              rewardEarned: earnedInRound,
              status: fn.status,
              cosineSim: fn.cosineSimilarity,
              gradientNorm: fn.gradientNorm,
            })),
          };

          setRecentRounds((prev) => [newRoundRecord, ...prev.slice(0, 9)]);

          setTimeout(() => {
            setSimulationPhase(0);
            roundBusyRef.current = false;
            setIsSimulating(false);
          }, 800);
        }, 800);
      }, 800);
    }, 800);
  };
  const executeRoundStepRef = useRef(executeRoundStep);
  executeRoundStepRef.current = executeRoundStep;

  // Auto-loop execution
  useEffect(() => {
    if (isRunningAuto) {
      autoLoopTimerRef.current = setInterval(() => {
        executeRoundStepRef.current();
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
  }, [isRunningAuto]);

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
    setCovenants((prev) => [newCov, ...prev]);
    setActiveCovenantId(newCov.id);
  };

  const handleRequestDispute = (node: FederatedNode) => {
    setSelectedNodeId(node.id);
    setActiveTab('arbiter');
  };

  const handleApplyRuling = (nodeId: string, ruling: DisputeRuling) => {
    setNodes((prev) => prev.map((node) => {
      if (node.id !== nodeId || node.status === 'Slashed') return node;
      if (ruling.ruling === 'SLASH_AND_EJECT') {
        const availableStake = Number.isFinite(node.stakeAmount) ? Math.max(0, node.stakeAmount) : 0;
        const penalty = Number.isFinite(ruling.slashedAmount)
          ? Math.min(availableStake, Math.max(0, ruling.slashedAmount))
          : 0;
        return {
          ...node,
          status: 'Slashed',
          stakeAmount: availableStake - penalty,
          slashedLosses: node.slashedLosses + penalty,
          shapleyValue: 0,
        };
      }
      if (ruling.ruling === 'QUARANTINE_FOR_VERIFICATION') return { ...node, status: 'Flagged' };
      if (ruling.ruling === 'BENIGN_VARIATION_ACCEPT') return { ...node, status: 'Verified' };
      return node;
    }));
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
            initialNodeId={selectedNodeId ?? undefined}
            onApplyRuling={handleApplyRuling}
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
