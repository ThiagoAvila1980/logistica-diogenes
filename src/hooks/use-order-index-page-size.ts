"use client";

import { useEffect, useState } from "react";
import {
  getOrderIndexPageSize,
  ORDER_INDEX_ROWS,
} from "@/lib/ui/order-index-grid";

/** Tamanho de página = 4 linhas × colunas atuais do grid de cards. */
export function useOrderIndexPageSize(rows = ORDER_INDEX_ROWS): number {
  const [pageSize, setPageSize] = useState(() =>
    typeof window === "undefined"
      ? rows * 3
      : getOrderIndexPageSize(window.innerWidth, rows),
  );

  useEffect(() => {
    function update() {
      setPageSize(getOrderIndexPageSize(window.innerWidth, rows));
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [rows]);

  return pageSize;
}
