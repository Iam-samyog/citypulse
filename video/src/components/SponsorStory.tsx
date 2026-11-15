import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {StoryProgressBar} from './StorySwipe';
import {SponsorIcon, type IconKind} from './SponsorIcon';
import {KineticWords} from './KineticText';
import {EmberField} from './EmberField';
import {colors, displayFont, uiFont} from './../theme';

export const SponsorStory: React.FC<{
	index: number;
	total: number;
	localDuration: number;
	icon: IconKind;
	accent: string;
	eyebrow: string;
	name: string;
	blurb: string;
	detail?: string;
	compact?: boolean;
}> = ({index, total, localDuration, icon, accent, eyebrow, name, blurb, detail, compact = false}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const iconDelay = compact ? 5 : 14;
	const iconSpring = spring({frame: frame - iconDelay, fps, config: {damping: 14, mass: 0.6}});
	const iconScale = interpolate(iconSpring, [0, 1], [0.4, 1]);
	const iconOpacity = interpolate(frame, [2, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const ringPulse = interpolate(frame, [iconDelay, iconDelay + 12, iconDelay + 24], [0, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(ellipse at 50% 18%, ${accent}26 0%, ${colors.maroonDeep} 55%, #0d0504 100%)`,
			}}
		>
			<EmberField count={14} intensity={0.35} />
			<StoryProgressBar total={total} index={index} localDuration={localDuration} />

			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
				<div style={{textAlign: 'center', maxWidth: 1100}}>
					<div style={{position: 'relative', width: 120, height: 120, margin: '0 auto 36px'}}>
						<div
							style={{
								position: 'absolute',
								inset: -16,
								borderRadius: '50%',
								border: `2px solid ${accent}`,
								opacity: ringPulse * 0.7,
								transform: `scale(${interpolate(ringPulse, [0, 1], [0.8, 1.4])})`,
							}}
						/>
						<div
							style={{
								width: 120,
								height: 120,
								borderRadius: '50%',
								background: `${accent}1a`,
								border: `1.5px solid ${accent}`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								opacity: iconOpacity,
								transform: `scale(${iconScale})`,
								boxShadow: `0 0 50px -6px ${accent}aa`,
							}}
						>
							<SponsorIcon kind={icon} color={accent} size={58} />
						</div>
					</div>

					<div
						style={{
							fontFamily: uiFont,
							fontSize: compact ? 15 : 18,
							letterSpacing: 5,
							textTransform: 'uppercase',
							color: accent,
							marginBottom: compact ? 10 : 14,
						}}
					>
						<KineticWords text={eyebrow} delay={compact ? 1 : 4} stagger={compact ? 0.8 : 1.5} />
					</div>
					<div
						style={{
							fontFamily: displayFont,
							fontSize: compact ? 68 : 76,
							color: colors.parchment,
							textShadow: '0 6px 30px rgba(0,0,0,0.6)',
						}}
					>
						<KineticWords text={name} delay={compact ? 5 : 12} stagger={compact ? 1.4 : 2.5} />
					</div>
					<div
						style={{
							fontFamily: uiFont,
							fontSize: compact ? 22 : 26,
							color: colors.bronzeLight,
							marginTop: compact ? 16 : 24,
							fontWeight: 600,
						}}
					>
						<KineticWords text={blurb} delay={compact ? 14 : 26} stagger={compact ? 0.8 : 1.2} />
					</div>
					{detail && compact ? (
						<div
							style={{
								fontFamily: uiFont,
								fontSize: 15,
								letterSpacing: 0.5,
								color: colors.parchmentDim,
								marginTop: 10,
								opacity: interpolate(frame, [26, 34], [0, 1], {
									extrapolateLeft: 'clamp',
									extrapolateRight: 'clamp',
								}),
							}}
						>
							{detail}
						</div>
					) : null}
					{detail && !compact ? (
						<div
							style={{
								fontFamily: uiFont,
								fontSize: 19,
								color: colors.parchmentDim,
								marginTop: 14,
								lineHeight: 1.5,
							}}
						>
							<KineticWords text={detail} delay={36} stagger={0.8} />
						</div>
					) : null}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
