import type { Product } from "@/types/product";

type CsvFile = {
  file: string;
  products: Product[];
};

export function getDashboardStats(files: CsvFile[]) {
  // Regrouper les produits de tous les fichiers
  const products = files.flatMap((file) => file.products);

  // Conserver les prix valides
  const pricedProducts = products.filter(
    (product) =>
      Number.isFinite(product.price) && product.price >= 0
  );

  const prices = pricedProducts.map((product) => product.price);

  // Les offres illimitées n'ont pas de quantité numérique
  const productsWithData = products.filter(
    (product) =>
      product.data_gb !== null &&
      Number.isFinite(product.data_gb) &&
      product.data_gb >= 0
  );

  // Répartition par fournisseur
  const productsByProvider = products.reduce<Record<string, number>>(
    (acc, product) => {
      const provider = product.provider || "Inconnu";
      acc[provider] = (acc[provider] ?? 0) + 1;
      return acc;
    },
    {}
  );

  // Calcul de la moyenne
  const average = (values: number[]) =>
    values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;

  const isRechargeable = (value: unknown): boolean => {
    if (typeof value === "boolean") return value;

    const normalized = String(value ?? "").trim().toLowerCase();

    return ["oui", "yes", "true", "1"].includes(normalized);
  };

  const isNonRechargeable = (value: unknown): boolean => {
    if (typeof value === "boolean") return !value;

    const normalized = String(value ?? "").trim().toLowerCase();

    return ["non", "no", "false", "0"].includes(normalized);
  };

  const rechargeableProducts = products.filter((product) =>
    isRechargeable(product.top_up)
  ).length;

  const nonRechargeableProducts = products.filter((product) =>
    isNonRechargeable(product.top_up)
  ).length;

  return {
    totalProducts: products.length,

    productsOver100: pricedProducts.filter(
      (product) => product.price > 100
    ).length,

    minPrice: prices.length > 0 ? Math.min(...prices) : null,
    maxPrice: prices.length > 0 ? Math.max(...prices) : null,
    averagePrice: average(prices),

    averageDataGb: average(
      productsWithData.map((product) => product.data_gb!)
    ),

    unlimitedProducts: products.filter(
      (product) => product.data_gb == null
    ).length,

    productsByProvider,

    productsByNetwork: products.reduce<Record<string, number>>(
      (acc, product) => {
        const network = product.network || "Inconnu";
        acc[network] = (acc[network] ?? 0) + 1;
        return acc;
      },
      {}
    ),

    rechargeableProducts,
    nonRechargeableProducts,
  };
}