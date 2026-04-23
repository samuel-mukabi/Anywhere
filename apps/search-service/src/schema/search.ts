import { z } from 'zod';

export const SearchQuerySchema = z.object({
  budget: z.number().min(100).max(50000),
  currency: z.string().length(3).default('USD'),
  departureRegion: z.string().min(2),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional().nullable(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional().nullable(),
  vibes: z.array(z.string()).min(1),
  duration: z.number().min(1).max(90),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// Shared interface used internally by the Engine when caching logic returns data
export interface SearchResultTarget {
  city: string;
  country: string;
  estimatedFlightCost: number;
  livingCostIndices: number;
  climateScore: number;
  totalMatchScore: number; // Final algorithm scoring metric
  tags: string[];
}
