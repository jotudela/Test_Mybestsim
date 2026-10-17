
import { NextResponse } from "next/server";
import { readAllCsv } from "@/lib/csv-reader";
import { getDashboardStats } from "@/lib/dashboard-stats";
import type { Product, CsvFile } from "@/types/product";

type TemporaryCsvInput = {
  name: string;
  products: Record<string, unknown>[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeProduct(row: Record<string, unknown>): Product {
  const requiredString = (value: unknown, field: string): string => {
    if (value === null || value === undefined || String(value).trim() === "") {
      throw new Error(`Champ obligatoire manquant : ${field}`);
    }

    return String(value).trim();
  };

  const numberOrNull = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const price = numberOrNull(row.price);
  const validityDays = numberOrNull(row.validity_days);

  if (price === null || price < 0) {
    throw new Error("Prix invalide dans un fichier CSV.");
  }

  if (
    validityDays === null ||
    validityDays < 0
  ) {
    throw new Error("Durée de validité invalide dans un fichier CSV.");
  }

  const topUpValue = String(row.top_up ?? "").trim().toLowerCase();

  let topUp: string | boolean;

  if (["oui", "yes", "true", "1"].includes(topUpValue)) {
    topUp = true;
  } else if (["non", "no", "false", "0"].includes(topUpValue)) {
    topUp = false;
  } else {
    topUp = String(row.top_up ?? "");
  }

  return {
    sku: requiredString(row.sku, "sku"),
    provider: requiredString(row.provider, "provider"),
    product_name: requiredString(row.product_name, "product_name"),
    country_code: requiredString(row.country_code, "country_code"),
    country_name: requiredString(row.country_name, "country_name"),
    data_gb: numberOrNull(row.data_gb),
    data_display: String(row.data_display ?? ""),
    validity_days: validityDays,
    price,
    currency: String(row.currency ?? "EUR"),
    network: String(row.network ?? ""),
    top_up: topUp,
  };
}

function isTemporaryCsv(value: unknown): value is TemporaryCsvInput {
  if (!isRecord(value)) return false;

  return (
    typeof value.name === "string" &&
    value.name.toLowerCase().endsWith(".csv") &&
    Array.isArray(value.products) &&
    value.products.every(isRecord)
  );
}

export async function GET() {
  try {
    const files: CsvFile[] = await readAllCsv();
    const stats = getDashboardStats(files);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Erreur GET /api/products :", error);

    return NextResponse.json(
      { error: "Impossible de calculer les statistiques." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const selectedFiles: unknown = body.selectedFiles;
    const temporaryFiles: unknown = body.temporaryFiles ?? [];

    if (
      !Array.isArray(selectedFiles) ||
      !selectedFiles.every(
        (file): file is string =>
          typeof file === "string" &&
          file.toLowerCase().endsWith(".csv") &&
          !file.includes("/") &&
          !file.includes("\\")
      ) ||
      !Array.isArray(temporaryFiles) ||
      !temporaryFiles.every(isTemporaryCsv)
    ) {
      return NextResponse.json(
        { error: "La liste des fichiers est invalide." },
        { status: 400 }
      );
    }

    const allFiles: CsvFile[] = await readAllCsv();
    const availableNames = new Set(allFiles.map((file) => file.file));

    if (selectedFiles.some((file) => !availableNames.has(file))) {
      return NextResponse.json(
        { error: "Un ou plusieurs fichiers sont inconnus." },
        { status: 400 }
      );
    }

    const selected: CsvFile[] = allFiles.filter((file) =>
      selectedFiles.includes(file.file)
    );

    const imported: CsvFile[] = temporaryFiles.map((file) => ({
      file: file.name,
      products: file.products.map(normalizeProduct),
    }));

    const stats = getDashboardStats([...selected, ...imported]);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Erreur POST /api/products :", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de recalculer les statistiques.",
      },
      { status: 500 }
    );
  }
}