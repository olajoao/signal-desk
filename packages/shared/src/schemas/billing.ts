import { z } from "zod";

export const CheckoutSchema = z.object({
  planId: z.string().min(1),
});

export type Checkout = z.infer<typeof CheckoutSchema>;
