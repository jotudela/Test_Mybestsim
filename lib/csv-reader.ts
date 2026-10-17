import "server-only";

import Papa from "papaparse";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export async function readAllCsv() {
  const folderPath = path.join(
    process.cwd(),
    "data",
    "providers"
  );

  // Récupérer tous les fichiers CSV du dossier
  const files = (await readdir(folderPath)).filter((file) =>
    file.toLowerCase().endsWith(".csv")
  );

  // Lire et parser chaque fichier
  const results = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(folderPath, file);
      const content = await readFile(filePath, "utf-8");

      const parsed = Papa.parse<Record<string, string | number | boolean>>(
        content,
        {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
        }
      );

      if (parsed.errors.length > 0) {
        throw new Error(
          `Erreur dans ${file} : ${parsed.errors[0].message}`
        );
      }

      return {
        file,
        products: parsed.data,
      };
    })
  );

  return results;
}