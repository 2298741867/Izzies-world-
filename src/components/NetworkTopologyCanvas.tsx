import React from 'react';
import { FederatedNode, Covenant } from '../types/covenant';
import { Shield, ShieldAlert, Cpu, Database, Activity, CheckCircle2, AlertTriangle, XOctagon } from 'lucide-react';

interface NetworkTopologyCanvasProps {
  nodes: FederatedNode[];
  covenant: Covenant;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  simulationPhase: number; // 0 = idle, 1 = dispatch, 2 = local train, 3 = byzantine check, 4 = payout
}

export const NetworkTopologyCanvas: React.FC<NetworkTopologyCanvasProps> = ({
  nodes,
  covenant,
  selectedNodeId,
  onSelectNode,
  simulationPhase,
}) => {
  // Compute positions of nodes on an elliptical or circular orbit around center (cx=350, cy=200)
  const cx = 360;
  const cy = 200;
  const radiusX = 260;
  const radiusY = 130;

  return (
    <div className="relative w-full bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden p-4">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">
            Federated Constellation & Differential Privacy Mesh
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
          <span>Aggregator: <strong className="text-slate-200">{covenant.aggregationAlgorithm}</strong></span>
          <span>ε: <strong className="text-emerald-400">{covenant.epsilonDP}</strong></span>
          <span>Slashing: <strong className="text-rose-400">{covenant.slashingPenaltyPercent}%</strong></span>
        </div>
      </div>

      <div className="relative w-full h-[400px] flex items-center justify-center select-none overflow-hidden">
        <svg
          viewBox="0 0 720 400"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#059669" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="slashedBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#881337" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="verifiedBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Background constellation grid / guide orbits */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={radiusX}
            ry={radiusY}
            fill="none"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <ellipse
            cx={cx}
            cy={cy}
            rx={radiusX * 0.6}
            ry={radiusY * 0.6}
            fill="none"
            stroke="#1e293b"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.6"
          />

          {/* Connection Lines from Center to each Node */}
          {nodes.map((node, index) => {
            const angle = (index / nodes.length) * 2 * Math.PI - Math.PI / 2;
            const nx = cx + radiusX * Math.cos(angle);
            const ny = cy + radiusY * Math.sin(angle);
            const isSelected = node.id === selectedNodeId;
            const isSlashed = node.status === 'Slashed';
            const isFlagged = node.status === 'Flagged';

            let strokeColor = '#334155';
            let strokeWidth = isSelected ? 2 : 1;
            let strokeDasharray = 'none';

            if (isSlashed) {
              strokeColor = '#e11d48';
              strokeDasharray = '4 2';
            } else if (isFlagged) {
              strokeColor = '#f59e0b';
              strokeDasharray = '3 3';
            } else if (simulationPhase > 0) {
              strokeColor = '#10b981';
              strokeWidth = 1.5;
            }

            return (
              <g key={`line-${node.id}`}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={nx}
                  y2={ny}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  opacity={isSlashed ? 0.9 : 0.6}
                />
                {simulationPhase === 2 && !isSlashed && (
                  <circle r="3" fill="#34d399">
                    <animateMotion
                      path={`M ${cx} ${cy} L ${nx} ${ny}`}
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {simulationPhase === 3 && (
                  <circle r="3.5" fill={isSlashed ? '#f43f5e' : '#38bdf8'}>
                    <animateMotion
                      path={`M ${nx} ${ny} L ${cx} ${cy}`}
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Center: Covenant Protocol Aggregator */}
          <circle cx={cx} cy={cy} r="75" fill="url(#hubGlow)" />
          <circle
            cx={cx}
            cy={cy}
            r="42"
            fill="#090d16"
            stroke="#10b981"
            strokeWidth="2"
            className="filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
          />
          <circle
            cx={cx}
            cy={cy}
            r="48"
            fill="none"
            stroke="#059669"
            strokeWidth="1"
            strokeDasharray="6 4"
            opacity="0.7"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${cx} ${cy}`}
              to={`360 ${cx} ${cy}`}
              dur="24s"
              repeatCount="indefinite"
            />
          </circle>

          <text
            x={cx}
            y={cy - 12}
            textAnchor="middle"
            fill="#a7f3d0"
            fontSize="10"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            COVENANT HUB
          </text>
          <text
            x={cx}
            y={cy + 3}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
          >
            {covenant.aggregationAlgorithm}
          </text>
          <text
            x={cx}
            y={cy + 18}
            textAnchor="middle"
            fill="#64748b"
            fontSize="8"
            fontFamily="JetBrains Mono, monospace"
          >
            Round #{covenant.currentRound}
          </text>

          {/* Orbiting Federated Nodes */}
          {nodes.map((node, index) => {
            const angle = (index / nodes.length) * 2 * Math.PI - Math.PI / 2;
            const nx = cx + radiusX * Math.cos(angle);
            const ny = cy + radiusY * Math.sin(angle);
            const isSelected = node.id === selectedNodeId;
            const isSlashed = node.status === 'Slashed';
            const isFlagged = node.status === 'Flagged';

            let nodeFill = '#0f172a';
            let strokeColor = '#3b82f6';
            if (isSlashed) {
              nodeFill = '#2a0a14';
              strokeColor = '#e11d48';
            } else if (isFlagged) {
              nodeFill = '#291800';
              strokeColor = '#f59e0b';
            } else if (node.status === 'Verified') {
              strokeColor = '#10b981';
            }

            return (
              <g
                key={`node-${node.id}`}
                transform={`translate(${nx}, ${ny})`}
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => onSelectNode(node.id)}
              >
                {/* Selection outer pulse ring */}
                {isSelected && (
                  <circle
                    cx="0"
                    cy="0"
                    r="28"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                )}

                {/* Node Body */}
                <circle
                  cx="0"
                  cy="0"
                  r="20"
                  fill={nodeFill}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />

                {/* Category/Status Icon */}
                <g transform="translate(-8, -8)">
                  {isSlashed ? (
                    <XOctagon className="w-4 h-4 text-rose-500" />
                  ) : isFlagged ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Cpu className="w-4 h-4 text-slate-300" />
                  )}
                </g>

                {/* Node Label Card */}
                <g transform="translate(0, 26)">
                  <rect
                    x="-65"
                    y="0"
                    width="130"
                    height="28"
                    rx="4"
                    fill="#0b1120"
                    stroke={isSelected ? '#38bdf8' : '#1e293b'}
                    strokeWidth="1"
                    opacity="0.95"
                  />
                  <text
                    x="0"
                    y="12"
                    textAnchor="middle"
                    fill={isSlashed ? '#f43f5e' : '#f1f5f9'}
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    {node.name.length > 20 ? node.name.slice(0, 19) + '…' : node.name}
                  </text>
                  <text
                    x="0"
                    y="22"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="8"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {isSlashed
                      ? `SLASHED: -${node.slashedLosses} COV`
                      : `Shapley: ${(node.shapleyValue * 100).toFixed(1)}%`}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Verified Consensus
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Flagged for Drift
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Slashed Byzantine
          </span>
        </div>
        <span className="text-slate-500">
          Click any node above to inspect raw gradient tensors & Shapley calculations
        </span>
      </div>
    </div>
  );
};
