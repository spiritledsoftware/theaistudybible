import { Resource } from 'alchemy';
import {
  type CloudflareApiOptions,
  createCloudflareApi,
  findZoneForHostname,
  handleApiError,
} from 'alchemy/cloudflare';

export interface EmailSendingDomainProps extends CloudflareApiOptions {
  /** Domain (or subdomain) inside a Cloudflare zone that may send through Email Service. */
  name: string;
}

export interface EmailSendingDomain {
  id: string;
  name: string;
  zoneId: string;
}

type SendingSubdomain = { id: string; name: string };
type ApiEnvelope<T> = { result: T };

/**
 * Onboards a domain to Cloudflare Email Service sending. Cloudflare creates and locks the
 * SPF, DKIM, DMARC and bounce MX records itself.
 *
 * The onboarding is zone-wide and shared by every stage that sends from the domain, so
 * destroying a stage leaves it in place; disable sending in the dashboard if ever needed.
 */
export const EmailSendingDomain = Resource(
  'theaistudybible::EmailSendingDomain',
  async function (
    this: import('alchemy').Context<EmailSendingDomain>,
    _id: string,
    props: EmailSendingDomainProps,
  ): Promise<EmailSendingDomain> {
    if (this.phase === 'delete') {
      return this.destroy();
    }

    const api = await createCloudflareApi(props);
    const { zoneId } = await findZoneForHostname(api, props.name);
    const basePath = `/zones/${zoneId}/email/sending/subdomains`;

    const listResponse = await api.get(basePath);
    if (!listResponse.ok) {
      await handleApiError(listResponse, 'listing', 'email sending subdomains');
    }
    const { result: existing } = (await listResponse.json()) as ApiEnvelope<SendingSubdomain[]>;
    let subdomain = existing.find(({ name }) => name === props.name);

    if (!subdomain) {
      // Creating also re-enables sending on a subdomain that had it disabled.
      const createResponse = await api.post(basePath, { name: props.name });
      if (!createResponse.ok) {
        await handleApiError(createResponse, 'creating', 'email sending subdomain', props.name);
      }
      subdomain = ((await createResponse.json()) as ApiEnvelope<SendingSubdomain>).result;
    }

    return { id: subdomain.id, name: subdomain.name, zoneId };
  },
);
