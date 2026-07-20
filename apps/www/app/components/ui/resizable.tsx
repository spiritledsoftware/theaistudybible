'use client';

import type * as React from 'react';
import { GripVerticalIcon } from 'lucide-react';
import * as ResizablePrimitive from 'react-resizable-panels';

import { cn } from '@/www/lib/utils';

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group>) {
  return (
    <ResizablePrimitive.Group
      data-slot='resizable-panel-group'
      className={cn('h-full w-full', className)}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot='resizable-panel' {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot='resizable-handle'
      className={cn(
        'relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 aria-[orientation=vertical]:h-px aria-[orientation=vertical]:w-full aria-[orientation=vertical]:after:left-0 aria-[orientation=vertical]:after:h-1 aria-[orientation=vertical]:after:w-full aria-[orientation=vertical]:after:translate-x-0 aria-[orientation=vertical]:after:-translate-y-1/2 [&[aria-orientation=vertical]>div]:rotate-90',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className='z-10 flex h-4 w-3 items-center justify-center rounded-xs border bg-border'>
          <GripVerticalIcon className='size-2.5' />
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
