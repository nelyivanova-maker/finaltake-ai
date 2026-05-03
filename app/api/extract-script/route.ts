import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { script, myRole } = await req.json();

    if (!script) {
      return NextResponse.json({ error: "No script provided" }, { status: 400 });
    }

    const analysis = `
TONE:
This scene is tense and emotionally charged.

YOUR ROLE (${myRole || "selected role"}):
Play it truthfully. Listen, react, and let the emotion build naturally.

SUBTEXT:
There is fear, pressure, or conflict under the words.

PACING:
Do not rush. Let key moments breathe.

KEY MOMENTS:
- First emotional shift
- Any accusation or threat
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
