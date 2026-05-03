import { NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    let text = "";

    if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else if (name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "PDF not supported yet. Please upload .docx or .txt." },
        { status: 400 }
      );
    } else if (name.endsWith(".doc")) {
      return NextResponse.json(
        { error: "Please convert .doc to .docx." },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: "Unsupported file type." },
        { status: 400 }
      );
    }

    // Clean weird characters
    text = text
      .replace(/\r/g, "")
      .replace(/\t/g, " ")
      .replace(/\u0000/g, "")
      .trim();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("EXTRACT SCRIPT ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to process file" },
      { status: 500 }
    );
  }
}
