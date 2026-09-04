import { z } from "zod";

export const clusterNameSchema = z.object({
  label: z.string(),
  definition: z.string(),
  inclusion_notes: z.string(),
  exclusion_notes: z.string(),
  metric_link: z.string(),
  suggested_intervention: z.string(),
});

export type ClusterNameResult = z.infer<typeof clusterNameSchema>;
