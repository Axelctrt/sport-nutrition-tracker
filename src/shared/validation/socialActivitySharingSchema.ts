import { z } from 'zod';
import {
  SOCIAL_ACTIVITY_CARDIO_FIELDS,
  SOCIAL_ACTIVITY_COMMON_FIELDS,
  SOCIAL_ACTIVITY_STRENGTH_FIELDS,
} from '@/domain/friends/socialActivitySharingPolicy';

export const socialActivityFieldSelectionSchema = z.object({
  common: z.array(z.enum(SOCIAL_ACTIVITY_COMMON_FIELDS)),
  cardio: z.array(z.enum(SOCIAL_ACTIVITY_CARDIO_FIELDS)),
  strength: z.array(z.enum(SOCIAL_ACTIVITY_STRENGTH_FIELDS)),
});

export const socialActivityGlobalSharingPolicySchema = z.object({
  visibility: z.enum(['private', 'summary', 'detailed', 'custom']),
  fields: socialActivityFieldSelectionSchema,
});

export const socialActivitySharingOverrideSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('inherit') }),
  z.object({ mode: z.literal('private') }),
  z.object({ mode: z.literal('summary') }),
  z.object({ mode: z.literal('detailed') }),
  z.object({
    mode: z.literal('custom'),
    fields: socialActivityFieldSelectionSchema,
  }),
]);
