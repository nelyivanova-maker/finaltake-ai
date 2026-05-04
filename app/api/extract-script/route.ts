import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { script, myRole, voiceRole } = await req.json();

    if (!script) {
      return NextResponse.json({ error: "No script provided" }, { status: 400 });
    }

    const analysis = `
TONE:
The scene feels tense, emotional, and uncertain.

YOUR ROLE (${myRole || "selected role"}):
Play it truthfully. Listen carefully, react naturally, and let the emotion build.

VOICE ROLE (${voiceRole || "voice role"}):
The voice should support the rhythm of the scene without overpowering your performance.

SUBTEXT:
There is fear, pressure, or conflict beneath the words.

PACING:
Do not rush. Let key moments breathe.

KEY MOMENTS:
- Emotional shifts
- Confrontation lines
- Final reaction
`;

    return NextResponse.json({ analysis });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to analyze script" },
      { status: 500 }
    );
  }
}
