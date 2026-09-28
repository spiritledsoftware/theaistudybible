import { env } from '@/core/env';
import { lucia } from '@/core/auth';
import {
  createWebAuthnChallenge,
  getPasskeyCredential,
  verifyWebAuthnChallenge,
} from '@/core/auth/providers/webauthn';
import { useAuth } from '@/www/hooks/use-auth';
import {
  decodePKIXECDSASignature,
  decodeSEC1PublicKey,
  p256,
  verifyECDSASignature,
} from '@oslojs/crypto/ecdsa';
import {
  decodePKCS1RSAPublicKey,
  sha256ObjectIdentifier,
  verifyRSASSAPKCS1v15Signature,
} from '@oslojs/crypto/rsa';
import { sha256 } from '@oslojs/crypto/sha2';
import { decodeBase64, encodeBase64 } from '@oslojs/encoding';
import {
  coseAlgorithmES256,
  coseAlgorithmRS256,
  createAssertionSignatureMessage,
  parseAuthenticatorData,
  parseClientDataJSON,
} from '@oslojs/webauthn';
import { useMutation } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { KeyIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '../../ui/button';

const createChallenge = createServerFn({ method: 'POST' }).handler(async () => {
  const challenge = await createWebAuthnChallenge();
  return { challenge: encodeBase64(challenge) };
});

const signInWithPasskey = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      rawId: z.string(),
      sig: z.string(),
      authenticatorData: z.string(),
      clientDataJSON: z.string(),
      redirectUrl: z.string().optional(),
    }),
  )
  .handler(async ({ data: { redirectUrl, ...data } }) => {
    const rawIdBytes = decodeBase64(data.rawId);
    const sigBytes = decodeBase64(data.sig);
    const authenticatorDataBytes = decodeBase64(data.authenticatorData);
    const clientDataJSONBytes = decodeBase64(data.clientDataJSON);

    const authenticatorData = parseAuthenticatorData(authenticatorDataBytes);
    if (!authenticatorData.verifyRelyingPartyIdHash(new URL(env.WEB_APP_URL).hostname)) {
      throw new Error('Invalid relying party ID hash');
    }
    if (!authenticatorData.userPresent || !authenticatorData.userVerified) {
      throw new Error('Invalid user presence or verification');
    }

    const clientData = parseClientDataJSON(clientDataJSONBytes);
    if (!(await verifyWebAuthnChallenge(clientData.challenge))) {
      throw new Error('Invalid challenge');
    }
    if (clientData.origin !== env.WEB_APP_URL) {
      throw new Error('Invalid origin');
    }
    if (clientData.crossOrigin !== null && clientData.crossOrigin) {
      throw new Error('Invalid cross origin');
    }

    const credential = await getPasskeyCredential(rawIdBytes);
    if (!credential) {
      throw new Error('Invalid credential');
    }

    let validSignature: boolean;
    if (credential.algorithmId === coseAlgorithmES256) {
      const ecdsaSignature = decodePKIXECDSASignature(sigBytes);
      const ecdsaPublicKey = decodeSEC1PublicKey(p256, credential.publicKey);
      const hash = sha256(
        createAssertionSignatureMessage(authenticatorDataBytes, clientDataJSONBytes),
      );
      validSignature = verifyECDSASignature(ecdsaPublicKey, hash, ecdsaSignature);
    } else if (credential.algorithmId === coseAlgorithmRS256) {
      const rsaPublicKey = decodePKCS1RSAPublicKey(credential.publicKey);
      const hash = sha256(
        createAssertionSignatureMessage(authenticatorDataBytes, clientDataJSONBytes),
      );
      validSignature = verifyRSASSAPKCS1v15Signature(
        rsaPublicKey,
        sha256ObjectIdentifier,
        hash,
        sigBytes,
      );
    } else {
      throw new Error('Unsupported algorithm');
    }

    if (!validSignature) {
      throw new Error('Invalid signature');
    }

    const sessionToken = lucia.sessions.generateSessionToken();
    const session = await lucia.sessions.createSession(sessionToken, credential.userId);
    const sessionCookie = lucia.cookies.createSessionCookie(sessionToken, session);
    throw redirect({
      to: redirectUrl ?? '/',
      headers: { 'Set-Cookie': sessionCookie.serialize() },
    });
  });

export type PasskeyButtonProps = Omit<ComponentProps<typeof Button>, 'onClick'> & {
  redirectUrl?: string;
};

export const PasskeyButton = (props: PasskeyButtonProps) => {
  const { refetch } = useAuth();

  const onClick = useMutation({
    mutationFn: async () => {
      const { challenge } = await createChallenge();

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(decodeBase64(challenge)),
          userVerification: 'required',
        },
      });

      if (!(credential instanceof PublicKeyCredential)) {
        toast.error('Failed to create public key');
        return;
      }
      if (!(credential.response instanceof AuthenticatorAssertionResponse)) {
        toast.error('Unexpected error');
        return;
      }

      const encodedId = encodeBase64(new Uint8Array(credential.rawId));
      const encodedSig = encodeBase64(new Uint8Array(credential.response.signature));
      const encodedAuthenticatorData = encodeBase64(
        new Uint8Array(credential.response.authenticatorData),
      );
      const encodedClientDataJSON = encodeBase64(
        new Uint8Array(credential.response.clientDataJSON),
      );

      await signInWithPasskey({
        data: {
          rawId: encodedId,
          sig: encodedSig,
          authenticatorData: encodedAuthenticatorData,
          clientDataJSON: encodedClientDataJSON,
          redirectUrl: props.redirectUrl,
        },
      });
    },
    onSuccess: () => refetch(),
    onError: (error) => toast.error(error.message),
  });

  return (
    <Button onClick={() => onClick.mutate()} {...props}>
      <KeyIcon className='mr-2 size-4' />
      Passkey
    </Button>
  );
};
