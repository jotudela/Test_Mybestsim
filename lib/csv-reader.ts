
import "server-only";

import Papa from "papaparse";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { Product, CsvFile } from "@/types/product";

function normalizeProduct(row: Record<string, unknown>): Product {
  const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const topUpValue = String(row.top_up ?? "").trim().toLowerCase();

  let topUp: string | boolean;
  if (["oui", "yes", "true", "1"].includes(topUpValue)) {
    topUp = true;
  } else if (["non", "no", "false", "0"].includes(topUpValue)) {
    topUp = false;
  } else {
    topUp = String(row.top_up ?? "");
  }

  const price = toNumber(row.price);
  const validityDays = toNumber(row.validity_days);

  if (price === null || validityDays === null) {
    throw new Error("Prix ou durée de validité invalide dans le CSV.");
  }

  return {
    sku: String(row.sku ?? ""),
    provider: String(row.provider ?? ""),
    product_name: String(row.product_name ?? ""),
    country_code: String(row.country_code ?? ""),
    country_name: String(row.country_name ?? ""),
    data_gb: toNumber(row.data_gb),
    data_display: String(row.data_display ?? ""),
    validity_days: validityDays,
    price,
    currency: String(row.currency ?? "EUR"),
    network: String(row.network ?? ""),
    top_up: topUp,
  };
}

export async function readAllCsv(): Promise<CsvFile[]> {
  const folderPath = path.join(process.cwd(), "data", "providers");

  const files = (await readdir(folderPath))
    .filter((file) => file.toLowerCase().endsWith(".csv"))
    .sort((a, b) => a.localeCompare(b));

  const results = await Promise.all(
    files.map(async (file): Promise<CsvFile> => {
      const filePath = path.join(folderPath, file);
      const content = await readFile(filePath, "utf-8");

      const parsed = Papa.parse<Record<string, unknown>>(content, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });

      if (parsed.errors.length > 0) {
        throw new Error(
          `Erreur dans ${file} : ${parsed.errors[0].message}`
        );
      }

      const products = parsed.data.map(normalizeProduct);

      return { file, products };
    })
  );

  return results;
}