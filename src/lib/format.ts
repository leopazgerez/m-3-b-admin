export const money = (n: number) => `$${n.toLocaleString("es-AR")}`;

/** A simple product's only variant is named "STANDARD" by the backend: show just the product name. */
export const variantLabel = (r: { productName: string; variantName: string }) =>
  r.variantName === "STANDARD" ? r.productName : `${r.productName} · ${r.variantName}`;
