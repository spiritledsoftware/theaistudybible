import { env } from '@/core/env';
import { lucia } from '@/core/auth';
import {
  type WebAuthnUserCredential,
  createPasskeyCredential,
  createWebAuthnChallenge,
  getUserPasskeyCredentials,
  verifyWebAuthnChallenge,
} from '@/core/auth/providers/webauthn';
import { db } from '@/core/database';
import { userSettings, users } from '@/core/database/schema';
import { fnv1a } from '@/core/utils/hash';
import { useAuth } from '@/www/hooks/use-auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { bigEndian } from '@oslojs/binary';
import { ECDSAPublicKey, p256 } from '@oslojs/crypto/ecdsa';
import { RSAPublicKey } from '@oslojs/crypto/rsa';
import { decodeBase64, encodeBase64 } from '@oslojs/encoding';
import {
  AttestationStatementFormat,
  ClientDataType,
  coseAlgorithmES256,
  coseAlgorithmRS256,
  coseEllipticCurveP256,
  parseAttestationObject,
  parseClientDataJSON,
} from '@oslojs/webauthn';
import { useMutation } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { KeyIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../ui/form';
import { Input } from '../../ui/input';

const passkeySchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const createChallenge = createServerFn({ method: 'POST' })
  .validator(passkeySchema)
  .handler(async ({ data: { email } }) => {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    const credentialsId = new Uint8Array(8);
    bigEndian.putUint64(credentialsId, fnv1a(email), 0);

    const challenge = await createWebAuthnChallenge();
    return { challenge: encodeBase64(challenge), credentialsId: encodeBase64(credentialsId) };
  });

const signUpWithPasskey = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      email: z.string().email(),
      attestationObject: z.string(),
      clientDataJSON: z.string(),
      redirectUrl: z.string().optional(),
    }),
  )
  .handler(async ({ data: { redirectUrl, ...data } }) => {
    const attestationObjectBytes = decodeBase64(data.attestationObject);
    const clientDataJSON = decodeBase64(data.clientDataJSON);

    const attestationObject = parseAttestationObject(attestationObjectBytes);
    const attestationStatement = attestationObject.attestationStatement;
    const authenticatorData = attestationObject.authenticatorData;

    if (attestationStatement.format !== AttestationStatementFormat.None) {
      throw new Error('Invalid attestation statement format');
    }
    if (!authenticatorData.verifyRelyingPartyIdHash(new URL(env.WEB_APP_URL).hostname)) {
      throw new Error('Invalid relying party ID hash');
    }
    if (!authenticatorData.userPresent || !authenticatorData.userVerified) {
      throw new Error('Invalid user presence or verification');
    }
    if (authenticatorData.credential === null) {
      throw new Error('Invalid credential');
    }

    const clientData = parseClientDataJSON(clientDataJSON);
    if (clientData.type !== ClientDataType.Create) {
      throw new Error('Invalid client data type');
    }

    if (!(await verifyWebAuthnChallenge(clientData.challenge))) {
      throw new Error('Invalid challenge');
    }
    if (clientData.origin !== env.WEB_APP_URL) {
      throw new Error('Invalid origin');
    }
    if (clientData.crossOrigin !== null && clientData.crossOrigin) {
      throw new Error('Invalid cross origin');
    }

    const [user] = await db.insert(users).values({ email: data.email }).returning();
    await db.insert(userSettings).values({ userId: user.id });

    let credential: WebAuthnUserCredential;
    if (authenticatorData.credential.publicKey.algorithm() === coseAlgorithmES256) {
      const cosePublicKey = authenticatorData.credential.publicKey.ec2();
      if (cosePublicKey.curve !== coseEllipticCurveP256) {
        throw new Error('Unsupported algorithm');
      }
      const encodedPublicKey = new ECDSAPublicKey(
        p256,
        cosePublicKey.x,
        cosePublicKey.y,
      ).encodeSEC1Uncompressed();
      credential = {
        id: authenticatorData.credential.id,
        userId: user.id,
        algorithmId: coseAlgorithmES256,
        name: user.email,
        publicKey: encodedPublicKey,
      };
    } else if (authenticatorData.credential.publicKey.algorithm() === coseAlgorithmRS256) {
      const cosePublicKey = authenticatorData.credential.publicKey.rsa();
      const encodedPublicKey = new RSAPublicKey(cosePublicKey.n, cosePublicKey.e).encodePKCS1();
      credential = {
        id: authenticatorData.credential.id,
        userId: user.id,
        algorithmId: coseAlgorithmRS256,
        name: user.email,
        publicKey: encodedPublicKey,
      };
    } else {
      throw new Error('Unsupported algorithm');
    }

    const credentials = await getUserPasskeyCredentials(user.id);
    if (credentials.length >= 5) {
      throw new Error('Too many credentials');
    }

    await createPasskeyCredential(credential);

    const sessionToken = lucia.sessions.generateSessionToken();
    const session = await lucia.sessions.createSession(sessionToken, user.id);
    const sessionCookie = lucia.cookies.createSessionCookie(sessionToken, session);

    throw redirect({ to: redirectUrl, headers: { 'Set-Cookie': sessionCookie.serialize() } });
  });

export type PasskeyFormProps = {
  redirectUrl?: string;
};

export function PasskeyForm(props: PasskeyFormProps) {
  const { refetch } = useAuth();

  const form = useForm<z.infer<typeof passkeySchema>>({
    resolver: zodResolver(passkeySchema),
  });

  const [isOpen, setIsOpen] = useState(false);

  const onSubmit = useMutation({
    mutationFn: async ({ email }: z.infer<typeof passkeySchema>) => {
      const { challenge, credentialsId } = await createChallenge({ data: { email } });

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: decodeBase64(challenge),
          user: {
            displayName: email,
            name: email,
            id: decodeBase64(credentialsId),
          },
          rp: {
            name: 'The AI Study Bible',
            id: window.location.hostname,
          },
          pubKeyCredParams: [
            {
              type: 'public-key',
              alg: coseAlgorithmES256,
            },
            {
              type: 'public-key',
              alg: coseAlgorithmRS256,
            },
          ],
          attestation: 'none',
          authenticatorSelection: {
            userVerification: 'required',
            residentKey: 'required',
            requireResidentKey: true,
          },
        },
      });

      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error('Failed to create public key');
      }
      if (!(credential.response instanceof AuthenticatorAttestationResponse)) {
        throw new Error('Unexpected error');
      }

      const encodedAttestationObject = encodeBase64(
        new Uint8Array(credential.response.attestationObject),
      );
      const encodedClientDataJSON = encodeBase64(
        new Uint8Array(credential.response.clientDataJSON),
      );
      await signUpWithPasskey({
        data: {
          email,
          attestationObject: encodedAttestationObject,
          clientDataJSON: encodedClientDataJSON,
          redirectUrl: props.redirectUrl,
        },
      });
    },
    onSuccess: () => refetch(),
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <KeyIcon className='mr-2 size-4' />
          Passkey
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>Sign Up with Passkey</DialogTitle>
          <DialogDescription>Sign up using passwordless authentication.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => onSubmit.mutate(values))}
            className='flex flex-col gap-4'
          >
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem className='w-full'>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type='email'
                      placeholder='your@email.com'
                      autoComplete='email'
                      className='p-2 text-sm sm:text-base'
                    />
                  </FormControl>
                  <FormMessage className='text-xs sm:text-sm' />
                </FormItem>
              )}
            />
            <div className='flex justify-end gap-2'>
              <Button variant='outline' onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={form.formState.isSubmitting || form.formState.isLoading}
              >
                Submit
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
