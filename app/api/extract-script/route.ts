// @ts-nocheck

export const runtime = "nodejs";

function detectRoles(text: string) {
  const roles = new Set<string>();

  text.split(/\n+/).forEach((line) => {
    const trimmed = line.trim();

    const match = trimmed.match(/^([A-Z][A-Z\s]{1,30}|[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)(?:\s*\(.*?\))?:?/);

    if (match) {
      const role = match[1].trim();

      const ignored = [
        "INT",
        "EXT",
        "DAY",
        "NIGHT",
        "Character Notes",
        "Self Tape Script",
      ];

      if (!ignored.includes(role) && role.length > 1 && role.length < 30) {
        roles.add(role.toUpperCase());
      }
    }
  });

  return Array.from(roles);
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = file.name.toLowerCase();

  let text = "";

  try {
    if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else if (fileName.endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (fileName.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return Response.json(
        { error: "Only TXT, PDF and DOCX files are supported." },
        { status: 400 }
      );
    }

    const roles = detectRoles(text);

    return Response.json({
      text,
      roles,
    });
  } catch (error) {
    return Response.json(
      { error: "Could not read this file." },
      { status: 500 }
    );
  }
}
