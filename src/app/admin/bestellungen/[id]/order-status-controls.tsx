"use client";

import { setOrderStatus, setDeliveryStatus } from "../actions";
import { Select } from "@/components/ui/select";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_ORDER,
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_ORDER,
  type OrderStatus,
  type DeliveryStatus,
} from "@/lib/pricing";

export function OrderStatusControls({
  orderId,
  status,
  deliveryStatus,
}: {
  orderId: string;
  status: OrderStatus;
  deliveryStatus: DeliveryStatus;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <form action={setOrderStatus.bind(null, orderId)} className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Bestellstatus:</span>
        <Select
          name="status"
          defaultValue={status}
          className="h-9 w-40"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          {ORDER_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
          ))}
        </Select>
      </form>
      <form action={setDeliveryStatus.bind(null, orderId)} className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Lieferstatus:</span>
        <Select
          name="deliveryStatus"
          defaultValue={deliveryStatus}
          className="h-9 w-52"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          {DELIVERY_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{DELIVERY_STATUS_LABEL[s]}</option>
          ))}
        </Select>
      </form>
    </div>
  );
}
