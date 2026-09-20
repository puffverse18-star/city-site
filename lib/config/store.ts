import { z } from 'zod';

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  databaseUrl: z.string().default('postgresql://postgres:postgres@localhost:5432/city_electronique'),
  sessionSecret: z.string().min(16).default('development-session-secret-change-in-production-min-16'),
  store: z.object({
    name: z.string().default('CITY Électronique'),
    phone: z.string().default('+212600000000'),
    whatsappNumber: z.string().default('212600000000'),
    currency: z.literal('MAD').default('MAD'),
    currencySymbol: z.literal('DH').default('DH'),
    timezone: z.string().default('Africa/Casablanca'),
  }),
  safety: z.object({
    maxDropPercentage: z.number().min(1).max(100).default(15),
  }),
  features: z.object({
    glovoEnabled: z.boolean().default(false),
    unicentaEnabled: z.boolean().default(false),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;

export const appConfig: AppConfig = configSchema.parse({
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/city_electronique',
  sessionSecret: process.env.SESSION_SECRET || 'development-session-secret-change-in-production-min-16',
  store: {
    name: process.env.STORE_NAME || 'CITY Électronique',
    phone: process.env.STORE_PHONE || '+212600000000',
    whatsappNumber: process.env.STORE_WHATSAPP_NUMBER || '212600000000',
    currency: 'MAD',
    currencySymbol: 'DH',
    timezone: process.env.STORE_TIMEZONE || 'Africa/Casablanca',
  },
  safety: {
    maxDropPercentage: Number(process.env.IMPORT_SAFETY_MAX_DROP_PERCENTAGE || 15),
  },
  features: {
    glovoEnabled: process.env.GLOVO_INTEGRATION_ENABLED === 'true',
    unicentaEnabled: process.env.UNICENTA_INTEGRATION_ENABLED === 'true',
  },
});
