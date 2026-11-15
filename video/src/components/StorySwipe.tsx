import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors} from '../theme';

const SWIPE_OUT = 14;

export const StorySwipe: React.FC<{durationInFrames: number; children: React.ReactNode}> = ({
	durationInFrames,
	children,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const enter = spring({frame, fps, config: {damping: 22, mass: 0.8}});
	const x = interpolate(enter, [0, 1], [90, 0]);

	const outProgress = interpolate(
		frame,
		[durationInFrames - SWIPE_OUT, durationInFrames],
		[0, 1],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);
	const xOut = interpolate(outProgress, [0, 1], [0, -70]);
	const opacityOut = interpolate(outProgress, [0, 1], [1, 0]);

	return (
		<AbsoluteFill
			style={{
				transform: `translateX(${x + xOut}%)`,
				opacity: opacityOut,
			}}
		>
			{children}
		</AbsoluteFill>
	);
};

export const StoryProgressBar: React.FC<{
	total: number;
	index: number;
	localDuration: number;
}> = ({total, index, localDuration}) => {
	const frame = useCurrentFrame();
	const fill = interpolate(frame, [0, localDuration - 10], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<div
			style={{
				position: 'absolute',
				top: 56,
				left: 90,
				right: 90,
				display: 'flex',
				gap: 10,
			}}
		>
			{new Array(total).fill(0).map((_, i) => (
				<div
					key={i}
					style={{
						flex: 1,
						height: 4,
						borderRadius: 2,
						background: 'rgba(255,255,255,0.15)',
						overflow: 'hidden',
					}}
				>
					<div
						style={{
							height: '100%',
							width: i < index ? '100%' : i === index ? `${fill * 100}%` : '0%',
							background: colors.bronzeLight,
							boxShadow: `0 0 8px ${colors.bronzeLight}`,
						}}
					/>
				</div>
			))}
		</div>
	);
};
