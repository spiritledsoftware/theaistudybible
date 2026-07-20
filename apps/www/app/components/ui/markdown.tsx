import { cn } from '@/www/lib/utils';
import { type ComponentProps, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { sanitizeMarkdownUrl } from './markdown-url';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import * as Typography from './typography';

export type MarkdownProps = ComponentProps<'div'> & {
  children: string;
  components?: ComponentProps<typeof ReactMarkdown>['components'];
};

export const Markdown = ({
  className,
  components: propsComponents,
  children,
  ...props
}: MarkdownProps) => {
  const components: ComponentProps<typeof ReactMarkdown>['components'] = useMemo(
    () => ({
      h1: ({ id, children, ...rest }) => (
        <Typography.H1 id={id} {...rest}>
          <a href={`#${id}`}>{children}</a>
        </Typography.H1>
      ),
      h2: ({ id, children, ...rest }) => (
        <Typography.H2 id={id} {...rest}>
          <a href={`#${id}`}>{children}</a>
        </Typography.H2>
      ),
      h3: ({ id, children, ...rest }) => (
        <Typography.H3 id={id} {...rest}>
          <a href={`#${id}`}>{children}</a>
        </Typography.H3>
      ),
      h4: ({ id, children, ...rest }) => (
        <Typography.H4 id={id} {...rest}>
          <a href={`#${id}`}>{children}</a>
        </Typography.H4>
      ),
      h5: ({ id, children, ...rest }) => (
        <Typography.H5 id={id} {...rest}>
          <a href={`#${id}`}>{children}</a>
        </Typography.H5>
      ),
      h6: ({ id, children, ...rest }) => (
        <Typography.H6 id={id} {...rest}>
          <a href={`#${id}`}>{children}</a>
        </Typography.H6>
      ),
      p: ({ children, ...rest }) => (
        <Typography.P className='group-[.is-list]:inline group-[.is-quote]:inline' {...rest}>
          {children}
        </Typography.P>
      ),
      a: ({ href, children, ...rest }) => (
        <Button asChild variant='link' className='inline h-fit w-fit p-0'>
          <a href={href ?? '#'} {...rest}>
            {children}
          </a>
        </Button>
      ),
      blockquote: ({ className, ...rest }) => (
        <Typography.Blockquote className={cn('is-quote group', className)} {...rest} />
      ),
      img: ({ src, alt, title, className, ...rest }) => (
        <Dialog>
          <DialogTrigger>
            <img
              {...rest}
              src={src}
              alt={alt ?? title ?? 'Generated Image'}
              loading='lazy'
              className={cn('h-auto w-full rounded-md', className)}
            />
          </DialogTrigger>
          <DialogContent className='max-w-(--breakpoint-lg)'>
            <DialogHeader>
              <DialogTitle>Generated Image</DialogTitle>
            </DialogHeader>
            <a href={src ?? '#'} target='_blank' rel='noopener noreferrer'>
              <img
                {...rest}
                src={src}
                alt={alt ?? title ?? 'Generated Image'}
                loading='lazy'
                className={cn('h-auto w-full rounded-md', className)}
              />
            </a>
          </DialogContent>
        </Dialog>
      ),
      ul: (props) => <Typography.List {...props} />,
      ol: (props) => <Typography.OrderedList {...props} />,
      li: ({ className, ...rest }) => (
        <Typography.ListItem className={cn('is-list group', className)} {...rest} />
      ),
      code: (props) => <Typography.CodeBlock {...props} />,
      strong: (props) => <Typography.Strong {...props} />,
      em: (props) => <Typography.Emphasis {...props} />,
      ...propsComponents,
    }),
    [propsComponents],
  );

  return (
    <div className={cn('whitespace-pre-wrap', className)} {...props}>
      <ReactMarkdown components={components} urlTransform={sanitizeMarkdownUrl}>
        {children}
      </ReactMarkdown>
    </div>
  );
};
