import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, uiFont} from '../theme';

type Shot = {src: string; at: number};

const SHOTS: Shot[] = [
	{src: 'captures/09-city-interact-1.jpg', at: 0},
	{src: 'captures/09-city-interact-2.jpg', at: 30},
	{src: 'captures/09-city-interact-3.jpg', at: 60},
	{src: 'captures/09-city-interact-4.jpg', at: 90},
	{src: 'captures/09-city-interact-5.png', at: 115},
];
const CROSSFADE = 8;

const CURSOR_KEYS: {frame: number; x: number; y: number; visible: boolean}[] = [
	{frame: 2, x: 50, y: 49, visible: true},
	{frame: 28, x: 75, y: 40, visible: true},
	{frame: 32, x: 50, y: 49, visible: true},
	{frame: 58, x: 25, y: 58, visible: true},
	{frame: 68, x: 25, y: 58, visible: false},
	{frame: 88, x: 90, y: 11, visible: false},
	{frame: 92, x: 90, y: 11, visible: true},
	{frame: 106, x: 90, y: 11, visible: false},
];

const lerp = (frame: number) => {
	for (let i = 0; i < CURSOR_KEYS.length - 1; i++) {
		const a = CURSOR_KEYS[i];
		const b = CURSOR_KEYS[i + 1];
		if (frame >= a.frame && frame <= b.frame) {
			const t = (frame - a.frame) / Math.max(1, b.frame - a.frame);
			return {
				x: a.x + (b.x - a.x) * t,
				y: a.y + (b.y - a.y) * t,
				visible: a.visible,
			};
		}
	}
	const last = CURSOR_KEYS[CURSOR_KEYS.length - 1];
	return {x: last.x, y: last.y, visible: last.visible};
};

export const CityInteraction: React.FC<{durationInFrames: number; delay?: number; width?: number}> = ({
	durationInFrames,
	delay = 0,
	width = 1480,
}) => {
	const raw = useCurrentFrame() - delay;
	const {fps} = useVideoConfig();
	const entrance = spring({frame: raw, fps, config: {damping: 26, mass: 1.1}});
	const scaleIn = interpolate(entrance, [0, 1], [0.94, 1]);
	const opacity = interpolate(raw, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const height = (width * 9) / 16;

	const cursor = lerp(raw);
	const clickRipple = interpolate(raw, [88, 92, 104], [0, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const isClickPhase = raw >= 86 && raw < 108;

	return (
		<div style={{opacity}}>
			<div
				style={{
					width,
					height,
					borderRadius: 18,
					overflow: 'hidden',
					position: 'relative',
					transform: `scale(${scaleIn})`,
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
						zIndex: 5,
						borderBottom: `1px solid ${colors.bronze}33`,
					}}
				>
					{['#e2651b', '#c99a4b', '#6a8f6b'].map((c) => (
						<div key={c} style={{width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.85}} />
					))}
					<div
						style={{
							marginLeft: 'auto',
							marginRight: 16,
							fontFamily: uiFont,
							fontSize: 11,
							letterSpacing: 2,
							color: colors.bronzeLight,
							opacity: 0.8,
						}}
					>
						LIVE · INTERACTIVE
					</div>
				</div>
				<div style={{position: 'absolute', top: 34, left: 0, right: 0, bottom: 0, overflow: 'hidden'}}>
					{SHOTS.map((shot, i) => {
						const next = SHOTS[i + 1];
						const start = shot.at;
						const end = next ? next.at : durationInFrames;
						const fadeIn = interpolate(raw, [start - CROSSFADE, start], [0, 1], {
							extrapolateLeft: 'clamp',
							extrapolateRight: 'clamp',
						});
						const fadeOut = next
							? interpolate(raw, [end - CROSSFADE, end], [1, 0], {
									extrapolateLeft: 'clamp',
									extrapolateRight: 'clamp',
							  })
							: 1;
						const shotOpacity = Math.min(fadeIn, fadeOut);
						const zoom = interpolate(raw, [start, end], [1, 1.06], {
							extrapolateLeft: 'clamp',
							extrapolateRight: 'clamp',
						});
						if (shotOpacity <= 0.002) return null;
						return (
							<Img
								key={shot.src}
								src={staticFile(shot.src)}
								style={{
									position: 'absolute',
									inset: 0,
									width: '100%',
									height: '100%',
									objectFit: 'cover',
									opacity: shotOpacity,
									transform: `scale(${zoom})`,
								}}
							/>
						);
					})}
				</div>

				{cursor.visible ? (
					<div
						style={{
							position: 'absolute',
							left: `${cursor.x}%`,
							top: `${cursor.y}%`,
							width: 20,
							height: 20,
							marginLeft: -10,
							marginTop: -10,
							borderRadius: '50%',
							background: 'rgba(255,255,255,0.9)',
							border: `2px solid ${colors.bronzeLight}`,
							boxShadow: '0 0 14px rgba(255,255,255,0.6)',
							zIndex: 6,
							pointerEvents: 'none',
						}}
					/>
				) : null}

				{isClickPhase ? (
					<div
						style={{
							position: 'absolute',
							left: '90%',
							top: '11%',
							width: 60,
							height: 60,
							marginLeft: -30,
							marginTop: -30,
							borderRadius: '50%',
							border: `2px solid ${colors.bronzeLight}`,
							opacity: clickRipple * 0.8,
							transform: `scale(${interpolate(clickRipple, [0, 1], [0.3, 1.6])})`,
							zIndex: 6,
							pointerEvents: 'none',
						}}
					/>
				) : null}

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
