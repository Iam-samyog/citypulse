import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors} from '../theme';

type Ember = {
	id: number;
	x: number;
	size: number;
	delay: number;
	speed: number;
	sway: number;
	swaySpeed: number;
	hue: 'bronze' | 'ember';
};

export const EmberField: React.FC<{count?: number; intensity?: number}> = ({count = 36, intensity = 1}) => {
	const frame = useCurrentFrame();
	const {height, durationInFrames} = useVideoConfig();

	const embers: Ember[] = useMemo(() => {
		return new Array(count).fill(0).map((_, i) => ({
			id: i,
			x: random(`x-${i}`) * 100,
			size: 2 + random(`s-${i}`) * 5,
			delay: random(`d-${i}`) * durationInFrames,
			speed: 0.6 + random(`sp-${i}`) * 1.1,
			sway: 20 + random(`sw-${i}`) * 50,
			swaySpeed: 0.02 + random(`sws-${i}`) * 0.03,
			hue: random(`h-${i}`) > 0.5 ? 'bronze' : 'ember',
		}));
	}, [count, durationInFrames]);

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{embers.map((e) => {
				const t = ((frame + e.delay) * e.speed) % (height + 200);
				const y = height - t + 100;
				const sway = Math.sin((frame + e.delay) * e.swaySpeed) * e.sway;
				const lifeProgress = (t / (height + 200));
				const opacity =
					interpolate(lifeProgress, [0, 0.12, 0.8, 1], [0, 1, 1, 0], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					}) * 0.85 * intensity;
				const color = e.hue === 'bronze' ? colors.bronzeLight : colors.ember;

				return (
					<div
						key={e.id}
						style={{
							position: 'absolute',
							left: `${e.x}%`,
							top: y,
							width: e.size,
							height: e.size,
							borderRadius: '50%',
							background: color,
							opacity,
							boxShadow: `0 0 ${e.size * 4}px ${e.size}px ${color}`,
							transform: `translateX(${sway}px)`,
						}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};
