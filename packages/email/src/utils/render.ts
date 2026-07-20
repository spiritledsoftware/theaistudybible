import { render } from 'jsx-email';
import ForgotPasswordEmail from '../emails/auth/forgot-password';
import DailyDevotionEmail from '../emails/daily-devotion';
import DeadLetterEmail from '../emails/dead-letter';
import { EmailBodySchema } from '../schemas';
import type { EmailBody } from '../types';

const emailTypeToComponentMap = {
  'forgot-password': ForgotPasswordEmail,
  'dead-letter': DeadLetterEmail,
  'daily-devotion': DailyDevotionEmail,
} as const;

export function getEmailHtml(input: EmailBody) {
  const validated = EmailBodySchema.parse(input);
  if (typeof validated === 'string') {
    return validated;
  }

  const { type, ...props } = validated;
  const Component = emailTypeToComponentMap[type];
  // biome-ignore lint/suspicious/noExplicitAny: Not sure how to fix this
  return render(Component(props as any));
}
