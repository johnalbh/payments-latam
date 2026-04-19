// ePayco-specific types. These DTOs mirror the shape documented at
// https://docs.epayco.co and are NOT part of the public SDK surface.
// Every field name matches what the gateway expects on the wire, including
// their snake_case and occasional bracketed keys. Callers never see these.

export type EpaycoCredentials = {
  readonly publicKey: string;
  readonly privateKey: string;
};

// Login endpoint returns a bearer token used for every subsequent call.
export type EpaycoLoginResponse = {
  readonly token: string;
};

// Step 1 payload: tokenize the card. The gateway never sees the PAN after this call.
export type EpaycoTokenizeCardRequest = {
  readonly 'card[number]': string;
  readonly 'card[exp_year]': string;
  readonly 'card[exp_month]': string;
  readonly 'card[cvc]': string;
};

export type EpaycoTokenizeCardResponse = {
  readonly id: string;
  readonly status: string;
  readonly mask: string;
  readonly name: string;
};

// Step 2 payload: create the charge against the tokenized card.
export type EpaycoChargeRequest = {
  readonly token_card: string;
  readonly customer_id?: string;
  readonly doc_type: string;
  readonly doc_number: string;
  readonly name: string;
  readonly last_name: string;
  readonly email: string;
  readonly bill: string;
  readonly description: string;
  readonly value: string;
  readonly tax: string;
  readonly tax_base: string;
  readonly currency: string;
  readonly dues: string;
  readonly ip: string;
  readonly city?: string;
  readonly address?: string;
  readonly phone?: string;
  readonly cell_phone?: string;
  readonly url_response?: string;
  readonly url_confirmation?: string;
  readonly metadata?: Record<string, string>;
};

// Selected response fields we rely on. ePayco returns a long payload; the raw body
// is kept in `Transaction.providerRaw` so consumers can inspect anything we skipped.
export type EpaycoChargeResponse = {
  readonly success: boolean;
  readonly data: {
    readonly ref_payco: number | string;
    readonly x_transaction_id?: string;
    readonly x_ref_payco?: string;
    readonly x_amount: string | number;
    readonly x_currency_code: string;
    readonly x_response: string;
    readonly x_response_reason_code?: string;
    readonly x_response_reason_text?: string;
    readonly x_id_factura?: string;
    readonly x_transaction_date?: string;
    readonly x_franchise?: string;
    readonly x_cardnumber?: string;
  };
};

export type EpaycoGetTransactionResponse = EpaycoChargeResponse;

// Generic error envelope. ePayco returns 2xx with `success: false` for business
// failures, and non-2xx with this shape for protocol/auth failures.
export type EpaycoErrorEnvelope = {
  readonly success?: false;
  readonly title_response?: string;
  readonly text_response?: string;
  readonly message?: string;
  readonly error?: string;
  readonly errors?: readonly unknown[];
};
