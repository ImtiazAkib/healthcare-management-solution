/**
 * How a payment was taken. All of these are recorded at the counter in this build — a real online
 * gateway is a second implementation behind the same interface, not a new method here.
 */
export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'bank';
