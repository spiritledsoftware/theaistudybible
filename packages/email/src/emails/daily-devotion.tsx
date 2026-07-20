import { env } from '@/core/env';
import { toTitleCase } from '@/core/utils/string';
import { Body } from '@/email/components/body';
import { Head } from '@/email/components/head';
import { Tailwind } from '@/email/components/tailwind';
import type { DailyDevotionEmailSchema } from '@/email/schemas/daily-devotion';
import {
  Column,
  Container,
  Heading,
  Html,
  Img,
  Link,
  Markdown,
  Preview,
  Row,
  Section,
  Text,
} from 'jsx-email';
import { formatDate } from 'date-fns';
import type { z } from 'zod';

export type DailyDevotionEmailProps = Omit<z.infer<typeof DailyDevotionEmailSchema>, 'type'>;

export const DailyDevotionEmail = ({ devotion, devotionImage }: DailyDevotionEmailProps) => {
  return (
    <Html>
      <Head>
        <Preview>Today's Devotion Has Arrived!</Preview>
      </Head>
      <Tailwind>
        <Body>
          <Container>
            <Img
              src={`${env.WEB_APP_URL}/logos/light.png`}
              alt='Logo'
              width={512}
              className='w-1/2'
            />
            <Section>
              <Heading as='h1' className='my-2'>
                Today's Devotion:{' '}
                <span className='font-goldman text-accent-foreground'>
                  {toTitleCase(devotion.topic)}
                </span>
              </Heading>
              <Row className='w-full'>
                <Column>
                  <Heading as='h3' className='my-2 text-muted-foreground'>
                    {formatDate(devotion.createdAt, 'MMMM d, yyyy')}
                  </Heading>
                </Column>
                <Column className='flex items-center justify-end'>
                  <Link
                    href={`${env.WEB_APP_URL}/devotion/${devotion.id}`}
                    className='h-fit w-fit p-0 text-xs'
                  >
                    Read on the Web
                  </Link>
                </Column>
              </Row>
            </Section>
            {devotionImage.url && (
              <Img
                src={devotionImage.url}
                alt={devotionImage.caption ?? 'Devotion Image'}
                width={1024}
                className='mt-2 h-auto w-full rounded'
              />
            )}
            <Section>
              <Heading as='h2'>Bible Reading</Heading>
              <Markdown>{devotion.bibleReading}</Markdown>
            </Section>
            <Section>
              <Heading as='h2'>Summary</Heading>
              <Markdown>{devotion.summary}</Markdown>
            </Section>
            <Section>
              <Heading as='h2'>Reflection</Heading>
              <Markdown>{devotion.reflection}</Markdown>
            </Section>
            <Section>
              <Heading as='h2'>Prayer</Heading>
              <Markdown>{devotion.prayer}</Markdown>
            </Section>
          </Container>
          <Container className='pt-5'>
            <Heading as='h2' className='text-center'>
              Dive Deeper
            </Heading>
            <div className='flex justify-center'>
              <div className='flex flex-wrap gap-4'>
                {devotion.diveDeeperQueries.map((query) => (
                  <Link key={query} href={`${env.WEB_APP_URL}/chat?query=${query}`}>
                    {query}
                  </Link>
                ))}
              </div>
            </div>
          </Container>
          <Container className='pt-10'>
            <Text className='text-muted-foreground text-xs'>
              If you have any questions or feedback, please reply to this email.
              <br />
              If you no longer wish to receive these emails, you can edit your settings{' '}
              <Link href={`${env.WEB_APP_URL}/profile`}>here</Link>.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

DailyDevotionEmail.PreviewProps = {
  devotion: {
    id: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    failed: false,
    topic: 'Love',
    bibleReading: `> For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life. 
> 
> John 3:16`,
    summary: `### This is a summary
#### This is a subheading
This is a paragraph`,
    reflection: `### This is a reflection
Blah blah blah`,
    prayer: `### This is a prayer
Blah blah blah`,
    diveDeeperQueries: ['What is love?', 'How do I love?'],
  },
  devotionImage: {
    id: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    devotionId: '1',
    prompt: 'This is a prompt',
    negativePrompt: 'This is a negative prompt',
    caption: 'This is a caption',
    url: 'https://picsum.photos/1024/512',
  },
} as DailyDevotionEmailProps;

export default DailyDevotionEmail;
