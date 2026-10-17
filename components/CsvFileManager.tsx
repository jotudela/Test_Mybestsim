"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileSpreadsheet,
  LoaderCircle,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import Papa from "papaparse";

type DashboardStats = {
  totalProducts: number;
  productsOver100: number;
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  averageDataGb: number;
  unlimitedProducts: number;
  rechargeableProducts: number;
  nonRechargeableProducts?: number;
  productsByProvider: Record<string, number>;
  productsByNetwork: Record<string, number>;
};

type TemporaryCsv = {
  id: string;
  name: string;
  products: Record<string, unknown>[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onStatsUpdated: (stats: DashboardStats) => void;
};

const REQUIRED_COLUMNS = [
  "sku",
  "provider",
  "product_name",
  "country_code",
  "country_name",
  "data_gb",
  "data_display",
  "validity_days",
  "price",
  "currency",
  "network",
  "top_up",
];

export default function CsvFileManager({
  open,
  onClose,
  onStatsUpdated,
}: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [savedFiles, setSavedFiles] = useState<string[]>([]);
  const [draftFiles, setDraftFiles] = useState<string[]>([]);

  const [savedUploads, setSavedUploads] = useState<TemporaryCsv[]>([]);
  const [draftUploads, setDraftUploads] = useState<TemporaryCsv[]>([]);

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [error, setError] = useState("");

  const initialized = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = loading || updating || importing;

  useEffect(() => {
    if (!open) return;

    setDraftFiles(savedFiles);
    setDraftUploads(savedUploads);
    setError("");

    if (initialized.current) return;

    let cancelled = false;

    async function initialize() {
      setLoading(true);

      try {
        const response = await fetch("/api/providers");

        if (!response.ok) {
          throw new Error("Impossible de récupérer les fichiers CSV.");
        }

        const data = await response.json();

        if (cancelled) return;

        const availableFiles: string[] = data.files;

        setFiles(availableFiles);
        setSavedFiles(availableFiles);
        setDraftFiles(availableFiles);
        initialized.current = true;
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les fichiers."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [open, savedFiles, savedUploads]);

  function closeWithoutSaving() {
    if (busy) return;

    setDraftFiles(savedFiles);
    setDraftUploads(savedUploads);
    setDragged(null);
    setError("");
    onClose();
  }

  async function applyChanges() {
    if (busy) return;

    setUpdating(true);
    setError("");

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedFiles: draftFiles,
          temporaryFiles: draftUploads.map(({ name, products }) => ({
            name,
            products,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de recalculer les statistiques."
        );
      }

      setSavedFiles([...draftFiles]);
      setSavedUploads([...draftUploads]);

      onStatsUpdated(data as DashboardStats);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de recalculer les statistiques."
      );
    } finally {
      setUpdating(false);
    }
  }

  function moveFile(file: string, include: boolean) {
    setDraftFiles((current) =>
      include
        ? [...new Set([...current, file])]
        : current.filter((name) => name !== file)
    );

    setDragged(null);
  }

  
  async function importCsv(file: File) {
    setImporting(true);
    setError("");

    try {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        throw new Error("Sélectionne un fichier CSV.");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Le fichier ne doit pas dépasser 5 Mo.");
      }

      const result = await new Promise<Papa.ParseResult<Record<string, unknown>>>(
        (resolve, reject) => {
          Papa.parse<Record<string, unknown>>(file, {
            header: true,
            skipEmptyLines: "greedy",
            dynamicTyping: true,

            complete: (parsedResult) => {
              resolve(parsedResult);
            },

            error: (parseError) => {
              reject(parseError);
            },
          });
        }
      );

      if (result.errors.length > 0) {
        throw new Error(
          `Erreur de lecture du CSV : ${result.errors[0].message}`
        );
      }

      const products = result.data.filter(
        (row) =>
          row &&
          Object.values(row).some(
            (value) =>
              value !== null && value !== undefined && value !== ""
          )
      );

      if (products.length === 0) {
        throw new Error("Ce fichier CSV ne contient aucune donnée.");
      }

      const columns = Object.keys(products[0]).map((column) =>
        column.replace(/^\uFEFF/, "").trim()
      );

      const missing = REQUIRED_COLUMNS.filter(
        (column) => !columns.includes(column)
      );

      if (missing.length > 0) {
        throw new Error(
          `Colonnes manquantes : ${missing.join(", ")}`
        );
      }

      const imported: TemporaryCsv = {
        id: crypto.randomUUID(),
        name: file.name,
        products,
      };

      setDraftUploads((current) => [...current, imported]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'importer ce CSV."
      );
    } finally {
      setImporting(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  useEffect(() => {
    if (!open || busy) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeWithoutSaving();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  if (!open) return null;

  function fileCard(file: string) {
    return (
      <div
        key={file}
        draggable={!busy}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", file);
          setDragged(file);
        }}
        onDragEnd={() => setDragged(null)}
        className={`flex cursor-grab items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm transition hover:border-violet-300 active:cursor-grabbing ${
          dragged === file ? "opacity-40" : ""
        }`}
      >
        <FileSpreadsheet
          size={20}
          className="shrink-0 text-emerald-600"
        />
        <span className="break-all font-medium text-slate-700">
          {file}
        </span>
      </div>
    );
  }

  function temporaryFileCard(file: TemporaryCsv) {
    return (
      <div
        key={file.id}
        className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm"
      >
        <div className="flex min-w-0 items-center gap-3">
          <FileSpreadsheet
            size={20}
            className="shrink-0 text-violet-600"
          />

          <div className="min-w-0">
            <p className="break-all font-medium text-slate-700">
              {file.name}
            </p>
            <p className="text-xs text-violet-600">
              Import temporaire · {file.products.length} lignes
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            setDraftUploads((current) =>
              current.filter((item) => item.id !== file.id)
            )
          }
          className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600 disabled:opacity-50"
          aria-label={`Retirer ${file.name}`}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          void applyChanges();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
          <div>
            <h2
              id="csv-modal-title"
              className="text-lg font-bold text-slate-900 sm:text-xl"
            >
              Gestion des fichiers CSV
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Glisse les fichiers pour inclure ou exclure leurs données.
            </p>
          </div>

          <button
            type="button"
            onClick={closeWithoutSaving}
            disabled={busy}
            aria-label="Fermer sans enregistrer"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-6">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <LoaderCircle className="animate-spin" size={20} />
              Chargement des fichiers...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();

                  const file =
                    event.dataTransfer.getData("text/plain") || dragged;

                  if (file && files.includes(file)) {
                    moveFile(file, true);
                  }
                }}
                className="min-h-64 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-4"
              >
                <h3 className="font-semibold text-emerald-800">
                  Pris en compte (
                  {draftFiles.length + draftUploads.length})
                </h3>

                <p className="mb-4 mt-1 text-xs text-slate-500">
                  Les fichiers utilisés dans les statistiques.
                </p>

                <div className="space-y-2">
                  {files
                    .filter((file) => draftFiles.includes(file))
                    .map(fileCard)}

                  {draftUploads.map(temporaryFileCard)}
                </div>
              </div>

              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();

                  const file =
                    event.dataTransfer.getData("text/plain") || dragged;

                  if (file && files.includes(file)) {
                    moveFile(file, false);
                  }
                }}
                className="min-h-64 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4"
              >
                <h3 className="font-semibold text-slate-800">
                  Non pris en compte ({files.length - draftFiles.length})
                </h3>

                <p className="mb-4 mt-1 text-xs text-slate-500">
                  Les fichiers exclus des statistiques.
                </p>

                <div className="space-y-2">
                  {files
                    .filter((file) => !draftFiles.includes(file))
                    .map(fileCard)}
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            {draftFiles.length + draftUploads.length} fichier(s) pris en
            compte, dont {draftUploads.length} import(s) temporaire(s).
          </p>
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-white p-4 sm:p-5">
          <button
            type="button"
            onClick={closeWithoutSaving}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Fermer sans enregistrer
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void importCsv(file);
              }
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
          >
            {importing ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <Upload size={17} />
            )}
            Importer un CSV
          </button>

          <button
            type="button"
            onClick={() => void applyChanges()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {updating ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <RefreshCw size={17} />
            )}
            Actualiser les statistiques
          </button>
        </footer>
      </section>
    </div>
  );
}
