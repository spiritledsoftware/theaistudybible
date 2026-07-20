import { vectorStore } from '@/ai/vector-store';
import { QueryBoundary } from '@/www/components/query-boundary';
import { Button, buttonVariants } from '@/www/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/www/components/ui/card';
import { DrawerClose } from '@/www/components/ui/drawer';
import { Skeleton } from '@/www/components/ui/skeleton';
import { H6 } from '@/www/components/ui/typography';
import { useBibleReaderStore } from '@/www/contexts/bible-reader';
import { cn } from '@/www/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const getReferences = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      text: z.string(),
      bibleAbbreviation: z.string(),
    }),
  )
  .handler(async ({ data: { text, bibleAbbreviation } }) => {
    const references = await vectorStore.searchDocuments(text, {
      withMetadata: true,
      withEmbedding: false,
      limit: 12,
      filter: {
        type: { $in: ['bible', 'BIBLE'] },
        bibleAbbreviation,
      },
    });
    return { references };
  });

export const ReferencesCard = () => {
  const brStore = useBibleReaderStore();

  const query = useQuery({
    queryKey: [
      'references',
      { text: brStore.selectedText, bibleAbbreviation: brStore.bible.abbreviation },
    ],
    queryFn: () =>
      getReferences({
        data: { text: brStore.selectedText, bibleAbbreviation: brStore.bible.abbreviation },
      }),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return (
    <Card className='flex w-full flex-1 flex-col overflow-y-auto border-none bg-transparent'>
      <CardHeader>
        <CardTitle>References</CardTitle>
      </CardHeader>
      <CardContent className='flex w-full flex-1 flex-col overflow-y-auto'>
        <QueryBoundary
          query={query}
          loadingFallback={
            <div className='flex w-full flex-col items-center space-y-4 rounded-lg border p-5'>
              {new Array(5).fill(null).map((_, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Fine here
                <div key={idx} className='flex w-full space-x-2'>
                  <span className='font-bold'>{idx + 1}.</span>
                  <div className='flex w-full flex-col space-y-2'>
                    <Skeleton className='h-6 w-full rounded-md' />
                    <Skeleton className='h-24 w-full rounded-md' />
                  </div>
                </div>
              ))}
            </div>
          }
          render={({ references }) => (
            <div className='flex w-full flex-1 flex-col space-y-4 overflow-y-auto rounded-lg border p-5'>
              {references.map((reference, idx) => {
                const name =
                  typeof reference.metadata?.name === 'string' ? reference.metadata.name : '';
                const url =
                  typeof reference.metadata?.url === 'string' ? reference.metadata.url : undefined;

                return (
                  <div
                    key={reference.id}
                    className='flex w-full flex-col items-start justify-start'
                  >
                    <div className='flex w-full space-x-2'>
                      <span className='font-bold'>{idx + 1}.</span>
                      <div className='flex w-full flex-col space-y-2'>
                        <H6>{name.replace(`(${brStore.bible.abbreviationLocal})`, '').trim()}:</H6>
                        <p className='line-clamp-5 truncate text-wrap'>
                          {reference.content.replace(`- ${name}`, '').trim()}
                        </p>
                      </div>
                    </div>
                    {url && (
                      <DrawerClose
                        asChild
                        className={cn(
                          buttonVariants({ variant: 'link' }),
                          'text-accent-foreground',
                        )}
                      >
                        <Link to={url}>Read More</Link>
                      </DrawerClose>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        />
      </CardContent>
      <CardFooter className='justify-end space-x-2'>
        <DrawerClose asChild>
          <Button variant='outline'>Close</Button>
        </DrawerClose>
      </CardFooter>
    </Card>
  );
};
