import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const script = body?.script || "";
    const myRole = body?.myRole || "Actor";

    if (!script.trim()) {
      return NextResponse.json(
        { error: "No script provided" },
        { status: 400 }
      );
    }

    // SIMPLE SAFE ANALYSIS (no external API yet)
    const analysis = `
TONE:
This scene appears tense and emotionally driven.

YOUR ROLE (${myRole}):
Play with intention. Focus on reacting truthfully to the other character. Avoid rushing the lines.

SUBTEXT:
There is underlying conflict or fear beneath the dialogue. The characters are not fully saying what they feel.

PACING:
Start controlled and grounded. Let intensity build gradually.

KEY MOMENTS:
- Emotional shifts in dialogue
- Confrontation lines
- Reactions to other characters
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
