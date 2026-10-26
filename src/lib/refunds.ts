import { CANCELLATION } from "./catalog";
import { hoursUntil } from "./dates";
import type { CancellationPolicy } from "@/db/schema";

/**
 * Refund owed to the tourist when they cancel. Platform commission is refunded proportionally;
 * if the operator cancels, the tourist always gets everything back.
 */
export function refundFor(args: {
  policy: CancellationPolicy;
  paidThebe: number;
  date: string;
  startTime: string;
  cancelledBy: "tourist" | "operator" | "admin";
  now?: Date;
}): { refundThebe: number; percent: number } {
  if (args.paidThebe <= 0) return { refundThebe: 0, percent: 0 };
  if (args.cancelledBy !== "tourist") return { refundThebe: args.paidThebe, percent: 100 };
  const rule = CANCELLATION[args.policy];
  const hours = hoursUntil(args.date, args.startTime, args.now);
  let percent = 0;
  if (hours >= rule.fullRefundHours) percent = 100;
  else if (rule.halfRefundHours > 0 && hours >= rule.halfRefundHours) percent = 50;
  return { refundThebe: Math.round((args.paidThebe * percent) / 100), percent };
}
