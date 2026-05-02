import { z } from 'zod';

export const triggerPanicSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  device_os: z.string().max(20).optional(),
});

export type TriggerPanicDto = z.infer<typeof triggerPanicSchema>;
