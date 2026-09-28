import { env } from '@/core/env';
import {
  type WebAuthnUserCredential,
  createPasskeyCredential,
  createWebAuthnChallenge,
  deleteUserPasskeyCredential,
  getUserPasskeyCredentials,
  verifyWebAuthnChallenge,
} from '@/core/auth/providers/webauthn';
import { fnv1a } from '@/core/utils/hash';
import { QueryBoundary } from '@/www/components/query-boundary';
import { useAuth } from '@/www/hooks/use-auth';
import { requireAuthMiddleware } from '@/www/server/middleware/auth';
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
import { useMutation, useQuery } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '../../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';

const getPasskeys = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const passkeys = await getUserPasskeyCredentials(context.user.id);
    return {
      passkeys: passkeys.map((passkey) => ({
        ...passkey,
        id: encodeBase64(passkey.id),
        publicKey: encodeBase64(passkey.publicKey),
      })),
    };
  });

const deletePasskey = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .validator(z.object({ passkeyId: z.string() }))
  .handler(async ({ context, data }) => {
    const success = await deleteUserPasskeyCredential(
      context.user.id,
      decodeBase64(data.passkeyId),
    );
    return { success };
  });

const createChallenge = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const credentialsId = new Uint8Array(8);
    bigEndian.putUint64(credentialsId, fnv1a(context.user.email), 0);

    const challenge = await createWebAuthnChallenge();
    return { challenge: encodeBase64(challenge), credentialsId: encodeBase64(credentialsId) };
  });

const createPasskey = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .validator(
    z.object({
      attestationObject: z.string(),
      clientDataJSON: z.string(),
      name: z.string(),
    }),
  )
  .handler(async ({ context, data }) => {
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
        userId: context.user.id,
        algorithmId: coseAlgorithmES256,
        name: data.name,
        publicKey: encodedPublicKey,
      };
    } else if (authenticatorData.credential.publicKey.algorithm() === coseAlgorithmRS256) {
      const cosePublicKey = authenticatorData.credential.publicKey.rsa();
      const encodedPublicKey = new RSAPublicKey(cosePublicKey.n, cosePublicKey.e).encodePKCS1();
      credential = {
        id: authenticatorData.credential.id,
        userId: context.user.id,
        algorithmId: coseAlgorithmRS256,
        name: data.name,
        publicKey: encodedPublicKey,
      };
    } else {
      throw new Error('Unsupported algorithm');
    }

    const credentials = await getUserPasskeyCredentials(context.user.id);
    if (credentials.length >= 5) {
      throw new Error('Too many credentials');
    }

    const passkeyCredential = await createPasskeyCredential(credential);
    return {
      passkeyCredential: {
        ...passkeyCredential,
        id: encodeBase64(passkeyCredential.id),
        publicKey: encodeBase64(passkeyCredential.publicKey),
      },
    };
  });

export function PasskeysCard() {
  const { user } = useAuth();

  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');

  const passkeysQuery = useQuery({
    queryKey: ['passkeys'],
    queryFn: () => getPasskeys(),
  });

  const deletePasskeyMutation = useMutation({
    mutationFn: (passkeyId: string) => deletePasskey({ data: { passkeyId } }),
    onSuccess: () => {
      toast.success('Passkey deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      passkeysQuery.refetch();
    },
  });

  const addPasskeyMutation = useMutation({
    mutationFn: async () => {
      const { challenge, credentialsId } = await createChallenge();

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(decodeBase64(challenge)),
          user: {
            displayName: user?.email || '',
            name: user?.email || '',
            id: new Uint8Array(decodeBase64(credentialsId)),
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

      await createPasskey({
        data: {
          attestationObject: encodedAttestationObject,
          clientDataJSON: encodedClientDataJSON,
          name: passkeyName || user?.email || '',
        },
      });
    },
    onSuccess: () => {
      setIsAddingPasskey(false);
      toast.success('Passkey added successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      passkeysQuery.refetch();
    },
  });

  return (
    <Card className='h-full w-full'>
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>Manage your passkeys for passwordless authentication.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <QueryBoundary
          query={passkeysQuery}
          notFoundFallback={
            <div className='text-center text-muted-foreground'>No passkeys found</div>
          }
          render={({ passkeys }) => (
            <div className='space-y-2'>
              {passkeys.length > 0 ? (
                passkeys.map((passkey) => (
                  <div
                    key={passkey.id}
                    className='flex items-center justify-between rounded-lg border p-3'
                  >
                    <div>
                      <div className='font-medium'>{passkey.name}</div>
                      <div className='text-muted-foreground text-sm'>
                        Created on {new Date(passkey.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant='destructive'
                      size='sm'
                      onClick={() => deletePasskeyMutation.mutate(passkey.id)}
                      disabled={deletePasskeyMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                ))
              ) : (
                <div className='text-center text-muted-foreground'>No passkeys found</div>
              )}
            </div>
          )}
        />

        <Dialog
          open={isAddingPasskey}
          onOpenChange={(open) => {
            setIsAddingPasskey(open);
            if (!open) setPasskeyName('');
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Passkey</DialogTitle>
              <DialogDescription>
                Optionally give your passkey a name to help identify it later, then follow your
                device's prompts
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <label htmlFor='passkey-name' className='font-medium text-sm'>
                  Passkey Name <span className='text-muted-foreground'>(optional)</span>
                </label>
                <input
                  id='passkey-name'
                  type='text'
                  placeholder='e.g., Work Laptop, Phone'
                  value={passkeyName}
                  onInput={(e) => setPasskeyName(e.currentTarget.value)}
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2'
                />
              </div>
              <div className='flex justify-end gap-2'>
                <Button variant='outline' onClick={() => setIsAddingPasskey(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => addPasskeyMutation.mutate()}
                  disabled={addPasskeyMutation.isPending}
                >
                  Continue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
      <CardFooter className='flex justify-end'>
        <Button onClick={() => setIsAddingPasskey(true)} disabled={addPasskeyMutation.isPending}>
          Add Passkey
        </Button>
      </CardFooter>
    </Card>
  );
}
