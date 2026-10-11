/**
 * A seat position inside a hall (both numbers are 1-based).
 * Plain shape used across the services (bookings, seat maps). The GraphQL
 * input/output types for a seat live in the showings module.
 */
export interface Seat {
  row: number;
  seat: number;
}

export function seatKey(seat: Seat): string {
  return `${seat.row}:${seat.seat}`;
}

export function formatSeat(seat: Seat): string {
  return `row ${seat.row} seat ${seat.seat}`;
}
