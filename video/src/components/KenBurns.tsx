import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';

export const KenBurns: React.FC<{
	src: string;
	durationInFrames: number;
	direction?: 'in' | 'out';
	panX?: number;
	panY?: number;
	dim?: number;
}> = ({src, durationInFrames, direction = 'in', panX = 0, panY = 0, dim = 0.35}) => {
	const frame = useCurrentFrame();
	const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const scale =
		direction === 'in'
			? interpolate(progress, [0, 1], [1.08, 1.22])
			: interpolate(progress, [0, 1], [1.22, 1.08]);

	const tx = interpolate(progress, [0, 1], [0, panX]);
	const ty = interpolate(progress, [0, 1], [0, panY]);

	return (
		<AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#140a08'}}>
			<Img
				src={staticFile(src)}
				style={{
					width: '100%',
					height: '100%',
					objectFit: 'cover',
					transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
					filter: 'saturate(1.08) contrast(1.05)',
				}}
			/>
			<AbsoluteFill
				style={{
					background: `linear-gradient(180deg, rgba(10,4,3,${dim}) 0%, rgba(10,4,3,${dim * 0.5}) 40%, rgba(10,4,3,${dim}) 75%, rgba(10,4,3,${Math.min(dim + 0.35, 0.85)}) 100%)`,
				}}
			/>
		</AbsoluteFill>
	);
};
