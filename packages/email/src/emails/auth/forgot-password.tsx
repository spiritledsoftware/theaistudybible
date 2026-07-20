import { env } from '@/core/env';
import { Body } from '@/email/components/body';
import { Head } from '@/email/components/head';
import { Tailwind } from '@/email/components/tailwind';
import type { ForgotPasswordEmailSchema } from '@/email/schemas/auth/forgot-password';
import { Container, Heading, Html, Img, Link, Preview, Text } from 'jsx-email';
import type { z } from 'zod';

export type ForgotPasswordEmailProps = Omit<z.infer<typeof ForgotPasswordEmailSchema>, 'type'>;

export const ForgotPasswordEmail = ({ code }: ForgotPasswordEmailProps) => {
  return (
    <Html>
      <Head>
        <Preview>Your Password Reset Code</Preview>
      </Head>
      <Tailwind>
        <Body>
          <Container className='pb-10'>
            <Img
              src={`${env.WEB_APP_URL}/logos/light.png`}
              alt='Logo'
              width={500}
              className='w-1/2'
            />
            <Heading as='h1'>Password Reset Code</Heading>
            <Text>
              Your password reset code is <strong>{code}</strong>
            </Text>
            <Text>
              Click
              <Link
                href={`${env.WEB_APP_URL}/reset-password?code=${code}`}
                className='mx-1 hover:underline'
              >
                here
              </Link>
              to reset your password.
            </Text>
          </Container>
          <Container>
            <Text className='text-muted-foreground text-xs'>
              Do not share this code with anyone. If you did not request a password reset, please
              ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

ForgotPasswordEmail.PreviewProps = {
  code: '123456',
} as ForgotPasswordEmailProps;

export default ForgotPasswordEmail;
