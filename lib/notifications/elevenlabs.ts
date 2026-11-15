
const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export async function generateAnnouncementAudio(
  text: string
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is missing.");
  }

  if (!voiceId) {
    throw new Error("ELEVENLABS_VOICE_ID is missing.");
  }

  const response = await fetch(
    `${ELEVENLABS_URL}/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
        },
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs error (${response.status}): ${error}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());

  if (!audio.length) {
    throw new Error("ElevenLabs returned empty audio.");
  }

  return audio;
}
