import { env } from '@/core/env';
import { Body } from '@/email/components/body';
import { Head } from '@/email/components/head';
import { Tailwind } from '@/email/components/tailwind';
import type { DeadLetterEmailSchema } from '@/email/schemas/dead-letter';
import { Container, Heading, Html, Img, Preview } from 'jsx-email';
import type { z } from 'zod';

export type DeadLetterEmailProps = Omit<z.infer<typeof DeadLetterEmailSchema>, 'type'>;

export const DeadLetterEmail = ({ record }: DeadLetterEmailProps) => {
  return (
    <Html>
      <Head>
        <Preview>Dead-letter Queue Event</Preview>
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
            <pre className='rounded-xl bg-muted p-4'>{JSON.stringify(record, null, 2)}</pre>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

DeadLetterEmail.PreviewProps = {
  record: {
    body: 'test',
  },
} as DeadLetterEmailProps;

export default DeadLetterEmail;
