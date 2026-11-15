import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors} from '../theme';

export const KineticWords: React.FC<{
	text: string;
	delay?: number;
	stagger?: number;
	style?: React.CSSProperties;
}> = ({text, delay = 0, stagger = 3, style}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const words = text.split(' ');

	return (
		<span style={{display: 'inline-block', ...style}}>
			{words.map((w, i) => {
				const local = frame - delay - i * stagger;
				const s = spring({frame: local, fps, config: {damping: 200, mass: 0.6}});
				const y = interpolate(s, [0, 1], [34, 0]);
				const blur = interpolate(s, [0, 1], [10, 0]);
				const opacity = interpolate(local, [0, 10], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				});

				return (
					<span
						key={i}
						style={{
							display: 'inline-block',
							transform: `translateY(${y}px)`,
							filter: `blur(${blur}px)`,
							opacity,
							marginRight: '0.28em',
							whiteSpace: 'pre',
						}}
					>
						{w}
					</span>
				);
			})}
		</span>
	);
};

export const ShimmerText: React.FC<{
	text: string;
	delay?: number;
	fontSize?: number;
	fontFamily?: string;
}> = ({text, delay = 0, fontSize = 120, fontFamily}) => {
	const frame = useCurrentFrame() - delay;
	const sweep = interpolate(frame, [0, 70], [-60, 160], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const opacity = interpolate(frame, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	return (
		<div
			style={{
				fontFamily,
				fontSize,
				fontWeight: 600,
				opacity,
				backgroundImage: `linear-gradient(100deg, ${colors.parchmentDim} 0%, ${colors.parchmentDim} ${sweep - 25}%, ${colors.bronzeLight} ${sweep}%, #fff8e8 ${sweep + 6}%, ${colors.bronzeLight} ${sweep + 12}%, ${colors.parchmentDim} ${sweep + 35}%, ${colors.parchmentDim} 100%)`,
				backgroundClip: 'text',
				WebkitBackgroundClip: 'text',
				color: 'transparent',
				letterSpacing: 2,
			}}
		>
			{text}
		</div>
	);
};
