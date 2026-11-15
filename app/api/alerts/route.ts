
import { NextRequest, NextResponse } from "next/server";

import {
  createAnnouncement,
  type AlertPayload,
} from "@/lib/notifications/announcement";

import { generateAnnouncementAudio } from "@/lib/notifications/elevenlabs";
import { broadcastAlert } from "@/lib/notifications/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let audioBuffer: Buffer | null = null;

  try {
    // IMPORTANT:
    // Protect this endpoint using your existing CITYPULSE admin
    // authentication/authorization system before production deployment.

    const payload = (await request.json()) as AlertPayload;

    if (
      payload?.source !== "CITYPULSE" ||
      payload?.scope !== "citywide"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid alert source or scope." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(payload.incidents) ||
      payload.incidents.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "No active incidents to announce." },
        { status: 400 }
      );
    }

    if (payload.incidents.length > 50) {
      return NextResponse.json(
        { success: false, error: "Too many incidents in one alert." },
        { status: 400 }
      );
    }

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error("Telegram bot configuration is missing.");
    }

    if (
      !process.env.TELEGRAM_CHAT_IDS &&
      !process.env.TELEGRAM_CHAT_ID
    ) {
      throw new Error("No Telegram recipients are configured.");
    }

    // 1. Generate deterministic announcement text.
    const announcement = createAnnouncement(payload);

    // 2. Generate audio once for this alert.
    audioBuffer = await generateAnnouncementAudio(announcement);

    // 3. Send text and the same audio to all configured recipients.
    const delivery = await broadcastAlert(
      announcement,
      audioBuffer
    );

    const success = delivery.failedRecipients === 0;

    return NextResponse.json(
      {
        success,
        message: success
          ? "Emergency alert delivered successfully."
          : "Alert sent with some delivery failures.",
        announcement,
        delivery,
      },
      { status: success ? 200 : 207 }
    );
  } catch (error) {
    console.error(
      "CITYPULSE emergency alert error:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Emergency alert processing failed.",
      },
      { status: 500 }
    );
  } finally {
    // Release our reference to the in-memory audio buffer.
    // This does not erase memory securely or delete Telegram's delivered copy.
    audioBuffer = null;
  }
}
