import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {colors, displayFont, uiFont} from './theme';

const SPONSORS = ['Gemini', 'MongoDB Atlas', 'ElevenLabs', 'Vultr', 'GoDaddy'];

const Rule: React.FC<{width?: number}> = ({width = 56}) => (
	<div style={{width, height: 1.5, background: `linear-gradient(90deg, ${colors.bronze}, transparent)`}} />
);

export const Thumbnail: React.FC = () => {
	return (
		<AbsoluteFill style={{backgroundColor: colors.bgDark}}>
			{/* the city itself, full bleed — this is the hero, not a mockup */}
			<Img
				src={staticFile('captures/thumbnail-city-hero.webp')}
				style={{
					position: 'absolute',
					inset: 0,
					width: '100%',
					height: '100%',
					objectFit: 'cover',
					objectPosition: '76% 46%',
					transform: 'scale(1.18)',
				}}
			/>

			{/* warm duotone grade so the render reads as part of the same world as the rest of the brand */}
			<AbsoluteFill
				style={{
					background: `linear-gradient(160deg, ${colors.maroonDeep}66 0%, transparent 42%, ${colors.maroon}33 100%)`,
					mixBlendMode: 'multiply',
				}}
			/>
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse 1400px 1000px at 50% 50%, transparent 55%, #0c0504aa 100%)`,
				}}
			/>

			{/* scrim for the top band — logo, eyebrow, title */}
			<AbsoluteFill
				style={{
					background:
						'linear-gradient(180deg, rgba(10,5,3,0.97) 0%, rgba(10,5,3,0.93) 28%, rgba(10,5,3,0.72) 44%, transparent 64%)',
				}}
			/>
			<AbsoluteFill
				style={{
					background: 'linear-gradient(90deg, rgba(10,5,3,0.5) 0%, transparent 48%)',
				}}
			/>
			{/* scrim for the bottom credits bar */}
			<AbsoluteFill
				style={{
					background: 'linear-gradient(0deg, rgba(10,5,3,0.95) 0%, rgba(10,5,3,0.55) 20%, transparent 42%)',
				}}
			/>

			{/* brand lockup, top-left — the real Ithaca Ops mark */}
			<div
				style={{
					position: 'absolute',
					top: 52,
					left: 84,
					display: 'flex',
					alignItems: 'center',
					gap: 14,
				}}
			>
				<Img
					src={staticFile('art/helmet.png')}
					style={{height: 44, width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))'}}
				/>
				<div>
					<div style={{fontFamily: displayFont, fontSize: 21, letterSpacing: 3, color: colors.parchment}}>
						ITHACA
					</div>
					<div
						style={{
							fontFamily: uiFont,
							fontSize: 10,
							letterSpacing: 4,
							textTransform: 'uppercase',
							color: colors.parchmentDim,
							opacity: 0.75,
							marginTop: 1,
						}}
					>
						City Operations
					</div>
				</div>
			</div>

			{/* headline block, top-left, compact — the city carries the frame now */}
			<div style={{position: 'absolute', top: 150, left: 84, maxWidth: 620}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18}}>
					<Rule width={38} />
					<div
						style={{
							fontFamily: uiFont,
							fontSize: 12,
							letterSpacing: 4,
							textTransform: 'uppercase',
							color: colors.bronze,
						}}
					>
						HackUTA 2026 · Digital Twin
					</div>
				</div>
				<div
					style={{
						fontFamily: displayFont,
						fontWeight: 600,
						fontSize: 78,
						lineHeight: 1.0,
						color: colors.parchment,
						textShadow: '0 10px 40px rgba(0,0,0,0.9)',
					}}
				>
					Oracle of <span style={{color: colors.bronzeLight}}>Ithaca</span>
				</div>
			</div>

			{/* bottom rule: credits, no icon chips */}
			<AbsoluteFill style={{justifyContent: 'flex-end'}}>
				<div
					style={{
						borderTop: `1px solid ${colors.bronze}55`,
						margin: '0 84px',
						padding: '22px 0 40px',
						display: 'flex',
						alignItems: 'baseline',
						justifyContent: 'space-between',
					}}
				>
					<div
						style={{
							fontFamily: uiFont,
							fontSize: 12,
							letterSpacing: 3,
							textTransform: 'uppercase',
							color: colors.parchmentDim,
							opacity: 0.85,
							textShadow: '0 2px 10px rgba(0,0,0,0.8)',
						}}
					>
						HackUTA 2026 Submission
					</div>
					<div
						style={{
							fontFamily: uiFont,
							fontSize: 12,
							letterSpacing: 2,
							textTransform: 'uppercase',
							color: colors.parchmentDim,
							opacity: 0.85,
							textShadow: '0 2px 10px rgba(0,0,0,0.8)',
						}}
					>
						{SPONSORS.join('   ·   ')}
					</div>
					<div
						style={{
							fontFamily: uiFont,
							fontSize: 12,
							letterSpacing: 2,
							color: colors.bronzeLight,
							textShadow: '0 2px 10px rgba(0,0,0,0.8)',
						}}
					>
						oracleofithaca.us
					</div>
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
