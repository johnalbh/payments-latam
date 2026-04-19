import { ProviderProtocolError } from '../../domain/errors/provider-protocol-error';
import type {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
  TransactionResult,
} from '../../domain/ports/payment-provider';
import { err, ok } from '../../domain/result/result';
import type { Environment } from '../../domain/value-objects/environment';
import { WOMPI_ENDPOINTS, wompiBaseUrl } from './endpoints';
import { translateWompiFailure } from './error-translator';
import { toCreateTransactionRequest, toTokenizeCardRequest } from './mappers/charge-request.mapper';
import { fromWompiTransactionData } from './mappers/transaction-response.mapper';
import type {
  WompiCredentials,
  WompiMerchantResponse,
  WompiTokenizeCardResponse,
  WompiTransactionResponse,
} from './types';
import type { WompiHttp } from './wompi-http-client';
import { WompiHttpClient } from './wompi-http-client';

export class WompiProvider implements PaymentProvider {
  readonly name = 'wompi' as const;

  constructor(
    private readonly http: WompiHttp,
    private readonly publicKey: string,
  ) {}

  async charge(input: ChargeInput): Promise<ChargeResult> {
    // Step 1: fetch the merchant acceptance token. Required for first-time payers and
    // harmless when reused — Wompi treats the token as short-lived consent.
    const merchantRes = await this.http.get<WompiMerchantResponse>(
      WOMPI_ENDPOINTS.merchant(this.publicKey),
      'public',
    );
    const acceptanceToken = merchantRes.data?.presigned_acceptance?.acceptance_token;
    if (!acceptanceToken) {
      throw new ProviderProtocolError({
        provider: 'wompi',
        message: 'Wompi merchant response missing acceptance_token',
        rawBody: merchantRes,
      });
    }

    // Step 2: tokenize the card (public key).
    const tokenizeRes = await this.http.post<WompiTokenizeCardResponse>(
      WOMPI_ENDPOINTS.tokenizeCard,
      toTokenizeCardRequest(input),
      'public',
    );
    const cardToken = tokenizeRes.data?.id;
    if (!cardToken) {
      throw new ProviderProtocolError({
        provider: 'wompi',
        message: 'Wompi tokenize response missing card id',
        rawBody: tokenizeRes,
      });
    }

    // Step 3: create the transaction (private key).
    const createRes = await this.http.post<WompiTransactionResponse>(
      WOMPI_ENDPOINTS.createTransaction,
      toCreateTransactionRequest({ input, cardToken, acceptanceToken }),
      'private',
    );

    return this.mapAndBranch(createRes, input.paymentMethod.card);
  }

  async getTransaction(id: string): Promise<TransactionResult> {
    const res = await this.http.get<WompiTransactionResponse>(
      WOMPI_ENDPOINTS.getTransaction(id),
      'private',
    );
    return this.mapAndBranch(res, undefined);
  }

  private mapAndBranch(
    response: WompiTransactionResponse,
    fallbackCard: ChargeInput['paymentMethod']['card'] | undefined,
  ): ChargeResult {
    let transaction: ReturnType<typeof fromWompiTransactionData>;
    try {
      transaction = fromWompiTransactionData({
        data: response.data,
        ...(fallbackCard ? { fallbackCard } : {}),
      });
    } catch (cause: unknown) {
      throw new ProviderProtocolError({
        provider: 'wompi',
        message: cause instanceof Error ? cause.message : 'Invalid Wompi response shape',
        rawBody: response,
      });
    }

    if (transaction.status === 'declined' || transaction.status === 'error') {
      return err(translateWompiFailure(response.data));
    }
    return ok(transaction);
  }
}

export type CreateWompiProviderConfig = {
  readonly credentials: WompiCredentials;
  readonly environment: Environment;
  readonly timeoutMs?: number;
  readonly fetch?: typeof globalThis.fetch;
};

export function createWompiProvider(config: CreateWompiProviderConfig): WompiProvider {
  const http = new WompiHttpClient({
    publicKey: config.credentials.publicKey,
    privateKey: config.credentials.privateKey,
    baseUrl: wompiBaseUrl(config.environment),
    timeoutMs: config.timeoutMs ?? 30_000,
    ...(config.fetch ? { fetch: config.fetch } : {}),
  });
  return new WompiProvider(http, config.credentials.publicKey);
}
