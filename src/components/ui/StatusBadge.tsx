import Badge from "./Badge";
import { stockStatusLabel } from "@/lib/labels";
import type { StockStatus } from "@/lib/apiTypes";

const statusVariant: Record<StockStatus, "success" | "warning" | "danger"> = {
  IN_STOCK: "success",
  LOW: "warning",
  OUT: "danger",
};

export default function StatusBadge({ status }: { status: StockStatus }) {
  return <Badge variant={statusVariant[status]}>{stockStatusLabel[status]}</Badge>;
}
