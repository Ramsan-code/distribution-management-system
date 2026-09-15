export type ShopInput = { name: string; phone: string; address: string };
export type Shop = ShopInput & {
  id: string; active: boolean; deliveredCents: number; paidCents: number;
  outstandingCents: number; createdAt: string;
};
export type Delivery = {
  id: string; shopId: string; description: string; amountCents: number;
  status: "pending" | "delivered"; deliveryDate: string;
  createdAt: string; deliveredAt: string | null;
};
export type Payment = {
  id: string; shopId: string; amountCents: number; note: string;
  reference: string; createdAt: string;
};
export type ShopDetail = { shop: Shop; deliveries: Delivery[]; payments: Payment[] };
