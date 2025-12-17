import { uuid } from "@/lib/utils";
import type { Channel } from "@/lib/types";

export type FulfillmentPlan =
  | { mode: "ship_to_home"; etaDays: number; trackingId: string }
  | { mode: "click_collect"; storeId: string; pickupWindow: string; reservationId: string }
  | { mode: "reserve_try_on"; storeId: string; slot: string; reservationId: string };

export function planFulfillment(params: {
  channel: Channel;
  storeId?: string;
  wantsReserve?: boolean;
}): FulfillmentPlan {
  const id = `res_${uuid()}`;

  // Kiosk default: reserve-in-store for try-on
  if (params.channel === "kiosk" || params.wantsReserve) {
    return {
      mode: "reserve_try_on",
      storeId: params.storeId ?? "store-blr-01",
      slot: "Today 6:00–6:30 PM",
      reservationId: id,
    };
  }

  // WhatsApp/mobile default: click & collect if store is known, else ship
  if ((params.channel === "whatsapp" || params.channel === "mobile") && params.storeId) {
    return {
      mode: "click_collect",
      storeId: params.storeId,
      pickupWindow: "Tomorrow 12:00–8:00 PM",
      reservationId: id,
    };
  }

  return {
    mode: "ship_to_home",
    etaDays: 3,
    trackingId: `trk_${uuid()}`,
  };
}



