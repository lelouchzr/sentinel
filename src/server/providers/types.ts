import 'server-only';

export type ProviderOperation =
  'plan' | 'reply' | 'hint' | 'evaluate' | 'extract' | 'transcribe' | 'speech';
export type ProviderUsage = {
  provider: 'meta' | 'azure';
  model: string;
  operation: ProviderOperation;
  requestId?: string;
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
  characters?: number;
  latencyMs: number;
};
export type ProviderResult<T> = { data: T; usage: ProviderUsage };

export class ProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 502,
    // A request may already have been billed. The caller must retain its reservation.
    public readonly ambiguous = false,
    public readonly usage?: ProviderUsage,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
