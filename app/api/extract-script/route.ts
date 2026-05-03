import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  let text = "";

  if (name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    text = data.text;
    await parser.destroy();
  } else if (name.endsWith(".docx")) {
    const data = await mammoth.extractRawText({ buffer });
    text = data.value;
  } else if (name.endsWith(".doc")) {
    return NextResponse.json(
      { error: "Old .doc files are not supported yet. Please save as .docx." },
      { status: 400 }
    );
  } else {
    text = buffer.toString("utf-8");
  }

  return NextResponse.json({ text });
}
