
import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  try {
    const folderPath = path.join(process.cwd(), "data", "providers");
    const entries = await readdir(folderPath);
    const files = entries
      .filter((file) => file.toLowerCase().endsWith(".csv"))
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ files });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de récupérer les fichiers CSV." },
      { status: 500 }
    );
  }
}
