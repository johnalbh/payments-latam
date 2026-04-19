// Wompi-specific types. Mirrors https://docs.wompi.co/docs/colombia/api-reference.
// Wompi splits auth by key: tokenization uses the public key, transaction creation
// uses the private key. Both live on the server; we never expose the private key.

export type WompiCredentials = {
  readonly publicKey: string;
  readonly privateKey: string;
};

// Merchant lookup supplies the `acceptance_token` (mandatory for new payers to accept T&Cs).
export type WompiMerchantResponse = {
  readonly data: {
    readonly presigned_acceptance: {
      readonly acceptance_token: string;
      readonly permalink: string;
      readonly type?: string;
    };
    readonly presigned_personal_data_auth?: {
      readonly acceptance_token: string;
      readonly permalink: string;
      readonly type?: string;
    };
  };
};

// Tokenize card — authenticated with the public key.
export type WompiTokenizeCardRequest = {
  readonly number: string;
  readonly cvc: string;
  readonly exp_month: string; // "01".."12"
  readonly exp_year: string; // "28" or "2028" — Wompi expects 2-digit year
  readonly card_holder: string;
};

export type WompiTokenizeCardResponse = {
  readonly status: string; // "CREATED"
  readonly data: {
    readonly id: string;
    readonly created_at: string;
    readonly brand: string;
    readonly name: string;
    readonly last_four: string;
    readonly bin: string;
    readonly exp_year: string;
    readonly exp_month: string;
    readonly card_holder: string;
    readonly expires_at: string;
  };
};

// Create transaction — authenticated with the private key.
export type WompiCreateTransactionRequest = {
  readonly acceptance_token: string;
  readonly amount_in_cents: number;
  readonly currency: string;
  readonly customer_email: string;
  readonly payment_method: {
    readonly type: 'CARD';
    readonly token: string;
    readonly installments: number;
  };
  readonly reference: string;
  readonly customer_data?: {
    readonly phone_number?: string;
    readonly full_name?: string;
    readonly legal_id?: string;
    readonly legal_id_type?: string;
  };
  readonly recurrent?: boolean;
};

export type WompiTransactionStatus = 'APPROVED' | 'DECLINED' | 'PENDING' | 'VOIDED' | 'ERROR';

export type WompiTransactionData = {
  readonly id: string;
  readonly created_at: string;
  readonly finalized_at?: string | null;
  readonly amount_in_cents: number;
  readonly reference: string;
  readonly currency: string;
  readonly payment_method_type: string;
  readonly payment_method?: {
    readonly type: string;
    readonly extra?: {
      readonly brand?: string;
      readonly last_four?: string;
      readonly name?: string;
    };
  };
  readonly status: WompiTransactionStatus;
  readonly status_message?: string | null;
};

export type WompiTransactionResponse = {
  readonly data: WompiTransactionData;
};

// 4xx failures come back with this shape. 2xx "declined" transactions come via the
// regular transaction response with `status: "DECLINED"` — that is NOT a protocol error.
export type WompiErrorEnvelope = {
  readonly error?: {
    readonly type?: string;
    readonly reason?: string;
    readonly messages?: Readonly<Record<string, readonly string[]>>;
  };
};
