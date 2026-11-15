import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {bodyFont, colors, uiFont} from '../theme';

export const LowerThird: React.FC<{
	kicker: string;
	line: string;
	delay?: number;
}> = ({kicker, line, delay = 0}) => {
	const frame = useCurrentFrame() - delay;
	const {fps} = useVideoConfig();
	const s = spring({frame, fps, config: {damping: 200}});
	const x = interpolate(s, [0, 1], [-40, 0]);
	const opacity = interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	return (
		<div
			style={{
				position: 'absolute',
				left: 90,
				bottom: 100,
				opacity,
				transform: `translateX(${x}px)`,
				display: 'flex',
				alignItems: 'center',
				gap: 20,
			}}
		>
			<div style={{width: 6, height: 64, background: colors.bronze, borderRadius: 3}} />
			<div>
				<div
					style={{
						fontFamily: uiFont,
						fontSize: 20,
						letterSpacing: 4,
						textTransform: 'uppercase',
						color: colors.bronze,
					}}
				>
					{kicker}
				</div>
				<div
					style={{
						fontFamily: bodyFont,
						fontSize: 40,
						color: colors.parchment,
						marginTop: 4,
					}}
				>
					{line}
				</div>
			</div>
		</div>
	);
};

export const StatRow: React.FC<{
	stats: {label: string; value: string}[];
	delay?: number;
}> = ({stats, delay = 0}) => {
	const frame = useCurrentFrame() - delay;
	const opacity = interpolate(frame, [0, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const y = interpolate(frame, [0, 16], [20, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	return (
		<div
			style={{
				position: 'absolute',
				right: 90,
				bottom: 100,
				display: 'flex',
				gap: 48,
				opacity,
				transform: `translateY(${y}px)`,
			}}
		>
			{stats.map((s) => (
				<div key={s.label} style={{textAlign: 'right'}}>
					<div style={{fontFamily: uiFont, fontSize: 44, color: colors.bronzeLight, fontWeight: 700}}>
						{s.value}
					</div>
					<div
						style={{
							fontFamily: uiFont,
							fontSize: 16,
							letterSpacing: 2,
							textTransform: 'uppercase',
							color: colors.parchmentDim,
							marginTop: 2,
						}}
					>
						{s.label}
					</div>
				</div>
			))}
		</div>
	);
};
