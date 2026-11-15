import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {colors, uiFont} from '../theme';

export const StatBlock: React.FC<{
	value: number;
	suffix?: string;
	label: string;
	delay?: number;
	format?: (n: number) => string;
}> = ({value, suffix = '', label, delay = 0, format}) => {
	const frame = useCurrentFrame() - delay;
	const progress = interpolate(frame, [0, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const eased = 1 - Math.pow(1 - progress, 3);
	const current = Math.round(value * eased);
	const opacity = interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const y = interpolate(frame, [0, 14], [16, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	return (
		<div style={{textAlign: 'right', opacity, transform: `translateY(${y}px)`}}>
			<div style={{fontFamily: uiFont, fontSize: 56, color: colors.bronzeLight, fontWeight: 700, lineHeight: 1}}>
				{format ? format(current) : current}
				{suffix}
			</div>
			<div
				style={{
					fontFamily: uiFont,
					fontSize: 17,
					letterSpacing: 2.5,
					textTransform: 'uppercase',
					color: colors.parchmentDim,
					marginTop: 6,
				}}
			>
				{label}
			</div>
		</div>
	);
};
