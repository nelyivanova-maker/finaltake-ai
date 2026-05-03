import { NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    let text = "";

    if (name.endsWith(".pdf")) {
      // dynamic import to avoid build issues
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as any).default;

      const data = await pdfParse(buffer);
      text = data.text;

    } else if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;

    } else if (name.endsWith(".doc")) {
      return NextResponse.json(
        { error: "Please convert .doc files to .docx first." },
        { status: 400 }
      );

    } else {
      text = buffer.toString("utf-8");
    }

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to process file",
      },
      { status: 500 }
    );
  }
}
