import { env } from '@/core/env';
import { Body } from '@/email/components/body';
import { Head } from '@/email/components/head';
import { Tailwind } from '@/email/components/tailwind';
import type { DeadLetterEmailSchema } from '@/email/schemas/dead-letter';
import { Container, Heading, Html, Img, Preview, Text } from 'jsx-email';
import type { z } from 'zod';

export type DeadLetterEmailProps = Omit<z.infer<typeof DeadLetterEmailSchema>, 'type'>;

export const DeadLetterEmail = ({ queue, messages }: DeadLetterEmailProps) => {
  return (
    <Html>
      <Head>
        <Preview>{`${messages.length} message(s) dead-lettered on ${queue}`}</Preview>
      </Head>
      <Tailwind>
        <Body>
          <Container>
            <Img
              src={`${env.WEB_APP_URL}/logos/light.png`}
              alt='Logo'
              width={500}
              className='w-1/2'
            />
            <Heading as='h1'>Dead-letter Queue Event</Heading>
            <Text>
              {messages.length} message(s) exhausted their retries and were received on{' '}
              <code>{queue}</code>. Message bodies are withheld; see Sentry for details.
            </Text>
            <pre className='rounded-xl bg-muted p-4'>
              {messages
                .map(
                  (message) =>
                    `${message.id}  attempts=${message.attempts}  enqueued=${message.timestamp}`,
                )
                .join('\n')}
            </pre>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

DeadLetterEmail.PreviewProps = {
  queue: 'dead-letter',
  messages: [{ id: 'example-message-id', timestamp: '2026-01-01T00:00:00.000Z', attempts: 3 }],
} as DeadLetterEmailProps;

export default DeadLetterEmail;
