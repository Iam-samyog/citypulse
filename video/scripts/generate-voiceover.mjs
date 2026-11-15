import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {parseFile} from 'music-metadata';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');

function loadEnv(file) {
	const text = fs.readFileSync(file, 'utf8');
	const env = {};
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const idx = trimmed.indexOf('=');
		if (idx === -1) continue;
		env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
	}
	return env;
}

const env = loadEnv(path.join(root, '.env.local'));
const apiKey = env.ELEVENLABS_API_KEY;
const voiceId = env.ELEVENLABS_VOICE_ID;

if (!apiKey || !voiceId) {
	console.error('Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID in .env.local');
	process.exit(1);
}

const lines = [
	{id: 'cold-open', text: 'Every city has an Odyssey. This is Oracle of Ithaca.'},
	{id: 'overview', text: 'A living city model: thirty-eight infrastructure assets, sixty-nine dependency links, four districts, watched in real time.'},
	{id: 'incidents', text: 'Every incident has a name, an origin, and a blast radius, and the dashboard shows exactly what it touches downstream.'},
	{id: 'cascade', text: 'One failure. A graph decides the rest. A deterministic engine calculates how damage spreads, and when crews respond, the same graph runs in reverse, healing it block by block.'},
	{id: 'intel', text: "Athena explains what happened. The Oracle helps you decide what's next. Two Gemini powered advisors, grounded in the live city. Always counsel, never control."},
	{id: 'sponsor-gemini', text: 'Built with Gemini.'},
	{id: 'sponsor-mongodb', text: 'MongoDB Atlas.'},
	{id: 'sponsor-elevenlabs', text: 'Eleven Labs.'},
	{id: 'sponsor-vultr', text: 'Vultr.'},
	{id: 'sponsor-godaddy', text: 'And GoDaddy.'},
	{id: 'closing', text: "Ithaca comes back online, not because the danger wasn't real, but because the choices were good. Oracle of Ithaca. A HackUTA submission."},
];

const outDir = path.join(__dirname, '..', 'public', 'audio');
fs.mkdirSync(outDir, {recursive: true});

const results = [];

for (const line of lines) {
	const response = await fetch(
		`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
		{
			method: 'POST',
			headers: {
				'xi-api-key': apiKey,
				'Content-Type': 'application/json',
				Accept: 'audio/mpeg',
			},
			body: JSON.stringify({
				text: line.text,
				model_id: 'eleven_flash_v2_5',
				voice_settings: {stability: 0.5, similarity_boost: 0.75},
			}),
		}
	);

	if (!response.ok) {
		const errText = await response.text();
		console.error(`ElevenLabs error for ${line.id} (${response.status}): ${errText}`);
		process.exit(1);
	}

	const buffer = Buffer.from(await response.arrayBuffer());
	const outPath = path.join(outDir, `${line.id}.mp3`);
	fs.writeFileSync(outPath, buffer);

	const meta = await parseFile(outPath);
	const duration = meta.format.duration ?? 0;

	results.push({id: line.id, text: line.text, duration});
	console.log(`${line.id}: ${duration.toFixed(2)}s`);
}

fs.writeFileSync(
	path.join(__dirname, 'voiceover-durations.json'),
	JSON.stringify(results, null, 2)
);

const total = results.reduce((sum, r) => sum + r.duration, 0);
console.log(`\nTotal narration: ${total.toFixed(2)}s`);
