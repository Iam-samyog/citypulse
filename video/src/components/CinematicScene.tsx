import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {colors} from '../theme';

const WIPE_IN = 20;
const WIPE_OUT = 16;

export const CinematicScene: React.FC<{durationInFrames: number; children: React.ReactNode}> = ({
	durationInFrames,
	children,
}) => {
	const frame = useCurrentFrame();

	const inProgress = interpolate(frame, [0, WIPE_IN], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const outProgress = interpolate(
		frame,
		[durationInFrames - WIPE_OUT, durationInFrames],
		[0, 1],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);

	const radius = interpolate(inProgress, [0, 1], [0, 145]);
	const outRadius = interpolate(outProgress, [0, 1], [145, 0]);
	const effectiveRadius = Math.min(radius, outRadius);

	const flash = interpolate(frame, [0, 6, 14], [0.9, 0.15, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				clipPath: `circle(${effectiveRadius}% at 50% 50%)`,
			}}
		>
			{children}
			<AbsoluteFill
				style={{
					backgroundColor: colors.bronzeLight,
					opacity: flash,
					mixBlendMode: 'screen',
					pointerEvents: 'none',
				}}
			/>
		</AbsoluteFill>
	);
};
