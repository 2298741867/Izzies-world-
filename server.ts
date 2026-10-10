import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import type { GenerateContentResponse } from '@google/genai';
import type { TokenUsage } from './src/types/covenant';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.use(express.json());

// Initialize Google GenAI client if key exists
const apiKey = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const sessionUsage = { promptTokens: 0, outputTokens: 0, totalTokens: 0, calls: 0 };

function recordUsage(response: GenerateContentResponse): TokenUsage {
  const metadata = response.usageMetadata;
  const usage: TokenUsage = {
    promptTokens: metadata?.promptTokenCount ?? 0,
    outputTokens: metadata?.candidatesTokenCount ?? 0,
    totalTokens: metadata?.totalTokenCount ?? 0,
    model: GEMINI_MODEL,
    ...(metadata?.thoughtsTokenCount !== undefined ? { thinkingTokens: metadata.thoughtsTokenCount } : {}),
  };
  sessionUsage.promptTokens += usage.promptTokens;
  sessionUsage.outputTokens += usage.outputTokens;
  sessionUsage.totalTokens += usage.totalTokens;
  console.log('[Gemini usage]', usage);
  return usage;
}

const requestWindows = new Map<string, { count: number; expires: number }>();
function arbiterRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  for (const [ip, window] of requestWindows) {
    if (window.expires <= now) requestWindows.delete(ip);
  }
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const window = requestWindows.get(ip) || { count: 0, expires: now + 60_000 };
  requestWindows.set(ip, window);
  if (window.count >= 20) {
    res.setHeader('Retry-After', Math.ceil((window.expires - now) / 1000));
    res.status(429).json({ error: 'Arbiter rate limit exceeded. Try again shortly.' });
    return;
  }
  window.count++;
  next();
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const finiteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const promptString = (value: string) => value.slice(0, 500).replace(/[\r\n\u2028\u2029]/g, ' ');

function validCovenant(value: unknown): value is Record<string, any> {
  if (!isObject(value)) return false;
  return ['name', 'domain', 'targetModel', 'aggregationAlgorithm', 'valuationMetric'].every(key => typeof value[key] === 'string') &&
    ['rewardPool', 'epsilonDP', 'minStake', 'slashingPenaltyPercent'].every(key => finiteNumber(value[key]) && value[key] >= 0) &&
    (value.slashingPenaltyPercent as number) <= 100 &&
    ['FedAvg', 'FedProx', 'Multi-Krum', 'Trimmed-Mean', 'Coordinate-wise Median'].includes(value.aggregationAlgorithm as string) &&
    ['Data-Shapley', 'Monte-Carlo Shapley', 'Influence Function', 'Dataset-Volume Proportional', 'Equal-Split'].includes(value.valuationMetric as string);
}

function validNode(value: unknown): value is Record<string, any> {
  return isObject(value) &&
    ['id', 'name', 'institution', 'status'].every(key => typeof value[key] === 'string') &&
    ['cosineSimilarity', 'gradientNorm', 'marginalLossReduction', 'stakeAmount'].every(key => finiteNumber(value[key])) &&
    (value.stakeAmount as number) >= 0 && (value.gradientNorm as number) >= 0 &&
    Math.abs(value.cosineSimilarity as number) <= 1 &&
    ['Ready', 'Training', 'Submitting', 'Verified', 'Flagged', 'Slashed'].includes(value.status as string);
}

function sanitizePromptFields(value: Record<string, any>) {
  return Object.fromEntries(Object.entries(value).map(([key, field]) => [key, typeof field === 'string' ? promptString(field) : field]));
}
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
app.get('/api/arbiter/usage', (_req: Request, res: Response) => {
  res.json({ ...sessionUsage, model: GEMINI_MODEL });
});

app.post('/api/arbiter/audit', arbiterRateLimit, async (req: Request, res: Response) => {
  const { covenant: inputCovenant, attackScenario } = req.body || {};

  if (!validCovenant(inputCovenant) || (attackScenario !== undefined && typeof attackScenario !== 'string')) {
    res.status(400).json({ error: 'Valid covenant parameters and attack scenario are required' });
    return;
  }
  const covenant = sanitizePromptFields(inputCovenant);
  let fallbackReason = 'GEMINI_API_KEY is not configured';

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
Simulated Attack Vector: ${promptString(attackScenario || 'Standard distributed consortium')}
`;

  if (genAI) {
    try {
      sessionUsage.calls++;
      const response = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}\nOutput strictly valid JSON without code fences.` }] },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const usage = recordUsage(response);
      const parsed = JSON.parse(response.text || '{}');
      if (!isObject(parsed) || !['APPROVED', 'CONDITIONAL_APPROVAL', 'REVISE_REQUIRED'].includes(parsed.verdict as string)) {
        throw new Error('Invalid Gemini audit response');
      }
      res.json({ success: true, source: 'gemini', audit: parsed, usage });
      return;
    } catch (error) {
      fallbackReason = 'Gemini call failed or returned an invalid audit';
      console.warn('Gemini API call failed, using heuristic arbiter engine:', error);
    }
  }

  // Deterministic Game-Theoretic Fallback Arbiter
  const isKrumOrMedian = ['Multi-Krum', 'Coordinate-wise Median', 'Trimmed-Mean'].includes(covenant.aggregationAlgorithm);
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
    usage: null,
    fallbackReason,
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
app.post('/api/arbiter/resolve-dispute', arbiterRateLimit, async (req: Request, res: Response) => {
  const { node: inputNode, covenant: inputCovenant } = req.body || {};

  if (!validNode(inputNode) || !validCovenant(inputCovenant)) {
    res.status(400).json({ error: 'Valid node telemetry and covenant parameters are required' });
    return;
  }
  const node = sanitizePromptFields(inputNode);
  const covenant = sanitizePromptFields(inputCovenant);
  let fallbackReason = 'GEMINI_API_KEY is not configured';

  if (genAI) {
    try {
      sessionUsage.calls++;
      const response = await genAI.models.generateContent({
        model: GEMINI_MODEL,
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
Covenant Slashing Rate: ${covenant.slashingPenaltyPercent}%

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

      const usage = recordUsage(response);
      const parsed = JSON.parse(response.text || '{}');
      if (!isObject(parsed) || !['SLASH_AND_EJECT', 'BENIGN_VARIATION_ACCEPT', 'QUARANTINE_FOR_VERIFICATION'].includes(parsed.ruling as string) ||
          !finiteNumber(parsed.slashedAmount) || parsed.slashedAmount < 0 || parsed.slashedAmount > node.stakeAmount) {
        throw new Error('Invalid Gemini ruling response');
      }
      res.json({ success: true, source: 'gemini', ruling: parsed, usage });
      return;
    } catch (err) {
      fallbackReason = 'Gemini call failed or returned an invalid ruling';
      console.warn('Gemini dispute arbitration failed, using rule engine:', err);
    }
  }

  // Deterministic Arbiter Ruling
  let ruling = 'BENIGN_VARIATION_ACCEPT';
  let slashedAmount = 0;
  let justification = 'Gradient trajectory aligns with legitimate local non-IID data distribution. Submission accepted.';

  if (node.cosineSimilarity < -0.3 || node.gradientNorm > 10.0) {
    ruling = 'SLASH_AND_EJECT';
    slashedAmount = Math.min(node.stakeAmount, Math.round(node.stakeAmount * (covenant.slashingPenaltyPercent / 100)));
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
    usage: null,
    fallbackReason,
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
