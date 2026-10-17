"use client";

import CsvFileManager from "@/components/CsvFileManager";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Globe2,
  Layers3,
  LoaderCircle,
  RefreshCw,
  Signal,
  Smartphone,
  Wifi,
  FileSpreadsheet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const COLORS = [
  "#7866F2",
  "#49A6E9",
  "#41C7A6",
  "#F5B85C",
  "#F17D9B",
  "#8C9DF5",
];

const numberFormat = new Intl.NumberFormat("fr-FR");
const priceFormat = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function formatNumber(value: number) {
  return numberFormat.format(value);
}

function formatPrice(value: number) {
  return priceFormat.format(value);
}

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${accent}`}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">{description}</p>
    </article>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/products");
      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          data !== null &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Impossible de charger les statistiques.";

        throw new Error(message);
      }

      setStats(data as DashboardStats);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur inattendue est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  const providers = useMemo(
    () =>
      Object.entries(stats?.productsByProvider ?? {})
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    [stats]
  );

  const networks = useMemo(
    () =>
      Object.entries(stats?.productsByNetwork ?? {}).map(
        ([name, value]) => ({ name, value })
      ),
    [stats]
  );

  const unlimitedPercentage = stats
    ? (stats.unlimitedProducts / stats.totalProducts) * 100
    : 0;

  const networkTotal = networks.reduce((sum, item) => sum + item.value, 0);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <LoaderCircle
            className="mx-auto animate-spin text-violet-600"
            size={36}
          />
          <p className="mt-4 text-sm text-slate-500">
            Chargement des données MyBestSim...
          </p>
        </div>
      </main>
    );
  }

  if (error || !stats) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <Activity className="mx-auto text-red-500" size={36} />
          <h1 className="mt-4 text-lg font-semibold text-slate-900">
            Impossible de charger le dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {error ?? "Aucune statistique disponible."}
          </p>
          <button
            onClick={() => void loadStats()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <RefreshCw size={16} />
            Réessayer
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] text-slate-900">
      <div className="mx-auto flex max-w-[1600px]">
        
        {/* Sidebar */}
        <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200/80 bg-white p-6 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
              <Signal size={22} />
            </div>
            <p className="text-xl font-bold tracking-tight text-slate-900">
              MyBestSim
            </p>
          </div>

          <button
            onClick={() => setCsvModalOpen(true)}
            className="mt-10 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-medium text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
          >
            <FileSpreadsheet size={19} />
            Gérer les fichiers CSV
          </button>

        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <header className="border-b border-slate-200/80 bg-white px-5 py-5 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 lg:hidden">
                  <Signal size={22} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    MyBestSim / Analytics
                  </p>
                  <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                    Vue d’ensemble
                  </h1>
                </div>
              </div>

              <button
                onClick={() => void loadStats()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-violet-200 hover:bg-violet-50"
              >
                <RefreshCw size={16} />
                Recharger la page
              </button>
            </div>
          </header>

          <div className="space-y-7 p-5 sm:p-8">
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-500 p-6 text-white shadow-sm sm:p-8">
              <div className="relative z-10 max-w-2xl">
                <p className="text-sm font-medium text-violet-100">
                  Tableau de bord des eSIM
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                  Toutes vos offres, en un seul endroit.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-violet-100 sm:text-base">
                  Analysez les prix, comparez les fournisseurs et explorez les
                  caractéristiques du catalogue eSIM.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  {formatNumber(stats.totalProducts)} offres analysées
                </div>
              </div>
              <div className="pointer-events-none absolute -right-8 -top-20 h-64 w-64 rounded-full border-[40px] border-white/10" />
              <div className="pointer-events-none absolute -bottom-28 right-36 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-lg font-bold">Indicateurs clés</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Les principaux chiffres du catalogue.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard
                  title="Total des produits"
                  value={formatNumber(stats.totalProducts)}
                  description="Offres présentes dans les fichiers CSV"
                  icon={Layers3}
                  accent="bg-violet-100 text-violet-700"
                />
                <StatCard
                  title="Prix moyen"
                  value={formatPrice(stats.averagePrice)}
                  description="Prix moyen de l’ensemble des offres"
                  icon={Activity}
                  accent="bg-blue-100 text-blue-700"
                />
                <StatCard
                  title="Données moyennes"
                  value={
                    stats.averageDataGb == null
                      ? "—"
                      : `${stats.averageDataGb.toLocaleString("fr-FR", {
                          maximumFractionDigits: 2,
                        })} Go`
                  }
                  description="Moyenne des offres avec une quantité numérique"
                  icon={Globe2}
                  accent="bg-emerald-100 text-emerald-700"
                />
                <StatCard
                  title="Prix minimum"
                  value={formatPrice(stats.minPrice)}
                  description="Offre la moins chère du catalogue"
                  icon={ArrowDownRight}
                  accent="bg-emerald-100 text-emerald-700"
                />
                <StatCard
                  title="Prix maximum"
                  value={formatPrice(stats.maxPrice)}
                  description="Offre la plus chère du catalogue"
                  icon={ArrowUpRight}
                  accent="bg-rose-100 text-rose-700"
                />
                <StatCard
                  title="Offres à plus de 100 €"
                  value={formatNumber(stats.productsOver100)}
                  description={`${(
                    (stats.productsOver100 / stats.totalProducts) *
                    100
                  ).toLocaleString("fr-FR", {
                    maximumFractionDigits: 1,
                  })} % du catalogue`}
                  icon={Smartphone}
                  accent="bg-amber-100 text-amber-700"
                />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <Panel
                title="Produits par fournisseur"
                subtitle="Classement par nombre d’offres"
                className="xl:col-span-2"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-slate-500">
                    {formatNumber(providers.length)} fournisseurs
                  </span>
                  <span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                    Volume d’offres
                  </span>
                </div>

                <div
                  className="w-full"
                  style={{ height: Math.max(320, providers.length * 35) }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={providers}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 12, bottom: 4 }}
                    >
                      <CartesianGrid
                        stroke="#EEF0F6"
                        horizontal={false}
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "#94A3B8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={105}
                        tick={{ fill: "#64748B", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "#F5F3FF" }}
                        formatter={(value) => [
                          formatNumber(Number(value)),
                          "Produits",
                        ]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #E2E8F0",
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="Produits"
                        fill="#7866F2"
                        radius={[0, 6, 6, 0]}
                        barSize={18}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel
                title="Technologies réseau"
                subtitle="Répartition entre les offres 4G et 5G"
              >
                <div className="relative mx-auto h-64 max-w-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={networks}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={68}
                        outerRadius={94}
                        paddingAngle={5}
                        stroke="none"
                      >
                        {networks.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [
                          formatNumber(Number(value)),
                          "Produits",
                        ]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #E2E8F0",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">
                      {formatNumber(networkTotal)}
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                      produits
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {networks.map((network, index) => (
                    <div
                      key={network.name}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="text-sm font-medium text-slate-700">
                          {network.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold">
                          {formatNumber(network.value)}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">
                          {networkTotal
                            ? `${((network.value / networkTotal) * 100).toLocaleString(
                                "fr-FR",
                                { maximumFractionDigits: 1 }
                              )}%`
                            : "0 %"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <Panel
                title="Forfaits illimités"
                subtitle="Offres sans quantité de données chiffrée"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <Wifi size={26} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">
                      {formatNumber(stats.unlimitedProducts)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      offres illimitées
                    </p>
                  </div>
                </div>

                <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${unlimitedPercentage}%` }}
                  />
                </div>
                <div className="mt-3 flex justify-between text-xs text-slate-500">
                  <span>Part du catalogue</span>
                  <span className="font-semibold text-violet-700">
                    {unlimitedPercentage.toLocaleString("fr-FR", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    %
                  </span>
                </div>
              </Panel>

              <Panel
                title="Recharge des forfaits"
                subtitle="Possibilité de recharger une offre"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs font-medium text-emerald-700">
                      Rechargeables
                    </p>
                    <p className="mt-2 text-2xl font-bold text-emerald-800">
                      {formatNumber(stats.rechargeableProducts)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Non rechargeables
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">
                      {stats.nonRechargeableProducts === undefined
                        ? "—"
                        : formatNumber(stats.nonRechargeableProducts)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Ces indicateurs dépendent des valeurs « oui » et « non »
                  présentes dans la colonne top_up.
                </p>
              </Panel>

              <Panel
                title="Lecture du catalogue"
                subtitle="Résumé des indicateurs"
              >
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-500">Prix moyen</span>
                      <span className="font-semibold">
                        {formatPrice(stats.averagePrice)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (stats.averagePrice / (stats.maxPrice || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-500">
                        Offres à plus de 100 €
                      </span>
                      <span className="font-semibold">
                        {(
                          (stats.productsOver100 / stats.totalProducts) *
                          100
                        ).toLocaleString("fr-FR", {
                          maximumFractionDigits: 1,
                        })}
                        %
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{
                          width: `${
                            (stats.productsOver100 / stats.totalProducts) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs leading-5 text-slate-600">
                      Le catalogue contient{" "}
                      <strong>{formatNumber(stats.totalProducts)}</strong>{" "}
                      offres, avec des prix allant de{" "}
                      <strong>{formatPrice(stats.minPrice)}</strong> à{" "}
                      <strong>{formatPrice(stats.maxPrice)}</strong>.
                    </p>
                  </div>
                </div>
              </Panel>
            </section>

            <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row">
              <span>MyBestSim · Tableau de bord des eSIM</span>
              <span>
                Statistiques calculées à partir des fichiers fournisseurs
              </span>
            </footer>
          </div>
        </div>
        <CsvFileManager
          open={csvModalOpen}
          onClose={() => setCsvModalOpen(false)}
          onStatsUpdated={(newStats) => setStats(newStats)}
        />
      </div>
    </main>
  );
}