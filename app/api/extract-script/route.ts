import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { script, myRole } = await req.json();

    if (!script) {
      return NextResponse.json(
        { error: "No script provided" },
        { status: 400 }
      );
    }

    const analysis = `
TONE:
This scene is emotionally tense and layered.

YOUR ROLE (${myRole || "selected role"}):
Play with intention. Listen and react truthfully. Let the emotion build naturally.

SUBTEXT:
There is pressure and unspoken conflict beneath the dialogue.

PACING:
Do not rush. Let key moments breathe.

KEY MOMENTS:
- Emotional shifts
- Confrontation lines
- Reactions to other characters
`;

    return NextResponse.json({ analysis });

  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to analyze script" },
      { status: 500 }
    );
  }
}
