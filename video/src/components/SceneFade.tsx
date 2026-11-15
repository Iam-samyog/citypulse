import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

export const SceneFade: React.FC<{durationInFrames: number; children: React.ReactNode}> = ({
	durationInFrames,
	children,
}) => {
	const frame = useCurrentFrame();
	const opacity = interpolate(
		frame,
		[0, 18, durationInFrames - 18, durationInFrames],
		[0, 1, 1, 0],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);

	return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};
