import { Types } from 'mongoose';
import { WithId } from '../common/schema-validators';
import { Booking } from './schemas/booking.schema';
import { Showing } from './schemas/showing.schema';

/**
 * Plain shapes returned by the service to the resolvers. They mirror the
 * GraphQL object types: the embedded arrays are mapped here (seat occupancy,
 * booking ids), while `filmId`/`hallId` stay as references for the `film` and
 * `hall` field resolvers (and their DataLoaders).
 */
export interface BookingView {
  _id: Types.ObjectId;
  showingId: Types.ObjectId;
  seats: { row: number; seat: number }[];
  totalPrice: number;
  createdAt: Date;
}

export interface ShowingView {
  _id: Types.ObjectId;
  filmId: Types.ObjectId;
  hallId: Types.ObjectId;
  startsAt: Date;
  price: number;
  seats: { row: number; seat: number; isBooked: boolean }[];
  bookings: BookingView[];
}

/** Maps one embedded booking (with the id of the showing it lives in). */
export function toBookingView(
  showingId: Types.ObjectId,
  booking: Booking,
): BookingView {
  return {
    _id: booking._id,
    showingId,
    seats: booking.seats.map((s) => ({ row: s.row, seat: s.seat })),
    totalPrice: booking.totalPrice,
    createdAt: new Date(booking.createdAt),
  };
}

/** Maps a showing document (with its embedded seats and bookings). */
export function toShowingView(doc: WithId<Showing>): ShowingView {
  return {
    _id: doc._id,
    filmId: doc.film,
    hallId: doc.hall,
    startsAt: doc.startsAt,
    price: doc.price,
    seats: doc.seats.map((s) => ({
      row: s.row,
      seat: s.seat,
      isBooked: s.bookingId !== null && s.bookingId !== undefined,
    })),
    bookings: doc.bookings.map((b) => toBookingView(doc._id, b)),
  };
}
