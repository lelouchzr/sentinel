import { z } from 'zod';
import { vocabularySchema } from './contracts';

export const collectionContentSchema = z.object({
  title: z.string().trim().min(1).max(100),
  items: z.array(vocabularySchema).min(1).max(500),
});
export const cloudCollectionSchema = collectionContentSchema.extend({
  id: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CloudCollection = z.infer<typeof cloudCollectionSchema>;
export const createCollectionSchema = collectionContentSchema.extend({ id: z.string().uuid() });
export const updateCollectionSchema = collectionContentSchema.extend({
  revision: z.number().int().nonnegative(),
});
export const providerUsageSummarySchema = z.object({
  provider: z.enum(['meta', 'azure']),
  estimatedUsd: z.number().nonnegative(),
  heldUsd: z.number().nonnegative(),
  operationCount: z.number().int().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  unresolvedCount: z.number().int().nonnegative(),
  hasUnknownCharges: z.boolean(),
});
export const usageSummarySchema = z.object({
  providers: z.array(providerUsageSummarySchema),
  balanceVerified: z.literal(false),
});
export type UsageSummary = z.infer<typeof usageSummarySchema>;
