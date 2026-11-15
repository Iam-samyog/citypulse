import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {bodyFont, colors, displayFont} from '../theme';

export const TitleCard: React.FC<{
	eyebrow?: string;
	title: string;
	subtitle?: string;
	align?: 'left' | 'center';
	delay?: number;
}> = ({eyebrow, title, subtitle, align = 'left', delay = 0}) => {
	const frame = useCurrentFrame() - delay;
	const {fps} = useVideoConfig();

	const in1 = spring({frame, fps, config: {damping: 200, mass: 0.7}});
	const titleSlide = interpolate(in1, [0, 1], [26, 0]);
	const opacity = interpolate(frame, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	const rule = interpolate(frame, [10, 34], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: align === 'center' ? 'center' : 'flex-start',
				textAlign: align,
				opacity,
			}}
		>
			{eyebrow ? (
				<div
					style={{
						fontFamily: 'Inter, sans-serif',
						fontSize: 24,
						letterSpacing: 6,
						textTransform: 'uppercase',
						color: colors.bronze,
						marginBottom: 18,
						transform: `translateY(${titleSlide}px)`,
					}}
				>
					{eyebrow}
				</div>
			) : null}
			<div
				style={{
					fontFamily: displayFont,
					fontSize: 92,
					color: colors.parchment,
					lineHeight: 1.08,
					textShadow: '0 6px 30px rgba(0,0,0,0.6)',
					transform: `translateY(${titleSlide}px)`,
					maxWidth: 1400,
				}}
			>
				{title}
			</div>
			<div
				style={{
					marginTop: 24,
					width: interpolate(rule, [0, 1], [0, 140]),
					height: 3,
					background: `linear-gradient(90deg, ${colors.bronze}, transparent)`,
				}}
			/>
			{subtitle ? (
				<div
					style={{
						fontFamily: bodyFont,
						fontSize: 34,
						color: colors.parchmentDim,
						marginTop: 22,
						maxWidth: 1100,
						transform: `translateY(${titleSlide}px)`,
					}}
				>
					{subtitle}
				</div>
			) : null}
		</div>
	);
};
