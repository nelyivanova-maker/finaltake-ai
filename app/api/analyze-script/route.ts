import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "AI voice API not connected yet. Browser voice fallback should be used." },
      { status: 501 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "TTS failed" },
      { status: 500 }
    );
  }
}
