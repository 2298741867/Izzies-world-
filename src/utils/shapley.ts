import { FederatedNode, AggregationAlgorithm, ValuationMetric } from '../types/covenant';

/**
 * Utility to evaluate utility function v(S) for a coalition of nodes S
 * The utility represents the simulated validation accuracy gain of the joint model.
 */
export function evaluateCoalitionUtility(nodes: FederatedNode[]): number {
  if (nodes.length === 0) return 0;

  // Base utility factors:
  // 1. Diminishing returns on sample count (square root law of statistical learning)
  const totalEffectiveSamples = nodes.reduce((acc, n) => {
    // If node is an adversary performing label-flip, it actively reduces utility
    if (n.isAdversary && n.adversaryType === 'label-flip') {
      return acc - n.sampleCount * 0.8;
    }
    // Free rider adds zero real signal
    if (n.isAdversary && n.adversaryType === 'free-rider') {
      return acc + 10;
    }
    return acc + n.sampleCount * n.dataQualityScore;
  }, 0);

  const effectiveSamples = Math.max(0, totalEffectiveSamples);
  const sampleUtility = 0.55 * (1 - Math.exp(-effectiveSamples / 15000));

  // 2. Diversity coverage bonus (unique non-IID entropy coverage)
  const avgDiversity = nodes.reduce((acc, n) => acc + n.nonIidDiversity, 0) / nodes.length;
  const diversityBonus = 0.35 * Math.min(1, avgDiversity * (1 + Math.log10(nodes.length)));

  // 3. Penalty for outlier gradient norm divergence
  const avgNorm = nodes.reduce((acc, n) => acc + n.gradientNorm, 0) / nodes.length;
  const stabilityFactor = avgNorm > 5.0 ? Math.max(0.2, 1 - (avgNorm - 5.0) * 0.15) : 1.0;

  return Math.min(0.99, (sampleUtility + diversityBonus) * stabilityFactor);
}

/**
 * Monte Carlo Shapley approximation
 * Computes marginal contributions across M random permutations
 */
export function computeMonteCarloShapley(
  nodes: FederatedNode[],
  numPermutations: number = 200
): { [nodeId: string]: { shapleyValue: number; variance: number; rawUtility: number } } {
  const nodeCount = nodes.length;
  const contributions: { [nodeId: string]: number[] } = {};

  nodes.forEach((n) => {
    contributions[n.id] = [];
  });

  for (let m = 0; m < numPermutations; m++) {
    // Generate random permutation of indices
    const perm = [...nodes];
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    const coalition: FederatedNode[] = [];
    let prevUtility = 0;

    for (let i = 0; i < nodeCount; i++) {
      const currentNode = perm[i];
      coalition.push(currentNode);
      const newUtility = evaluateCoalitionUtility(coalition);
      const marginalContribution = Math.max(-0.2, newUtility - prevUtility);
      contributions[currentNode.id].push(marginalContribution);
      prevUtility = newUtility;
    }
  }

  // Calculate mean and variance
  const results: { [nodeId: string]: { shapleyValue: number; variance: number; rawUtility: number } } = {};
  let totalPositiveShapley = 0;

  nodes.forEach((node) => {
    const values = contributions[node.id];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;

    // Floor negative contributions to 0 for reward allocation purposes (slashing handled separately)
    const normalizedMarginal = Math.max(0, mean);
    totalPositiveShapley += normalizedMarginal;

    results[node.id] = {
      shapleyValue: normalizedMarginal,
      variance,
      rawUtility: mean,
    };
  });

  // Normalize into proportion of 1.0
  if (totalPositiveShapley > 0) {
    nodes.forEach((node) => {
      results[node.id].shapleyValue = Number((results[node.id].shapleyValue / totalPositiveShapley).toFixed(4));
    });
  } else {
    // Equal fallback if all non-positive
    const equalShare = 1 / nodes.length;
    nodes.forEach((node) => {
      results[node.id].shapleyValue = Number(equalShare.toFixed(4));
    });
  }

  return results;
}

