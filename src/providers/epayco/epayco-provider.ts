import { paymentError } from '../../domain/errors/payment-error';
import { ProviderProtocolError } from '../../domain/errors/provider-protocol-error';
import type {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
  TransactionResult,
} from '../../domain/ports/payment-provider';
import { err, ok } from '../../domain/result/result';
import type { Environment } from '../../domain/value-objects/environment';
import { EPAYCO_ENDPOINTS, epaycoBaseUrl } from './endpoints';
import type { EpaycoHttp } from './epayco-http-client';
import { EpaycoHttpClient } from './epayco-http-client';
import { translateEpaycoFailure } from './error-translator';
import { toChargeRequest, toTokenizeCardRequest } from './mappers/charge-request.mapper';
import { fromEpaycoTransactionResponse } from './mappers/transaction-response.mapper';
import type {
  EpaycoChargeResponse,
  EpaycoCredentials,
  EpaycoGetTransactionResponse,
  EpaycoTokenizeCardResponse,
} from './types';

// We send a neutral loopback for `ip` because:
// (a) this SDK is server-side, so the caller's public IP is opaque here;
// (b) ePayco only uses `ip` for fraud-scoring hints — it is not an auth mechanism.
// Consumers who want to forward the end-user's IP can do so via a future `metadata` passthrough.
const DEFAULT_CLIENT_IP = '127.0.0.1';

export class EpaycoProvider implements PaymentProvider {
  readonly name = 'epayco' as const;

  constructor(private readonly http: EpaycoHttp) {}

  async charge(input: ChargeInput): Promise<ChargeResult> {
    // Step 1: tokenize the card. ePayco never touches the PAN directly in the charge call.
    const tokenizeRes = await this.http.post<EpaycoTokenizeCardResponse>(
      EPAYCO_ENDPOINTS.tokenizeCard,
      toTokenizeCardRequest(input),
    );
    if (!tokenizeRes.id) {
      return err(
        paymentError({
          code: 'invalid_card',
          message: 'ePayco tokenization returned no id',
          providerMessage: tokenizeRes.status,
        }),
      );
    }

    // Step 2: create the charge.
    const chargeRes = await this.http.post<EpaycoChargeResponse>(
      EPAYCO_ENDPOINTS.charge,
      toChargeRequest({
        input,
        cardToken: tokenizeRes.id,
        clientIp: DEFAULT_CLIENT_IP,
      }),
    );

    if (!chargeRes.success) {
      return err(translateEpaycoFailure(chargeRes));
    }

    return this.mapAndBranch(chargeRes, input.reference, input.paymentMethod.card);
  }

  async getTransaction(id: string): Promise<TransactionResult> {
    const res = await this.http.get<EpaycoGetTransactionResponse>(EPAYCO_ENDPOINTS.getTransaction, {
      id,
    });
    if (!res.success) {
      return err(translateEpaycoFailure(res));
    }
    return this.mapAndBranch(res, extractReference(res) ?? id, undefined);
  }

  private mapAndBranch(
    response: EpaycoChargeResponse,
    reference: string,
    fallbackCard: ChargeInput['paymentMethod']['card'] | undefined,
  ): ChargeResult {
    let transaction: ReturnType<typeof fromEpaycoTransactionResponse>;
    try {
      transaction = fromEpaycoTransactionResponse({
        response,
        reference,
        ...(fallbackCard ? { fallbackCard } : {}),
      });
    } catch (cause: unknown) {
      throw new ProviderProtocolError({
        provider: 'epayco',
        message: cause instanceof Error ? cause.message : 'Invalid ePayco response shape',
        rawBody: response,
      });
    }

    // Declined / errored transactions are business failures — return err with a translated
    // PaymentError so the caller branches on `result.ok`. The raw response is still
    // retrievable via `providerRaw` if they need audit detail, just not via this path.
    if (transaction.status === 'declined' || transaction.status === 'error') {
      return err(translateEpaycoFailure(response));
    }
    return ok(transaction);
  }
}

function extractReference(res: EpaycoChargeResponse): string | undefined {
  return res.data.x_id_factura;
}

export type CreateEpaycoProviderConfig = {
  readonly credentials: EpaycoCredentials;
  readonly environment: Environment;
  readonly timeoutMs?: number;
  readonly fetch?: typeof globalThis.fetch;
};

export function createEpaycoProvider(config: CreateEpaycoProviderConfig): EpaycoProvider {
  const http = new EpaycoHttpClient({
    credentials: config.credentials,
    baseUrl: epaycoBaseUrl(config.environment),
    timeoutMs: config.timeoutMs ?? 30_000,
    ...(config.fetch ? { fetch: config.fetch } : {}),
  });
  return new EpaycoProvider(http);
}
