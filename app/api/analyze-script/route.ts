import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const script = body?.script || "";
    const myRole = body?.myRole || "Actor";
    const voiceRole = body?.voiceRole || "Other role";

    if (!script.trim()) {
      return NextResponse.json(
        { error: "No script provided" },
        { status: 400 }
      );
    }

    const analysis = `
TONE:
This scene appears tense, emotional, and layered.

YOUR ROLE (${myRole}):
Play with intention. Listen carefully and react truthfully. Avoid rushing your lines.

VOICE ROLE (${voiceRole}):
The voice should support the rhythm of the scene without overpowering your performance.

SUBTEXT:
There is underlying conflict or emotional pressure beneath the dialogue.

PACING:
Start controlled and grounded. Let intensity build naturally.

KEY MOMENTS:
- Emotional shifts
- Confrontation lines
- Reactions to the other character
`;

    return NextResponse.json({ analysis });

  } catch (error: any) {
    console.error("ANALYZE ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to analyze script" },
      { status: 500 }
    );
  }
}
