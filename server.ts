import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.use(express.json());

// Initialize Google GenAI client if key exists
const apiKey = process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenAI | null = null;
if (apiKey) {
  try {
    genAI = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI with key:', err);
  }
}

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(apiKey && genAI),
    timestamp: new Date().toISOString(),
  });
});

// Covenant Protocol Audit Endpoint
app.post('/api/arbiter/audit', async (req: Request, res: Response) => {
  const { covenant, attackScenario } = req.body;

  if (!covenant) {
    res.status(400).json({ error: 'Covenant parameters are required' });
    return;
  }

  const systemPrompt = `You are the chief cryptographic auditor and game-theoretic arbiter of the Federated AI Rewards Covenant protocol.
Evaluate the given federated covenant configuration for:
1. Incentive Compatibility: Does the reward allocation mechanism prevent free-riders and Sybil attacks?
2. Byzantine Fault Tolerance: Will the aggregation algorithm (${covenant.aggregationAlgorithm}) withstand adversarial poisoning under the current slashing rate (${covenant.slashingPenaltyPercent}%)?
3. Differential Privacy Guarantee: Is epsilon (${covenant.epsilonDP}) sufficient for privacy while maintaining gradient utility?
4. Mathematical Nash Equilibrium & Slashing Severity recommendation.

Provide your evaluation in JSON format with fields:
- verdict: "APPROVED" | "CONDITIONAL_APPROVAL" | "REVISE_REQUIRED"
- gameTheoreticScore: number (0-100)
- incentiveCompatibilitySummary: string (1-2 sentences)
- byzantineResistance: string (1-2 sentences)
- privacyAssessment: string (1-2 sentences)
- vulnerabilitiesDetected: string[]
- recommendations: string[]
- formalClauseAmendment: string (Formal mathematical or legal text snippet to append to Covenant)`;

  const userPrompt = `Audit this Covenant:
Name: ${covenant.name}
Domain: ${covenant.domain}
Model: ${covenant.targetModel}
Reward Pool: ${covenant.rewardPool} COV
Aggregation: ${covenant.aggregationAlgorithm}
Valuation Metric: ${covenant.valuationMetric}
Differential Privacy Epsilon: ${covenant.epsilonDP}
Min Stake: ${covenant.minStake} COV
Slashing Penalty: ${covenant.slashingPenaltyPercent}%
Simulated Attack Vector: ${attackScenario || 'Standard distributed consortium'}
`;

  if (genAI) {
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}\nOutput strictly valid JSON without code fences.` }] },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text || '{}';
      try {
        const parsed = JSON.parse(responseText);
        res.json({ success: true, source: 'gemini', audit: parsed });
        return;
      } catch {
        // Fall through to fallback parser
      }
    } catch (error) {
      console.warn('Gemini API call failed, using heuristic arbiter engine:', error);
    }
  }

  // Deterministic Game-Theoretic Fallback Arbiter
  const isKrumOrMedian = ['Multi-Krum', 'Coordinate-wise Median', 'Trimmed Mean'].includes(covenant.aggregationAlgorithm);
  const isShapley = covenant.valuationMetric.includes('Shapley');
  const isHighEpsilon = covenant.epsilonDP > 4.0;
  const isLowStake = covenant.minStake < 5000;

  const vulnerabilities: string[] = [];
  const recommendations: string[] = [];

  if (!isKrumOrMedian) {
    vulnerabilities.push('Vulnerable to coordinate-wise Byzantine poisoning: FedAvg lacks gradient distance bounds.');
    recommendations.push('Switch aggregation to Multi-Krum or Trimmed Mean to tolerate up to 33% malicious clients.');
  }
  if (!isShapley) {
    vulnerabilities.push('Free-rider vulnerability: Volume-based allocation rewards redundant data uploads without marginal gain.');
    recommendations.push('Enforce Truncated Data-Shapley with validation loss marginal delta checks.');
  }
  if (isHighEpsilon) {
    vulnerabilities.push(`High privacy leakage risk (ε = ${covenant.epsilonDP} > 3.0 permits membership inference reconstruction).`);
    recommendations.push('Cap local gradient clip norm C=1.0 and lower ε to ≤ 1.5 with Rényi DP tracking.');
  }
  if (isLowStake) {
    vulnerabilities.push('Low economic security: Minimum stake fails to deter Sybil identity splitting.');
    recommendations.push('Increase minimum stake requirement to at least 10,000 COV with a 30-round lockup period.');
  }

  const score = Math.max(30, 100 - vulnerabilities.length * 18);
  const verdict = score >= 80 ? 'APPROVED' : score >= 60 ? 'CONDITIONAL_APPROVAL' : 'REVISE_REQUIRED';

  res.json({
    success: true,
    source: 'covenant_heuristic_engine',
    audit: {
      verdict,
      gameTheoreticScore: score,
      incentiveCompatibilitySummary: isShapley
        ? 'Strict marginal Shapley payout creates a dominant strategy of truthful data contribution.'
        : 'Current payout allows free-riders to extract tokens without improving global model generalization.',
      byzantineResistance: isKrumOrMedian
        ? `${covenant.aggregationAlgorithm} provides robust protection against sign-flipping and gradient explosions.`
        : 'Lacks Byzantine protection; single malicious node can steer global update direction.',
      privacyAssessment: isHighEpsilon
        ? 'Privacy budget exceeds recommended bounds for sensitive federated consortia.'
        : `DP guarantee (ε = ${covenant.epsilonDP}) provably bounds adversary advantage under composition.`,
      vulnerabilitiesDetected: vulnerabilities.length > 0 ? vulnerabilities : ['None detected under standard honest-majority assumptions.'],
      recommendations: recommendations.length > 0 ? recommendations : ['Maintain current staking parameters and cadence.'],
      formalClauseAmendment: `Article III.Sec.4 Amendment: "Any client node submitting gradient vector g_i where ||g_i - μ_med||_2 > 2.5·σ shall forfeit ${covenant.slashingPenaltyPercent}% of stake to the Honest Aggregator Pool."`,
    },
  });
});

// Dispute Arbiter Endpoint
app.post('/api/arbiter/resolve-dispute', async (req: Request, res: Response) => {
  const { node, roundData, covenant } = req.body;

  if (!node) {
    res.status(400).json({ error: 'Node telemetry required' });
    return;
  }

  const isAnomalous = node.cosineSimilarity < 0.2 || node.gradientNorm > 8.0 || node.status === 'Flagged' || node.status === 'Slashed';

  if (genAI) {
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are the automated Arbiter of the Federated AI Rewards Covenant.
Examine this disputed node's gradient submission:
Node ID: ${node.id} (${node.name}, ${node.institution})
Cosine Similarity to Global Direction: ${node.cosineSimilarity}
Gradient Norm: ${node.gradientNorm} (Nominal range: 0.5 - 2.5)
Marginal Loss Drop: ${node.marginalLossReduction}
Current Stake: ${node.stakeAmount} COV
Covenant Slashing Rate: ${covenant?.slashingPenaltyPercent || 35}%

Determine if this is Byzantine poisoning, free-riding, or benign non-IID data skew.
Return strictly JSON with:
- ruling: "SLASH_AND_EJECT" | "BENIGN_VARIATION_ACCEPT" | "QUARANTINE_FOR_VERIFICATION"
- justification: string (2 sentences)
- slashedAmount: number
- confidence: number (0.0 to 1.0)
- proofHash: string (SHA256 representation)
`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({ success: true, source: 'gemini', ruling: parsed });
      return;
    } catch (err) {
      console.warn('Gemini dispute arbitration failed, using rule engine:', err);
    }
  }

  // Deterministic Arbiter Ruling
  let ruling = 'BENIGN_VARIATION_ACCEPT';
  let slashedAmount = 0;
  let justification = 'Gradient trajectory aligns with legitimate local non-IID data distribution. Submission accepted.';

  if (node.cosineSimilarity < -0.3 || node.gradientNorm > 10.0) {
    ruling = 'SLASH_AND_EJECT';
    slashedAmount = Math.round(node.stakeAmount * ((covenant?.slashingPenaltyPercent || 35) / 100));
    justification = `Severe gradient inversion and abnormal norm (${node.gradientNorm}) indicates coordinated Byzantine backdoor poisoning. Article III enforced.`;
  } else if (node.cosineSimilarity < 0.2 || node.marginalLossReduction <= 0) {
    ruling = 'QUARANTINE_FOR_VERIFICATION';
    slashedAmount = 0;
    justification = 'Gradient displays zero marginal utility or slight directional divergence. Quarantined for validation dataset re-scoring without slashing.';
  }

  const simulatedHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  res.json({
    success: true,
    source: 'deterministic_arbiter',
    ruling: {
      ruling,
      justification,
      slashedAmount,
      confidence: 0.94,
      proofHash: simulatedHash,
    },
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Covenant Server] Active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Covenant Server] Startup error:', err);
  process.exit(1);
});
