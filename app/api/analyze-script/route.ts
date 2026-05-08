import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { script, myRole, voiceRole } = await req.json();

    if (!script) {
      return NextResponse.json(
        { error: "No script provided" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        analysis: `
TONE:
The scene appears emotionally tense and layered.

YOUR ROLE (${myRole || "selected role"}):
Listen carefully, react truthfully, and let the emotion build naturally.

VOICE ROLE (${voiceRole || "voice role"}):
The reader should support your rhythm without overpowering your performance.

SUBTEXT:
There is pressure, fear, or conflict beneath the words.

PACING:
Do not rush. Let important turns breathe.

KEY MOMENTS:
- Emotional shifts
- Confrontation lines
- Final reaction
        `,
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `
You are an expert acting coach.

Analyze this audition script.

Actor role: ${myRole || "N/A"}
AI voice reader role: ${voiceRole || "N/A"}

Return clear notes with:
1. Tone
2. Emotional state of each main role
3. How the actor should play ${myRole || "their role"}
4. Subtext
5. Pacing
6. Key moments to emphasize

SCRIPT:
${script}
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || "OpenAI analysis failed" },
        { status: 500 }
      );
    }

    const data = await response.json();

    let analysis = data.output_text || "";

    if (!analysis && Array.isArray(data.output)) {
      analysis = data.output
        .map((item: any) =>
          item.content?.map((c: any) => c.text || "").join("")
        )
        .join("\n");
    }

    return NextResponse.json({
      analysis: analysis || "No analysis returned.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to analyze script" },
      { status: 500 }
    );
  }
}
