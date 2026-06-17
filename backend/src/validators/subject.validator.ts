import { z } from 'zod';

export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(100, 'Subject name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional().nullable(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color must be a valid hex string').optional().nullable(),
});

export const updateSubjectSchema = createSubjectSchema.partial();
