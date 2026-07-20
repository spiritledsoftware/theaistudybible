import type { vectorStoreTool } from '@/ai/chat/tools';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/www/components/ui/accordion';
import { buttonVariants } from '@/www/components/ui/button';
import { Spinner } from '@/www/components/ui/spinner';
import { H5, H6 } from '@/www/components/ui/typography';
import { cn } from '@/www/lib/utils';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Link } from '@tanstack/react-router';
import type { InferToolInput, InferToolOutput } from 'ai';
import { ArrowUpRightFromSquare, BookOpen as BookOpenIcon, FileIcon, Search } from 'lucide-react';
import type { ToolInvocation } from '.';

export type VectorStoreToolProps = {
  toolInvocation: ToolInvocation;
  isLoading: boolean;
};

export const VectorStoreTool = (props: VectorStoreToolProps) => {
  const [containerRef] = useAutoAnimate();

  const toolArgs = props.toolInvocation.args as InferToolInput<ReturnType<typeof vectorStoreTool>>;

  const result =
    'result' in props.toolInvocation
      ? (props.toolInvocation.result as Exclude<
          InferToolOutput<ReturnType<typeof vectorStoreTool>>,
          AsyncIterable<unknown>
        >)
      : null;

  return (
    <div className='flex w-full flex-col pr-5'>
      <H5 className='flex items-center'>
        <Search className='mr-2' size={18} />
        Search for Sources
      </H5>
      {toolArgs && (
        <div className='flex w-full flex-col'>
          <H6 className='font-goldman font-normal'>Queries</H6>
          <div ref={containerRef} className='flex flex-wrap gap-2 px-2 py-1'>
            {toolArgs.terms.map((searchTerm) => (
              <div
                key={JSON.stringify(searchTerm)}
                className='rounded-full bg-primary px-2 py-1 text-primary-foreground text-xs'
              >
                {searchTerm.term}
              </div>
            ))}
          </div>
        </div>
      )}
      {props.isLoading && !result && (
        <div className='mt-2 flex w-full flex-col'>
          <H6>Searching</H6>
          <Spinner size='sm' />
        </div>
      )}
      {result &&
        (result.status === 'success' && result.documents ? (
          <Accordion type='single' collapsible className='w-full text-sm'>
            <AccordionItem value='results'>
              <AccordionTrigger>Results ({result.documents.length})</AccordionTrigger>
              <AccordionContent>
                <div className='flex flex-wrap gap-2'>
                  {result.documents.map((doc) => {
                    const url =
                      typeof doc.metadata?.url === 'string' ? doc.metadata.url : undefined;
                    const sourceType =
                      typeof doc.metadata?.type === 'string'
                        ? doc.metadata.type.toUpperCase()
                        : undefined;
                    const name =
                      typeof doc.metadata?.name === 'string' ? doc.metadata.name : (url ?? '');
                    const isInternalLink =
                      url !== undefined && url.startsWith(window.location.origin);

                    const linkContent = (
                      <>
                        <span className='mr-1'>
                          {sourceType === 'BIBLE' ? (
                            <BookOpenIcon size={12} />
                          ) : sourceType === 'REMOTE_FILE' ? (
                            <FileIcon size={12} />
                          ) : (
                            <ArrowUpRightFromSquare size={12} />
                          )}
                        </span>
                        <span className='line-clamp-2 text-wrap group-hover:line-clamp-none'>
                          {name}
                        </span>
                      </>
                    );

                    return (
                      <div key={doc.id}>
                        {isInternalLink ? (
                          <Link
                            to={url ?? ''}
                            className={cn(
                              buttonVariants({ variant: 'outline' }),
                              'group flex h-fit max-w-full items-center rounded-full px-3 py-2 text-xs',
                            )}
                          >
                            {linkContent}
                          </Link>
                        ) : (
                          <a
                            href={url}
                            className={cn(
                              buttonVariants({ variant: 'outline' }),
                              'group flex h-fit max-w-full items-center rounded-full px-3 py-2 text-xs',
                            )}
                            target='_blank'
                            rel='noopener noreferrer'
                          >
                            {linkContent}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          <div className='text-muted-foreground text-sm'>Failed to fetch documents</div>
        ))}
    </div>
  );
};
