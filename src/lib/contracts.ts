import { z } from 'zod';

export const sourceSchema = z.enum([
  'csv',
  'tsv',
  'anki',
  'quizlet',
  'flashcardstudy',
  'photo',
  'manual',
]);
export const provenanceSchema = z.enum(['imported', 'extracted', 'generated', 'edited']);
export const vocabularySchema = z.object({
  id: z.string().min(1).max(100),
  expression: z.string().trim().min(1).max(300),
  meaning: z.string().trim().min(1).max(600),
  example: z.string().max(600).default(''),
  source: sourceSchema,
  provenance: z.object({
    expression: provenanceSchema,
    meaning: provenanceSchema,
    example: provenanceSchema,
  }),
  sourceRow: z.number().int().nonnegative().optional(),
});
export type VocabularyItem = z.infer<typeof vocabularySchema>;
export const scenarioSchema = z.enum(['request', 'appointment', 'problem']);
export const sessionSetupSchema = z.object({
  scenario: scenarioSchema,
  goal: z.string().trim().min(3).max(500),
  level: z.enum(['beginner', 'intermediate']),
  relationship: z.enum(['stranger', 'colleague', 'friend']),
  targetLanguage: z.literal('ko').default('ko'),
  explanationLanguage: z.literal('fr').default('fr'),
  targets: z.array(vocabularySchema).length(3),
});
export type SessionSetup = z.infer<typeof sessionSetupSchema>;
export const turnSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.enum(['learner', 'partner']),
  text: z.string().trim().min(1).max(2000),
  corrected: z.boolean().default(false),
  inputMode: z.enum(['spoken', 'typed']).optional(),
  createdAt: z.string().datetime(),
});
export type ConversationTurn = z.infer<typeof turnSchema>;
export const hintSchema = z.object({
  id: z.string().min(1).max(100),
  targetId: z.string().min(1).max(100),
  level: z.enum(['meaning', 'starter', 'example']),
  text: z.string().min(1).max(1000),
  beforeTurn: z.number().int().nonnegative(),
});
export type Hint = z.infer<typeof hintSchema>;
export const outcomeSchema = z.enum([
  'independent_use',
  'assisted_use',
  'needs_practice',
  'not_observed',
  'uncertain',
]);
export const observationSchema = z.object({
  targetId: z.string(),
  outcome: outcomeSchema,
  opportunity: z.boolean(),
  evidence: z.array(z.object({ turnId: z.string(), quote: z.string().min(1).max(2000) })).max(8),
  explanation: z.string().min(1).max(1000),
  nextPractice: z.string().min(1).max(600),
});
export type Observation = z.infer<typeof observationSchema>;
export const feedbackSchema = z.object({
  goalAchieved: z.enum(['yes', 'partly', 'no', 'uncertain']),
  summary: z.string().min(1).max(1500),
  observations: z.array(observationSchema).length(3),
});
export type Feedback = z.infer<typeof feedbackSchema>;
export const sessionSchema = z.object({
  id: z.string().uuid(),
  setup: sessionSetupSchema,
  status: z.enum(['active', 'completed']),
  scene: z.string().max(1500),
  turns: z.array(turnSchema).max(18),
  hints: z.array(hintSchema).max(24),
  createdAt: z.string().datetime(),
  feedback: feedbackSchema.optional(),
});
export type SpeakingSession = z.infer<typeof sessionSchema>;
export type ProviderStatus = {
  aiEnabled: boolean;
  meta: boolean;
  speech: boolean;
  storage: boolean;
  authenticated: boolean;
};
export type ApiError = { error: { code: string; message: string } };
