import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {DeviceFrame} from './components/DeviceFrame';
import {CityInteraction} from './components/CityInteraction';
import {GraphCascade} from './components/GraphCascade';
import {EmberField} from './components/EmberField';
import {KineticWords, ShimmerText} from './components/KineticText';
import {LowerThird} from './components/LowerThird';
import {StatBlock} from './components/Counter';
import {CinematicScene} from './components/CinematicScene';
import {StorySwipe} from './components/StorySwipe';
import {SponsorStory} from './components/SponsorStory';
import {colors, displayFont, uiFont} from './theme';

const COLD_OPEN = 180;
const OVERVIEW = 360;
const INCIDENTS = 330;
const CASCADE_GRAPH = 495;
const CASCADE_PROOF = 153;
const CASCADE = CASCADE_GRAPH + CASCADE_PROOF;
const INTEL_ADVISORS = 210;
const INTEL_ATHENA = 210;
const INTEL = INTEL_ADVISORS + INTEL_ATHENA;
const SPONSOR_INTRO = 60;
const SPONSOR_DURATIONS = [66, 72, 60, 54, 60];
const SPONSORS = SPONSOR_INTRO + SPONSOR_DURATIONS.reduce((a, b) => a + b, 0);
const CLOSING = 390;

export const TOTAL_DURATION =
	COLD_OPEN + OVERVIEW + INCIDENTS + CASCADE + INTEL + SPONSORS + CLOSING;

const VO = (id: string) => <Audio src={staticFile(`audio/${id}.mp3`)} />;

const Eyebrow: React.FC<{numeral: string; label: string; delay?: number}> = ({numeral, label, delay = 0}) => (
	<div
		style={{
			display: 'flex',
			alignItems: 'center',
			gap: 16,
			marginBottom: 20,
		}}
	>
		<div
			style={{
				width: 38,
				height: 38,
				borderRadius: '50%',
				border: `1.5px solid ${colors.bronze}`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontFamily: displayFont,
				fontSize: 17,
				color: colors.bronze,
			}}
		>
			{numeral}
		</div>
		<div
			style={{
				fontFamily: uiFont,
				fontSize: 20,
				letterSpacing: 6,
				textTransform: 'uppercase',
				color: colors.bronze,
			}}
		>
			<KineticWords text={label} delay={delay} stagger={2} />
		</div>
	</div>
);

const SceneTitle: React.FC<{
	numeral: string;
	eyebrow: string;
	title: string;
	subtitle: string;
}> = ({numeral, eyebrow, title, subtitle}) => (
	<div style={{maxWidth: 760}}>
		<Eyebrow numeral={numeral} label={eyebrow} delay={6} />
		<div
			style={{
				fontFamily: displayFont,
				fontSize: 58,
				lineHeight: 1.12,
				color: colors.parchment,
				textShadow: '0 6px 30px rgba(0,0,0,0.6)',
			}}
		>
			<KineticWords text={title} delay={10} stagger={2} />
		</div>
		<div
			style={{
				fontFamily: uiFont,
				fontSize: 22,
				color: colors.parchmentDim,
				marginTop: 24,
				lineHeight: 1.5,
			}}
		>
			<KineticWords text={subtitle} delay={22} stagger={0.8} />
		</div>
	</div>
);

const BgWash: React.FC<{tint?: string}> = ({tint = colors.maroonDeep}) => (
	<AbsoluteFill
		style={{
			background: `radial-gradient(ellipse at 70% 30%, ${colors.maroon} 0%, ${tint} 55%, #0d0504 100%)`,
		}}
	/>
);

