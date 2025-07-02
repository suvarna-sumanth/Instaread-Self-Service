import { z } from 'zod';

export const injectionRuleSchema = z.object({
  target_selector: z.string().min(1, 'Selector is required.'),
  insert_position: z.enum(['prepend', 'append', 'before', 'after']),
  exclude_slugs: z.string().optional(),
});

export const wordpressPluginSchema = z.object({
  partner_id: z.string().min(1, 'Partner ID is required.'),
  domain: z.string().url('Must be a valid URL.'),
  publication: z.string().min(1, 'Publication name is required.'),
  injection_context: z.enum(['singular', 'all', 'custom']),
  injection_strategy: z.enum(['first', 'last', 'all']),
  injection_rules: z.array(injectionRuleSchema).min(1, 'At least one injection rule is required.'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in format X.Y.Z (e.g., 1.0.0).'),
});

export type WordpressPluginFormData = z.infer<typeof wordpressPluginSchema>;
