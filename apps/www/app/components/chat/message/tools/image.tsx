import type { generateImageTool } from '@/ai/chat/tools';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/www/components/ui/dialog';
import { Image, ImageFallback, ImageImage } from '@/www/components/ui/image';
import { Markdown } from '@/www/components/ui/markdown';
import { Spinner } from '@/www/components/ui/spinner';
import { H5, H6 } from '@/www/components/ui/typography';
import type { InferToolInput, InferToolOutput } from 'ai';
import { Image as ImageIcon } from 'lucide-react';
import type { ToolInvocation } from '.';

export type GenerateImageToolProps = {
  toolInvocation: ToolInvocation;
  isLoading: boolean;
};

export const GenerateImageTool = (props: GenerateImageToolProps) => {
  const toolArgs = props.toolInvocation.args as InferToolInput<
    ReturnType<typeof generateImageTool>
  >;

  const result =
    'result' in props.toolInvocation
      ? (props.toolInvocation.result as Exclude<
          InferToolOutput<ReturnType<typeof generateImageTool>>,
          AsyncIterable<unknown>
        >)
      : null;

  return (
    <div className='flex w-full flex-col'>
      <H5 className='flex items-center'>
        <ImageIcon className='mr-2' size={18} />
        Generate Image
      </H5>
      {toolArgs && (
        <div className='flex w-full flex-col'>
          {props.isLoading ? (
            <div className='animate-pulse'>{toolArgs.prompt}</div>
          ) : (
            <Markdown>{toolArgs.prompt}</Markdown>
          )}
        </div>
      )}
      {props.isLoading && !result && (
        <div className='mt-2 flex w-full flex-col'>
          <H6>Generating</H6>
          <Spinner size='sm' />
        </div>
      )}
      {result && (
        <div className='mt-2 flex w-full flex-col'>
          <H6>Result</H6>
          {result.status === 'error' ? (
            <div className='flex flex-col text-sm'>
              <span>Failed</span>
              <span>{result.message}</span>
            </div>
          ) : (
            <div className='flex w-full flex-col text-sm'>
              {result.status === 'success' && (
                <div className='flex w-full flex-col gap-2'>
                  {/* Show small thumbnail here */}
                  <div className='h-auto w-[128px]'>
                    <Dialog>
                      <DialogTrigger>
                        <Image className='w-full'>
                          <ImageImage src={result.image.url!} />
                          <ImageFallback>
                            <Spinner size='sm' />
                          </ImageFallback>
                        </Image>
                      </DialogTrigger>
                      <DialogContent className='max-w-[var(--breakpoint-lg)]'>
                        <DialogHeader>
                          <DialogTitle>Generated Image</DialogTitle>
                        </DialogHeader>
                        <a href={result.image.url!} target='_blank' rel='noopener noreferrer'>
                          <Image className='w-full'>
                            <ImageImage src={result.image.url!} />
                            <ImageFallback>
                              <Spinner size='sm' />
                            </ImageFallback>
                          </Image>
                        </a>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {result.image.prompt && (
                    <p className='text-xs'>
                      <strong>Revised Prompt:</strong> {result.image.prompt}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
