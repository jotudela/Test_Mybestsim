import { NextResponse } from "next/server";
import { readAllCsv } from "@/lib/csv-reader";
import { getDashboardStats } from "@/lib/dashboard-stats";

export async function GET() {
  try {
    const files = await readAllCsv();
    const stats = getDashboardStats(files);

    return NextResponse.json(stats);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de calculer les statistiques." },
      { status: 500 }
    );
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();

    const selectedFiles: unknown = body.selectedFiles;
    const temporaryFiles: unknown = body.temporaryFiles ?? [];

    if (
      !Array.isArray(selectedFiles) ||
      !selectedFiles.every(
        (file) =>
          typeof file === "string" &&
          file.toLowerCase().endsWith(".csv") &&
          !file.includes("/") &&
          !file.includes("\\")
      ) ||
      !Array.isArray(temporaryFiles)
    ) {
      return NextResponse.json(
        { error: "La liste des fichiers est invalide." },
        { status: 400 }
      );
    }

    const allFiles = await readAllCsv();
    const availableNames = new Set(allFiles.map((file) => file.file));

    if (selectedFiles.some((file) => !availableNames.has(file))) {
      return NextResponse.json(
        { error: "Un ou plusieurs fichiers sont inconnus." },
        { status: 400 }
      );
    }

    const validTemporaryFiles = temporaryFiles.every(
      (file) =>
        file &&
        typeof file.name === "string" &&
        file.name.toLowerCase().endsWith(".csv") &&
        Array.isArray(file.products) &&
        file.products.every(
          (product: unknown) =>
            product !== null &&
            typeof product === "object" &&
            !Array.isArray(product)
        )
    );

    if (!validTemporaryFiles) {
      return NextResponse.json(
        { error: "Un fichier CSV temporaire est invalide." },
        { status: 400 }
      );
    }

    const selected = allFiles.filter((file) =>
      selectedFiles.includes(file.file)
    );

    const imported = temporaryFiles.map(
      (file: { name: string; products: Record<string, unknown>[] }) => ({
        file: file.name,
        products: file.products,
      })
    );

    const stats = getDashboardStats([...selected, ...imported]);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Erreur POST /api/stats :", error);

    return NextResponse.json(
      { error: "Impossible de recalculer les statistiques." },
      { status: 500 }
    );
  }
}