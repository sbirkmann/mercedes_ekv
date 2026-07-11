"use client";

import { useState } from "react";
import { Upload, ClipboardList, PackageCheck, Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CsvImport } from "./csv-import";
import { ResultImport } from "./result-import";
import { GoodsReceipt, type ReceiptItem } from "./goods-receipt";

type Which = "csv" | "result" | "we" | null;

export function OrderActionsBar({
  orderId,
  receiptItems,
}: {
  orderId: string;
  receiptItems: ReceiptItem[];
}) {
  const [open, setOpen] = useState<Which>(null);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen("csv")}>
          <Upload /> CSV-Import
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen("result")}>
          <ClipboardList /> Bestellergebnis
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen("we")}>
          <PackageCheck /> Wareneingang
        </Button>
        <a
          href={`/admin/bestellungen/${orderId}/export`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Download /> CSV-Export
        </a>
      </div>

      {open === "csv" && (
        <Modal title="CSV-Import (Teilenummer, Anzahl)" onClose={() => setOpen(null)}>
          <CsvImport orderId={orderId} />
        </Modal>
      )}
      {open === "result" && (
        <Modal
          title="Bestellergebnis-Import (Teilenummer, Anzahl, Preis/EK)"
          onClose={() => setOpen(null)}
          className="max-w-xl"
        >
          <ResultImport orderId={orderId} />
        </Modal>
      )}
      {open === "we" && (
        <Modal title="Wareneingang buchen" onClose={() => setOpen(null)}>
          <GoodsReceipt orderId={orderId} items={receiptItems} />
        </Modal>
      )}
    </>
  );
}
