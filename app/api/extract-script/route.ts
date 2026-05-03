import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { script, myRole, voiceRole, extraRole1, extraRole2 } = await req.json();

    if (!script) {
      return NextResponse.json(
        { error: "No script provided" },
        { status: 400 }
      );
    }

    const prompt = `
You are an expert acting coach.

Analyze the following script and provide clear guidance for an actor.

Actor role: ${myRole || "N/A"}
Voice role: ${voiceRole || "N/A"}
Extra role 1: ${extraRole1 || "N/A"}
Extra role 2: ${extraRole2 || "N/A"}

Please respond with:

1. Overall tone of the scene
2. Emotional state of each role
3. How the actor should perform ${myRole || "their role"}
4. Subtext (what is really going on beneath the dialogue)
5. Pacing advice
6. Key moments to emphasize

SCRIPT:
${script}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", errorText);

      return NextResponse.json(
        { error: "Failed to analyze script" },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Extract text safely
    let analysis = "";

    if (data.output_text) {
      analysis = data.output_text;
    } else if (data.output && data.output.length > 0) {
      analysis = data.output
        .map((item: any) =>
          item.content?.map((c: any) => c.text).join("")
        )
        .join("\n");
    } else {
      analysis = "No analysis returned.";
    }

    return NextResponse.json({ analysis });

  } catch (error: any) {
    console.error("Analyze Script Error:", error);

    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
