import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {colors, uiFont} from '../theme';

type Node = {id: string; x: number; y: number; r: number; label: string; depth: number};
type Edge = {a: string; b: string};

const NODES: Node[] = [
	{id: 'palace', x: 760, y: 360, r: 26, label: 'Palace of Laertes', depth: 0},
	{id: 'agora', x: 470, y: 270, r: 16, label: 'The Agora', depth: 1},
	{id: 'harbor', x: 980, y: 470, r: 16, label: 'Harbor of Phorcys', depth: 1},
	{id: 'temple', x: 800, y: 150, r: 15, label: 'Temple of Athena', depth: 1},
	{id: 'aqueduct', x: 240, y: 330, r: 11, label: 'Aqueduct', depth: 2},
	{id: 'watchtower', x: 1160, y: 320, r: 11, label: 'Watchtower', depth: 2},
	{id: 'granary', x: 560, y: 480, r: 11, label: 'Royal Granary', depth: 2},
	{id: 'forum', x: 900, y: 590, r: 11, label: 'Forum', depth: 2},
	{id: 'shrine', x: 1240, y: 520, r: 9, label: 'Shrine of Apollo', depth: 3},
	{id: 'gate', x: 160, y: 180, r: 9, label: 'West Gate', depth: 3},
];

const EDGES: Edge[] = [
	{a: 'palace', b: 'agora'},
	{a: 'palace', b: 'harbor'},
	{a: 'palace', b: 'temple'},
	{a: 'agora', b: 'aqueduct'},
	{a: 'agora', b: 'granary'},
	{a: 'harbor', b: 'watchtower'},
	{a: 'harbor', b: 'forum'},
	{a: 'aqueduct', b: 'gate'},
	{a: 'forum', b: 'shrine'},
];

const nodeById = (id: string) => NODES.find((n) => n.id === id)!;
const STAGGER = 24;
const IGNITE_AT = 14;
const EDGE_DRAW = 16;
const MAX_DEPTH = 3;
const RECOVER_STAGGER = 20;

export const GraphCascade: React.FC<{delay?: number; recoverAt?: number}> = ({
	delay = 0,
	recoverAt = Infinity,
}) => {
	const frame = useCurrentFrame() - delay;

	const healAtForDepth = (depth: number) => recoverAt + (MAX_DEPTH - depth) * RECOVER_STAGGER;
	const originHealAt = healAtForDepth(0) + RECOVER_STAGGER;
	const fullyRecovered = interpolate(frame, [originHealAt, originHealAt + 10], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<svg viewBox="0 0 1400 700" style={{width: '100%', height: '100%'}}>
			<defs>
				<radialGradient id="nodeGlowFailed" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor={colors.ember} stopOpacity="0.9" />
					<stop offset="100%" stopColor={colors.ember} stopOpacity="0" />
				</radialGradient>
				<radialGradient id="nodeGlowOk" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor={colors.bronzeLight} stopOpacity="0.7" />
					<stop offset="100%" stopColor={colors.bronzeLight} stopOpacity="0" />
				</radialGradient>
			</defs>

			{EDGES.map((e, i) => {
				const from = nodeById(e.a);
				const to = nodeById(e.b);
				const depth = Math.max(from.depth, to.depth);
				const start = depth === 0 ? IGNITE_AT : IGNITE_AT + (depth - 1) * STAGGER + EDGE_DRAW * 0.4;
				const healAt = healAtForDepth(depth) - 6;
				const length = Math.hypot(to.x - from.x, to.y - from.y);
				const progress = interpolate(frame, [start, start + EDGE_DRAW], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				});
				const litUp = interpolate(frame, [start, start + EDGE_DRAW + 10], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				});
				const healed = interpolate(frame, [healAt, healAt + 10], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				});
				const lit = litUp * (1 - healed);

				return (
					<g key={i}>
						<line
							x1={from.x}
							y1={from.y}
							x2={to.x}
							y2={to.y}
							stroke={colors.parchmentDim}
							strokeOpacity={0.18}
							strokeWidth={2}
						/>
						<line
							x1={from.x}
							y1={from.y}
							x2={to.x}
							y2={to.y}
							stroke={lit > 0.5 ? colors.ember : colors.bronzeLight}
							strokeOpacity={Math.max(lit, healed * 0.75)}
							strokeWidth={3}
							strokeDasharray={length}
							strokeDashoffset={length * (1 - progress)}
							style={{filter: `drop-shadow(0 0 6px ${lit > 0.5 ? colors.ember : colors.bronzeLight})`}}
						/>
					</g>
				);
			})}

			{NODES.map((n) => {
				const fireAt = n.depth === 0 ? IGNITE_AT : IGNITE_AT + (n.depth - 1) * STAGGER + EDGE_DRAW;
				const healAt = healAtForDepth(n.depth);
				const failedRaw = interpolate(frame, [fireAt, fireAt + 6], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				});
				const healed = interpolate(frame, [healAt, healAt + 8], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				});
				const failed = failedRaw * (1 - healed);

				const firePulse = interpolate(frame, [fireAt, fireAt + 10, fireAt + 24], [0, 1, 0], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				});
				const healPulse = interpolate(frame, [healAt, healAt + 12, healAt + 30], [0, 1, 0], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				});
				const pulse = Math.max(firePulse, healPulse);
				const pulseColor = healPulse > firePulse ? colors.bronzeLight : colors.ember;

				const appear = interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				const ringR = interpolate(pulse, [0, 1], [n.r, n.r + 46]);
				const labelOpacity = interpolate(frame, [fireAt - 4, fireAt + 8], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				});

				const color = failed > 0.5 ? colors.ember : colors.bronzeLight;

				return (
					<g key={n.id} opacity={appear}>
						<circle cx={n.x} cy={n.y} r={n.r + 24} fill={failed > 0.5 ? 'url(#nodeGlowFailed)' : 'url(#nodeGlowOk)'} />
						<circle cx={n.x} cy={n.y} r={ringR} fill="none" stroke={pulseColor} strokeWidth={2} opacity={pulse * 0.8} />
						<circle
							cx={n.x}
							cy={n.y}
							r={n.r}
							fill={failed > 0.5 ? '#2a0e0a' : '#2a1c0d'}
							stroke={color}
							strokeWidth={3}
							style={{filter: `drop-shadow(0 0 10px ${color})`}}
						/>
						<text
							x={n.x}
							y={n.y - n.r - 14}
							textAnchor="middle"
							fill={colors.parchment}
							fontFamily={uiFont}
							fontSize={n.depth === 0 ? 22 : 16}
							fontWeight={n.depth === 0 ? 700 : 500}
							opacity={labelOpacity}
							letterSpacing={0.5}
						>
							{n.label}
						</text>
						{n.depth === 0 ? (
							<text
								x={n.x}
								y={n.y + n.r + 26}
								textAnchor="middle"
								fill={fullyRecovered > 0.5 ? colors.bronzeLight : colors.ember}
								fontFamily={uiFont}
								fontSize={14}
								letterSpacing={2}
								opacity={Math.max(failed, fullyRecovered)}
								style={{textTransform: 'uppercase'}}
							>
								{fullyRecovered > 0.5 ? 'Recovered · Online' : 'Origin · Fire'}
							</text>
						) : null}
					</g>
				);
			})}
		</svg>
	);
};
