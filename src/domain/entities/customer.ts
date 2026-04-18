import type { Document } from '../value-objects/document';

export type Customer = {
  readonly email: string;
  readonly fullName: string;
  readonly document: Document;
  readonly phone?: string;
};

// Pragmatic email shape check — not RFC-complete, good enough to reject typos.
// Providers will apply their own rules on top.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loose E.164-ish — optional leading '+', 7–15 digits.
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

export function createCustomer(params: {
  email: string;
  fullName: string;
  document: Document;
  phone?: string | undefined;
}): Customer {
  const email = params.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    throw new RangeError(`Customer.email is malformed: ${params.email}`);
  }
  const fullName = params.fullName.trim();
  if (fullName.length === 0) {
    throw new RangeError('Customer.fullName cannot be empty');
  }
  if (fullName.length > 150) {
    throw new RangeError(`Customer.fullName too long (max 150): ${fullName.length}`);
  }
  if (params.phone !== undefined) {
    const phone = params.phone.replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(phone)) {
      throw new RangeError(`Customer.phone is malformed: ${params.phone}`);
    }
    return { email, fullName, document: params.document, phone };
  }
  return { email, fullName, document: params.document };
}
