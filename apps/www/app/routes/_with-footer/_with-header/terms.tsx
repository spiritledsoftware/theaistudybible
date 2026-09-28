import { GradientH1, H2, H3, List, ListItem, Muted, P } from '@/www/components/ui/typography';
import { createFileRoute } from '@tanstack/react-router';
import { formatDate } from 'date-fns';

export const Route = createFileRoute('/_with-footer/_with-header/terms')({
  head: () => {
    const title = 'Terms of Service | The AI Study Bible';
    const description =
      "Review our terms of service to understand the guidelines, user responsibilities, and conditions for using The AI Study Bible's AI-powered study tools and features.";
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { name: 'og:title', content: title },
        { name: 'og:description', content: description },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className='container mx-auto max-w-4xl px-4 py-12'>
      <header className='text-center'>
        <GradientH1>Terms of Service</GradientH1>
        <Muted>
          Last updated: {formatDate(new Date('2026-09-28T10:00:00-04:00'), 'MMMM d, yyyy')}
        </Muted>
      </header>

      <div className='mt-12 space-y-12'>
        <section>
          <H2 className='mb-4'>1. Acceptance of Terms</H2>
          <P>
            By accessing or using The AI Study Bible ("Service"), you agree to be bound by these
            Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our
            Service.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>2. Description of Service</H2>
          <P>
            The AI Study Bible provides AI-powered Bible study tools and resources. We reserve the
            right to modify, suspend, or discontinue any part of our Service at any time without
            notice.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>3. User Accounts</H2>
          <P>
            You are responsible for maintaining the confidentiality of your account and password.
            You agree to accept responsibility for all activities that occur under your account. You
            must be at least 13 years old to use this Service.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>4. User Conduct</H2>
          <P>You agree not to use the Service to:</P>
          <List>
            <ListItem>Violate any applicable laws or regulations</ListItem>
            <ListItem>Infringe upon the rights of others</ListItem>
            <ListItem>Distribute harmful, offensive, or inappropriate content</ListItem>
            <ListItem>
              Attempt to gain unauthorized access to our systems or other users' accounts
            </ListItem>
            <ListItem>Engage in any activity that interferes with or disrupts the Service</ListItem>
          </List>
        </section>

        <section>
          <H2 className='mb-4'>5. Intellectual Property</H2>
          <P>
            The content, features, and functionality of The AI Study Bible are owned by us and are
            protected by United States and international copyright, trademark, and other
            intellectual property laws.
          </P>
          <H3 className='mt-4 mb-2'>5.1 Limited License</H3>
          <P>
            We grant you a limited, non-exclusive, non-transferable license to use the Service for
            personal, non-commercial purposes in accordance with these Terms.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>6. Disclaimer of Warranties</H2>
          <P>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
            ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>7. Limitation of Liability</H2>
          <P>
            TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION,
            LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR
            ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>8. Indemnification</H2>
          <P>
            You agree to indemnify, defend, and hold harmless The AI Study Bible and its officers,
            directors, employees, agents, and affiliates from and against any claims, liabilities,
            damages, losses, and expenses arising out of or in any way connected with your access to
            or use of the Service or your violation of these Terms.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>9. Dispute Resolution</H2>
          <P>
            Any dispute arising from these Terms or your use of the Service shall be resolved
            through binding arbitration in accordance with the American Arbitration Association's
            rules. The arbitration shall be conducted in the State of Florida, and the arbitrator's
            decision shall be final and binding.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>10. Governing Law</H2>
          <P>
            These Terms shall be governed by and construed in accordance with the laws of the State
            of Florida, without regard to its conflict of law provisions.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>11. Changes to Terms</H2>
          <P>
            We reserve the right to modify these Terms at any time. We will notify users of any
            significant changes via email or through our website. Your continued use of the Service
            after such modifications constitutes your acceptance of the updated Terms.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>12. Termination</H2>
          <P>
            We may terminate or suspend your account and access to the Service immediately, without
            prior notice or liability, for any reason, including if you breach these Terms.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>13. Severability</H2>
          <P>
            If any provision of these Terms is found to be unenforceable or invalid, that provision
            shall be limited or eliminated to the minimum extent necessary so that these Terms shall
            otherwise remain in full force and effect and enforceable.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>14. Entire Agreement</H2>
          <P>
            These Terms constitute the entire agreement between you and The AI Study Bible regarding
            the Service and supersede all prior agreements and understandings.
          </P>
        </section>

        <section>
          <H2 className='mb-4'>15. Contact Us</H2>
          <P>
            If you have any questions about these Terms, please contact us at{' '}
            <a href='mailto:terms@theaistudybible.com' className='text-primary hover:underline'>
              terms@theaistudybible.com
            </a>
            .
          </P>
        </section>
      </div>
    </div>
  );
}
