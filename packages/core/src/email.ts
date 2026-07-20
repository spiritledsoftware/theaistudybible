import { env } from './env';
import { SESClient } from '@aws-sdk/client-ses';

export const ses = new SESClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: env.SES_ACCESS_KEY_ID,
    secretAccessKey: env.SES_SECRET_ACCESS_KEY,
  },
});
