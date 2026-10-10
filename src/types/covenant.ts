export type AggregationAlgorithm = 
  | 'FedAvg'
  | 'FedProx'
  | 'Multi-Krum'
  | 'Trimmed-Mean'
  | 'Coordinate-wise Median';

export type ValuationMetric = 
  | 'Data-Shapley'
  | 'Monte-Carlo Shapley'
  | 'Influence Function'
  | 'Dataset-Volume Proportional'
  | 'Equal-Split';

export type NodeStatus = 
  | 'Ready'
  | 'Training'
  | 'Submitting'
  | 'Verified'
  | 'Flagged'
  | 'Slashed';

export type NodeCategory = 
  | 'Healthcare'
  | 'Autonomous'
  | 'Finance'
  | 'Academic'
  | 'Sensor'
  | 'Adversarial';

export interface CovenantArticle {
  number: string;
  title: string;
  latinName: string;
  summary: string;
  formalEquation: string;
  specification: string;
}

export interface Covenant {
  id: string;
  name: string;
  domain: string;
  targetModel: string;
  description: string;
  rewardPool: number; // in COV
  allocatedRewards: number; // in COV
  aggregationAlgorithm: AggregationAlgorithm;
  valuationMetric: ValuationMetric;
  epsilonDP: number; // Differential Privacy epsilon
  deltaDP: number; // Differential Privacy delta (e.g. 1e-5)
  minStake: number; // in COV
  slashingPenaltyPercent: number; // e.g. 40%
  vestingEpochs: number; // Epochs before payout unlocked
  currentRound: number;
  totalNodes: number;
  globalAccuracy: number;
  globalLoss: number;
  status: 'Active' | 'Paused' | 'Finalized';
}

export interface FederatedNode {
  id: string;
  name: string;
  institution: string;
  region: string;
  category: NodeCategory;
  stakeAmount: number; // in COV
  computeTflops: number;
  sampleCount: number;
  dataQualityScore: number; // 0.0 - 1.0
  nonIidDiversity: number; // 0.0 - 1.0 (entropy)
  status: NodeStatus;
  gradientNorm: number;
  cosineSimilarity: number;
  marginalLossReduction: number;
  shapleyValue: number; // percentage of reward pool in round (0 - 1)
  accumulatedRewards: number; // COV earned
  slashedLosses: number; // COV lost to slashing
  reputationScore: number; // 0 - 100
  isAdversary: boolean;
  adversaryType?: 'free-rider' | 'label-flip' | 'gradient-explosion' | 'sybil';
  lastStateHash: string;
}

export interface TrainingRound {
  roundNumber: number;
  timestamp: string;
  globalLoss: number;
  lossDelta: number;
  globalAccuracy: number;
  accuracyDelta: number;
  activeNodesCount: number;
  byzantineDetectedCount: number;
  slashedTotalCOV: number;
  rewardDistributedCOV: number;
  merkleRoot: string;
  auditPassed: boolean;
  nodeSnapshots: {
    nodeId: string;
    shapleyShare: number;
    rewardEarned: number;
    status: NodeStatus;
    cosineSim: number;
    gradientNorm: number;
  }[];
}

export interface ByzantineAttackConfig {
  type: 'none' | 'free-rider' | 'label-flip' | 'gradient-explosion';
  targetNodeId: string;
  intensity: number; // 0.0 to 1.0
}

export interface TokenUsage {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  thinkingTokens?: number;
  model: string;
}

export interface ArbiterResponse {
  success: boolean;
  usage?: TokenUsage | null;
  source?: 'gemini' | 'covenant_heuristic_engine' | 'deterministic_arbiter';
  fallbackReason?: string;
  audit?: ArbiterAuditReport;
  ruling?: DisputeRuling;
}

export interface ArbiterAuditReport {
  verdict: 'APPROVED' | 'CONDITIONAL_APPROVAL' | 'REVISE_REQUIRED';
  gameTheoreticScore: number;
  incentiveCompatibilitySummary: string;
  byzantineResistance: string;
  privacyAssessment: string;
  vulnerabilitiesDetected: string[];
  recommendations: string[];
  formalClauseAmendment: string;
}

export interface DisputeRuling {
  ruling: 'SLASH_AND_EJECT' | 'BENIGN_VARIATION_ACCEPT' | 'QUARANTINE_FOR_VERIFICATION';
  justification: string;
  slashedAmount: number;
  confidence: number;
  proofHash: string;
}
