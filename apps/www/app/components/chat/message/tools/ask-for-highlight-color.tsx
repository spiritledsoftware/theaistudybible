import { toCapitalizedCase } from '@/core/utils/string';
import { ColorItem } from '@/www/components/bible/reader/activity-panel/highlight/color-item';
import { Button } from '@/www/components/ui/button';
import { ToggleGroup } from '@/www/components/ui/toggle-group';
import { H5 } from '@/www/components/ui/typography';
import type { useChat } from '@/www/hooks/use-chat';
import { Palette } from 'lucide-react';
import { useState } from 'react';
import type { ToolInvocation } from '.';

export type AskForHighlightColorToolProps = {
  toolInvocation: ToolInvocation;
  addToolResult: ReturnType<typeof useChat>['addToolResult'];
};

export const AskForHighlightColorTool = (props: AskForHighlightColorToolProps) => {
  const [tgValue, setTgValue] = useState<string | undefined>();

  // Check if result exists in toolInvocation
  const result = props.toolInvocation.result as
    | {
        status: 'canceled' | 'confirmed';
        color?: string;
      }
    | undefined;

  return (
    <div className='flex w-full flex-col'>
      <H5 className='flex items-center'>
        <Palette className='mr-2' size={18} />
        Select Highlight Color
      </H5>
      {!result ? (
        <div className='mt-3 flex w-full flex-col space-y-2 p-3'>
          <ToggleGroup
            type='single'
            className='grid grid-cols-4 grid-rows-2'
            onValueChange={setTgValue}
          >
            <ColorItem title='Pink' hex='#FFC0CB' />
            <ColorItem title='Blue' hex='#ADD8E6' />
            <ColorItem title='Green' hex='#90EE90' />
            <ColorItem title='Yellow' hex='#FFFF00' />
            <ColorItem title='Orange' hex='#FFA500' />
            <ColorItem title='Purple' hex='#DDA0DD' />
            <ColorItem title='Red' hex='#FF6347' />
            <ColorItem title='Cyan' hex='#00FFFF' />
          </ToggleGroup>
          <div className='flex justify-end space-x-2'>
            <Button
              variant='outline'
              onClick={() =>
                props.addToolResult({
                  tool: 'askForHighlightColor',
                  toolCallId: props.toolInvocation.toolCallId,
                  output: {
                    status: 'canceled',
                  },
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                props.addToolResult({
                  tool: 'askForHighlightColor',
                  toolCallId: props.toolInvocation.toolCallId,
                  output: {
                    status: 'confirmed',
                    color: tgValue || undefined,
                  },
                })
              }
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className='flex items-center space-x-2'>
          <span className='text-sm'>{toCapitalizedCase(result.status)}</span>
          {result.color && (
            <div
              className='h-4 w-4 shrink-0 rounded-full'
              style={{
                backgroundColor: result.color,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
