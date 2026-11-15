
const TELEGRAM_URL = "https://api.telegram.org";

export interface RecipientResult {
  chatId: string;
  textSent: boolean;
  audioSent: boolean;
  error?: string;
}

export interface BroadcastResult {
  totalRecipients: number;
  textDelivered: number;
  audioDelivered: number;
  failedRecipients: number;
  results: RecipientResult[];
}

function getRecipientChatIds(): string[] {
  const configured =
    process.env.TELEGRAM_CHAT_IDS ||
    process.env.TELEGRAM_CHAT_ID ||
    "";

  return [
    ...new Set(
      configured
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    ),
  ];
}

async function telegramRequest(
  method: string,
  form: FormData
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing.");
  }

  const response = await fetch(
    `${TELEGRAM_URL}/bot${token}/${method}`,
    {
      method: "POST",
      body: form,
      cache: "no-store",
    }
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description || `Telegram ${method} failed.`
    );
  }
}

async function sendText(
  chatId: string,
  text: string
): Promise<void> {
  const form = new FormData();

  form.append("chat_id", chatId);
  form.append("text", text);

  await telegramRequest("sendMessage", form);
}

async function sendAudio(
  chatId: string,
  audioBuffer: Buffer,
  caption: string
): Promise<void> {
  const form = new FormData();

  form.append("chat_id", chatId);
  form.append(
    "audio",
    new Blob([new Uint8Array(audioBuffer)], {
      type: "audio/mpeg",
    }),
    "citypulse-emergency.mp3"
  );
  form.append("caption", caption.slice(0, 1024));

  await telegramRequest("sendAudio", form);
}

export async function broadcastAlert(
  announcement: string,
  audioBuffer: Buffer
): Promise<BroadcastResult> {
  const chatIds = getRecipientChatIds();

  if (!chatIds.length) {
    throw new Error("No Telegram recipients are configured.");
  }

  const results: RecipientResult[] = [];

  for (const chatId of chatIds) {
    const result: RecipientResult = {
      chatId,
      textSent: false,
      audioSent: false,
    };

    try {
      await sendText(chatId, announcement);
      result.textSent = true;
    } catch (error) {
      result.error =
        error instanceof Error ? error.message : "Text delivery failed.";
    }

    // Try audio independently, even if text delivery failed.
    try {
      await sendAudio(
        chatId,
        audioBuffer,
        "CITYPULSE emergency announcement"
      );
      result.audioSent = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Audio delivery failed.";

      result.error = result.error
        ? `${result.error}; ${message}`
        : message;
    }

    results.push(result);
  }

  return {
    totalRecipients: results.length,
    textDelivered: results.filter((item) => item.textSent).length,
    audioDelivered: results.filter((item) => item.audioSent).length,
    failedRecipients: results.filter(
      (item) => !item.textSent || !item.audioSent
    ).length,
    results,
  };
}
