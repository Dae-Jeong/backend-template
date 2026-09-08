export type Reservation = Readonly<{
  reservationId: string;
  productId: string;
  createdAt: Date;
}>;
export type ReservationResult = Readonly<{
  reservation: Reservation;
  replayed: boolean;
}>;
export type ReservationSnapshot = Readonly<{
  reservation_id: string;
  product_id: string;
  created_at: string;
}>;