/**
 * Compares reward shares across 3 different allocation models:
 * 1. Data-Shapley (fair cooperative marginal utility)
 * 2. Volume-Proportional (vulnerable to junk-data flood)
 * 3. Equal-Split (vulnerable to Sybil farming)
 */
export function compareRewardAllocationModels(nodes: FederatedNode[]): {
  nodeId: string;
  name: string;
  shapleyShare: number;
  volumeShare: number;
  equalShare: number;
  isAdversary: boolean;
}[] {
  const shapleyResults = computeMonteCarloShapley(nodes, 120);
  const totalVolume = nodes.reduce((sum, n) => sum + n.sampleCount, 0);
  const equalFraction = 1 / nodes.length;

  return nodes.map((n) => {
    return {
      nodeId: n.id,
      name: n.name,
      shapleyShare: shapleyResults[n.id]?.shapleyValue || 0,
      volumeShare: totalVolume > 0 ? Number((n.sampleCount / totalVolume).toFixed(4)) : equalFraction,
      equalShare: Number(equalFraction.toFixed(4)),
      isAdversary: n.isAdversary,
    };
  });
}

/**
 * Byzantine Filtering and Aggregator Defense
 * Evaluates node gradients against defense protocols
 */
export function filterByzantineGradients(
  nodes: FederatedNode[],
  algorithm: AggregationAlgorithm
): {
  acceptedNodes: FederatedNode[];
  flaggedNodes: FederatedNode[];
  slashedNodes: FederatedNode[];
  consensusCosineSim: number;
} {
  const accepted: FederatedNode[] = [];
  const flagged: FederatedNode[] = [];
  const slashed: FederatedNode[] = [];

  // 1. Median gradient norm calculation
  const norms = nodes.map((n) => n.gradientNorm).sort((a, b) => a - b);
  const medianNorm = norms[Math.floor(norms.length / 2)] || 1.5;

  nodes.forEach((node) => {
    let isMalicious = false;
    let isSuspicious = false;

    // Check cosine alignment and norm thresholds
    if (algorithm === 'FedAvg') {
      // FedAvg has no defense; accepts everything unless norm is extreme
      if (node.gradientNorm > 15.0) {
        isMalicious = true;
      }
    } else if (algorithm === 'Multi-Krum') {
      // Multi-Krum: rejects candidates with distance far from geometric consensus
      if (node.cosineSimilarity < 0.1 || node.gradientNorm > medianNorm * 2.8) {
        isMalicious = true;
      } else if (node.cosineSimilarity < 0.35) {
        isSuspicious = true;
      }
    } else if (algorithm === 'Coordinate-wise Median') {
      // Median resists up to 50% coordinate corruption
      if (node.cosineSimilarity < -0.2 || node.gradientNorm > medianNorm * 3.5) {
        isMalicious = true;
      } else if (node.cosineSimilarity < 0.25) {
        isSuspicious = true;
      }
    } else if (algorithm === 'Trimmed-Mean') {
      // Trims top and bottom 20%
      if (node.cosineSimilarity < 0.0 || node.gradientNorm > medianNorm * 2.5) {
        isMalicious = true;
      } else if (node.cosineSimilarity < 0.3) {
        isSuspicious = true;
      }
    } else {
      // FedProx
      if (node.gradientNorm > medianNorm * 4.0 || node.cosineSimilarity < -0.1) {
        isMalicious = true;
      }
    }

    if (isMalicious || (node.isAdversary && node.adversaryType === 'label-flip')) {
      slashed.push({
        ...node,
        status: 'Slashed',
      });
    } else if (isSuspicious || (node.isAdversary && node.adversaryType === 'free-rider')) {
      flagged.push({
        ...node,
        status: 'Flagged',
      });
    } else {
      accepted.push({
        ...node,
        status: 'Verified',
      });
    }
  });

  const avgAcceptedCosine =
    accepted.length > 0
      ? accepted.reduce((sum, n) => sum + n.cosineSimilarity, 0) / accepted.length
      : 0;

  return {
    acceptedNodes: accepted,
    flaggedNodes: flagged,
    slashedNodes: slashed,
    consensusCosineSim: Number(avgAcceptedCosine.toFixed(3)),
  };
}
