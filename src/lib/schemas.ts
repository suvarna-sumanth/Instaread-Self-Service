
'use server';

import { z } from 'zod';

export const injectionRuleSchema = z.object({
    target_selector: z.string().min(1, "Selector is required"),
    insert_position: z.enum(['before_element', 'after_element', 'inside_first_child', 'inside_last_child']),
    exclude_slugs: z.string().optional()
});

export const wordpressConfigSchema = z.object({
    partner_id: z.string().min(1, "Partner ID is required."),
    domain: z.string().min(1, "Domain is required.").url("Please enter a valid domain."),
    publication: z.string().min(1, "Publication is required."),
    version: z.string().min(1, "Version is required, e.g., 1.0.0").regex(/^\d+\.\d+\.\d+$/, "Version must be in semantic format, e.g., 1.0.0"),
    injection_context: z.enum(['singular', 'all', 'archive', 'front_page', 'posts_page']),
    injection_strategy: z.enum(['first', 'all', 'none', 'custom']),
    injection_rules: z.array(injectionRuleSchema)
});

export type WordPressConfigFormValues = z.infer<typeof wordpressConfigSchema>;
