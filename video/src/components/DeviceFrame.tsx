import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors} from '../theme';

export const DeviceFrame: React.FC<{
	src: string;
	durationInFrames: number;
	delay?: number;
	width?: number;
	tiltIn?: number;
	panX?: number;
	panY?: number;
	zoomTo?: number;
}> = ({src, durationInFrames, delay = 0, width = 1360, tiltIn = -8, panX = 0, panY = 0, zoomTo = 1.07}) => {
	const frame = useCurrentFrame() - delay;
	const {fps} = useVideoConfig();

	const entrance = spring({frame, fps, config: {damping: 26, mass: 1.1}});
	const rotateY = interpolate(entrance, [0, 1], [tiltIn, 0]);
	const scaleIn = interpolate(entrance, [0, 1], [0.92, 1]);
	const y = interpolate(entrance, [0, 1], [50, 0]);
	const opacity = interpolate(frame, [0, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const innerScale = interpolate(progress, [0, 1], [1, zoomTo]);
	const innerX = interpolate(progress, [0, 1], [0, panX]);
	const innerY = interpolate(progress, [0, 1], [0, panY]);

	const glareSweep = interpolate(frame, [10, 60], [-30, 130], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const height = (width * 9) / 16;

	return (
		<div
			style={{
				perspective: 1600,
				opacity,
			}}
		>
			<div
				style={{
					width,
					height,
					borderRadius: 18,
					overflow: 'hidden',
					position: 'relative',
					transform: `translateY(${y}px) scale(${scaleIn}) rotateY(${rotateY}deg) rotateX(2deg)`,
					transformStyle: 'preserve-3d',
					boxShadow: `0 40px 120px -20px rgba(0,0,0,0.75), 0 0 0 1px ${colors.bronze}55, 0 0 90px -10px ${colors.ember}33`,
					background: '#0d0604',
				}}
			>
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						height: 34,
						background: 'linear-gradient(180deg, #221210, #140a08)',
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						paddingLeft: 16,
						zIndex: 3,
						borderBottom: `1px solid ${colors.bronze}33`,
					}}
				>
					{['#e2651b', '#c99a4b', '#6a8f6b'].map((c) => (
						<div key={c} style={{width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.85}} />
					))}
				</div>
				<div style={{position: 'absolute', top: 34, left: 0, right: 0, bottom: 0, overflow: 'hidden'}}>
					<Img
						src={staticFile(src)}
						style={{
							width: '100%',
							height: '100%',
							objectFit: 'cover',
							transform: `scale(${innerScale}) translate(${innerX}px, ${innerY}px)`,
						}}
					/>
				</div>
				{/* glare sweep */}
				<div
					style={{
						position: 'absolute',
						top: 0,
						bottom: 0,
						left: `${glareSweep}%`,
						width: '22%',
						background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.14), transparent)',
						transform: 'skewX(-18deg)',
						zIndex: 4,
						pointerEvents: 'none',
					}}
				/>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)',
						zIndex: 2,
						pointerEvents: 'none',
					}}
				/>
			</div>
		</div>
	);
};