export const OracleOfIthaca: React.FC = () => {
	return (
		<AbsoluteFill style={{backgroundColor: colors.bgDark}}>
			{/* 1. COLD OPEN */}
			<Sequence from={0} durationInFrames={COLD_OPEN}>
				<CinematicScene durationInFrames={COLD_OPEN}>
					<Sequence from={21}>{VO('cold-open')}</Sequence>
					<BgWash />
					<EmberField count={50} intensity={1.2} />
					<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
						<div style={{textAlign: 'center'}}>
							<div
								style={{
									fontFamily: uiFont,
									fontSize: 22,
									letterSpacing: 8,
									textTransform: 'uppercase',
									color: colors.bronze,
									marginBottom: 26,
								}}
							>
								<KineticWords text="HackUTA · AI-Powered Urban Digital Twin" delay={8} stagger={1} />
							</div>
							<ShimmerText text="ORACLE OF ITHACA" fontFamily={displayFont} fontSize={118} delay={20} />
							<div style={{marginTop: 30, fontFamily: uiFont, fontSize: 26, color: colors.parchmentDim}}>
								<KineticWords text="Every city has an Odyssey. This is Oracle of Ithaca." delay={21} stagger={2} />
							</div>
						</div>
					</AbsoluteFill>
				</CinematicScene>
			</Sequence>

			{/* 2. OVERVIEW */}
			<Sequence from={COLD_OPEN} durationInFrames={OVERVIEW}>
				<CinematicScene durationInFrames={OVERVIEW}>
					<Sequence from={30}>{VO('overview')}</Sequence>
					<BgWash />
					<EmberField count={16} intensity={0.4} />
					<AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 100px', gap: 70}}>
						<SceneTitle
							numeral="I"
							eyebrow="The City At A Glance"
							title="A living operations dashboard"
							subtitle="38 infrastructure assets, 69 dependency links, four districts — watched in real time."
						/>
						<div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
							<DeviceFrame src="captures/01-overview.jpg" durationInFrames={OVERVIEW} delay={10} width={1000} panY={-40} />
						</div>
					</AbsoluteFill>
					<AbsoluteFill style={{justifyContent: 'flex-end', paddingBottom: 90}}>
						<div style={{display: 'flex', justifyContent: 'center', gap: 70}}>
							<StatBlock value={38} label="Assets" delay={34} />
							<StatBlock value={69} label="Dependency Links" delay={40} />
							<StatBlock value={4} label="Districts" delay={46} />
							<StatBlock value={84} suffix="K" label="Residents" delay={52} />
						</div>
					</AbsoluteFill>
				</CinematicScene>
			</Sequence>

			{/* 3. INCIDENTS */}
			<Sequence from={COLD_OPEN + OVERVIEW} durationInFrames={INCIDENTS}>
				<CinematicScene durationInFrames={INCIDENTS}>
					<Sequence from={30}>{VO('incidents')}</Sequence>
					<BgWash tint="#2a0a08" />
					<EmberField count={20} intensity={0.55} />
					<AbsoluteFill style={{flexDirection: 'row-reverse', alignItems: 'center', padding: '0 100px', gap: 70}}>
						<SceneTitle
							numeral="II"
							eyebrow="The Disruption"
							title="Active incidents, named and traced"
							subtitle="Every record names its origin asset and what it touches downstream."
						/>
						<div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
							<DeviceFrame src="captures/02-incidents.jpg" durationInFrames={INCIDENTS} delay={10} width={1000} tiltIn={8} panY={-30} />
						</div>
					</AbsoluteFill>
					<AbsoluteFill style={{justifyContent: 'flex-end', paddingBottom: 90}}>
						<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
							<div style={{display: 'flex', justifyContent: 'center', gap: 70}}>
								<StatBlock value={153} label="Simulated events" delay={32} />
								<StatBlock value={3} label="Open now" delay={38} />
								<StatBlock value={22} label="Critical" delay={44} />
							</div>
							<div
								style={{
									fontFamily: uiFont,
									fontSize: 15,
									letterSpacing: 3,
									textTransform: 'uppercase',
									color: colors.parchmentDim,
								}}
							>
								<KineticWords text="Power · Water · Fire · Flood · Raid · Earthquake" delay={70} stagger={1.2} />
							</div>
						</div>
					</AbsoluteFill>
				</CinematicScene>
			</Sequence>

			{/* 4. CASCADE */}
			<Sequence from={COLD_OPEN + OVERVIEW + INCIDENTS} durationInFrames={CASCADE}>
				<AbsoluteFill>
					<BgWash tint="#210806" />

					<Sequence from={0} durationInFrames={CASCADE_GRAPH}>
						<CinematicScene durationInFrames={CASCADE_GRAPH}>
							<Sequence from={45}>{VO('cascade')}</Sequence>
							<EmberField count={24} intensity={0.5} />
							<AbsoluteFill style={{padding: '70px 100px'}}>
								<Eyebrow numeral="III" label="The Cascade" delay={4} />
								<div
									style={{
										fontFamily: displayFont,
										fontSize: 52,
										color: colors.parchment,
										maxWidth: 900,
									}}
								>
									<KineticWords text="One failure. A graph decides the rest." delay={10} stagger={3} />
								</div>
							</AbsoluteFill>
							<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingTop: 60}}>
								<div style={{width: '82%', height: '72%'}}>
									<GraphCascade delay={45} recoverAt={220} />
								</div>
							</AbsoluteFill>
							<Sequence from={120} durationInFrames={170}>
								<LowerThird kicker="Deterministic Engine" line="lib/simulation/ — not scripted, not AI" delay={0} />
							</Sequence>
							<Sequence from={300} durationInFrames={CASCADE_GRAPH - 300}>
								<LowerThird
									kicker="Recovery Engine"
									line="recoveryEngine.ts — the same graph, run in reverse"
									delay={0}
								/>
							</Sequence>
							<Sequence from={400} durationInFrames={CASCADE_GRAPH - 400}>
								<AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 150}}>
									<div
										style={{
											fontFamily: uiFont,
											fontSize: 16,
											letterSpacing: 2,
											color: colors.bronzeLight,
										}}
									>
										<KineticWords text="38 assets · 69 links · 4 districts, all recalculated" delay={0} stagger={1} />
									</div>
								</AbsoluteFill>
							</Sequence>
						</CinematicScene>
					</Sequence>

					<Sequence from={CASCADE_GRAPH} durationInFrames={CASCADE_PROOF}>
						<CinematicScene durationInFrames={CASCADE_PROOF}>
							<EmberField count={18} intensity={0.5} />
							<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
								<CityInteraction durationInFrames={CASCADE_PROOF} delay={6} width={1480} />
							</AbsoluteFill>
							<LowerThird kicker="Same Graph, Live" line="The 3D twin mirrors it block by block" delay={14} />
						</CinematicScene>
					</Sequence>
				</AbsoluteFill>
			</Sequence>

			{/* 5. INTELLIGENCE */}
			<Sequence from={COLD_OPEN + OVERVIEW + INCIDENTS + CASCADE} durationInFrames={INTEL}>
				<AbsoluteFill>
					<BgWash />
					<Sequence from={30}>{VO('intel')}</Sequence>

					<Sequence from={0} durationInFrames={INTEL_ADVISORS}>
						<CinematicScene durationInFrames={INTEL_ADVISORS}>
							<EmberField count={16} intensity={0.4} />
							<AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 100px', gap: 70}}>
								<SceneTitle
									numeral="IV"
									eyebrow="The Intelligence"
									title="Athena explains. The Oracle foresees."
									subtitle="Always advisory, never in control."
								/>
								<div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
									<DeviceFrame src="captures/03-advisors.jpg" durationInFrames={INTEL_ADVISORS} delay={10} width={1000} panY={-30} />
									<div
										style={{
											fontFamily: uiFont,
											fontSize: 15,
											letterSpacing: 2,
											color: colors.parchmentDim,
											textTransform: 'uppercase',
										}}
									>
										<KineticWords text="Athena explains incidents · The Oracle reviews recovery plans" delay={55} stagger={1} />
									</div>
								</div>
							</AbsoluteFill>
						</CinematicScene>
					</Sequence>
					<Sequence from={INTEL_ADVISORS} durationInFrames={INTEL_ATHENA}>
						<CinematicScene durationInFrames={INTEL_ATHENA}>
							<EmberField count={16} intensity={0.4} />
							<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
								<DeviceFrame src="captures/04-athena-chat.jpg" durationInFrames={INTEL_ATHENA} delay={6} width={1300} tiltIn={6} />
							</AbsoluteFill>
							<LowerThird kicker="Athena" line={'“Which district needs help first?”'} delay={14} />
						</CinematicScene>
					</Sequence>
				</AbsoluteFill>
			</Sequence>

			{/* 6. BUILT WITH — MLH sponsor tracks */}
			<Sequence from={COLD_OPEN + OVERVIEW + INCIDENTS + CASCADE + INTEL} durationInFrames={SPONSORS}>
				<AbsoluteFill>
					<Sequence from={0} durationInFrames={SPONSOR_INTRO}>
						<CinematicScene durationInFrames={SPONSOR_INTRO}>
							<BgWash />
							<EmberField count={20} intensity={0.5} />
							<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
								<div style={{textAlign: 'center'}}>
									<Eyebrow numeral="V" label="Built With" delay={6} />
									<div
										style={{
											fontFamily: displayFont,
											fontSize: 64,
											color: colors.parchment,
										}}
									>
										<KineticWords text="Five MLH sponsor tracks, one city" delay={16} stagger={3} />
									</div>
								</div>
							</AbsoluteFill>
						</CinematicScene>
					</Sequence>

					{[
						{
							icon: 'ai' as const,
							accent: '#6c8dff',
							eyebrow: 'MLH Partner Challenge',
							name: 'Gemini',
							blurb: 'Athena explains. The Oracle foresees.',
							detail: 'Two advisor personas, grounded in the live city graph.',
							audio: 'sponsor-gemini',
						},
						{
							icon: 'database' as const,
							accent: '#4fbf8f',
							eyebrow: 'MLH Partner Challenge',
							name: 'MongoDB Atlas',
							blurb: 'Every incident has a memory.',
							detail: 'Full incident-to-recovery lifecycle, persisted.',
							audio: 'sponsor-mongodb',
						},
						{
							icon: 'voice' as const,
							accent: '#b28cff',
							eyebrow: 'MLH Partner Challenge',
							name: 'ElevenLabs',
							blurb: 'The city can speak for itself.',
							detail: 'Text + spoken audio, delivered over Telegram.',
							audio: 'sponsor-elevenlabs',
						},
						{
							icon: 'cloud' as const,
							accent: '#5fc9d8',
							eyebrow: 'MLH Partner Challenge',
							name: 'Vultr',
							blurb: 'One server. Real HTTPS.',
							detail: 'Zero Docker — Cloud Compute, behind Caddy.',
							audio: 'sponsor-vultr',
						},
						{
							icon: 'domain' as const,
							accent: '#e0b35f',
							eyebrow: 'MLH Partner Challenge',
							name: 'GoDaddy',
							blurb: 'Ithaca needed a home on the map.',
							detail: 'oracleofithaca.us — registered and live.',
							audio: 'sponsor-godaddy',
						},
					].map((s, i) => {
						const from = SPONSOR_INTRO + SPONSOR_DURATIONS.slice(0, i).reduce((a, b) => a + b, 0);
						const duration = SPONSOR_DURATIONS[i];
						return (
							<Sequence key={s.name} from={from} durationInFrames={duration}>
								<StorySwipe durationInFrames={duration}>
									<Sequence from={9}>{VO(s.audio)}</Sequence>
									<SponsorStory
										index={i}
										total={SPONSOR_DURATIONS.length}
										localDuration={duration}
										icon={s.icon}
										accent={s.accent}
										eyebrow={s.eyebrow}
										name={s.name}
										blurb={s.blurb}
										detail={s.detail}
										compact
									/>
								</StorySwipe>
							</Sequence>
						);
					})}
				</AbsoluteFill>
			</Sequence>

			{/* 7. CLOSING */}
			<Sequence from={COLD_OPEN + OVERVIEW + INCIDENTS + CASCADE + INTEL + SPONSORS} durationInFrames={CLOSING}>
				<CinematicScene durationInFrames={CLOSING}>
					<Sequence from={30}>{VO('closing')}</Sequence>
					<BgWash />
					<EmberField count={54} intensity={1.1} />
					<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
						<div style={{textAlign: 'center'}}>
							<div
								style={{
									fontFamily: uiFont,
									fontSize: 20,
									letterSpacing: 7,
									textTransform: 'uppercase',
									color: colors.bronze,
									marginBottom: 24,
								}}
							>
								<KineticWords text="VI · The Return" delay={6} stagger={2} />
							</div>
							<ShimmerText text="ITHACA COMES BACK ONLINE" fontFamily={displayFont} fontSize={72} delay={16} />
							<div style={{marginTop: 26, fontFamily: uiFont, fontSize: 24, color: colors.parchmentDim}}>
								<KineticWords
									text="Not because the danger wasn't real — but because the choices were good."
									delay={46}
									stagger={1.5}
								/>
							</div>
							<div
								style={{
									marginTop: 20,
									fontFamily: uiFont,
									fontSize: 16,
									letterSpacing: 2,
									textTransform: 'uppercase',
									color: colors.bronze,
								}}
							>
								<KineticWords
									text="Next: side-by-side recovery comparisons, deeper incident timelines."
									delay={310}
									stagger={0.8}
								/>
							</div>
						</div>
					</AbsoluteFill>
					<AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 70}}>
						<div
							style={{
								fontFamily: uiFont,
								fontSize: 18,
								letterSpacing: 3,
								color: colors.parchmentDim,
								opacity: 0.85,
							}}
						>
							ORACLE OF ITHACA — A HACKUTA SUBMISSION
						</div>
						<div
							style={{
								fontFamily: uiFont,
								fontSize: 16,
								letterSpacing: 1,
								color: colors.bronzeLight,
								marginTop: 10,
								opacity: 0.9,
							}}
						>
							oracleofithaca.us · github.com/Iam-samyog/citypulse
						</div>
					</AbsoluteFill>
				</CinematicScene>
			</Sequence>
		</AbsoluteFill>
	);
};
