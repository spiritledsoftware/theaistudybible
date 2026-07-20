import { Button } from '@/www/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/www/components/ui/card';
import { DrawerClose } from '@/www/components/ui/drawer';
import { Textarea } from '@/www/components/ui/textarea';
import { useBibleReaderStore } from '@/www/contexts/bible-reader';
import { useCanShare } from '@/www/hooks/use-can-share';
import { Copy } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';

export const ShareCard = () => {
  const brStore = useBibleReaderStore();

  const canShare = useCanShare();
  const [, copyToClipboard] = useCopyToClipboard();

  const shareInputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>Share</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          ref={shareInputRef}
          value={brStore.selectedText}
          className='w-full resize-none'
          autoResize={true}
        />
      </CardContent>
      <CardFooter className='justify-end space-x-2'>
        <DrawerClose asChild>
          <Button variant='outline'>Close</Button>
        </DrawerClose>
        <Button
          onClick={() => {
            if (shareInputRef.current) {
              copyToClipboard(shareInputRef.current.value);
              toast.success('Copied to clipboard');
            }
          }}
        >
          <Copy />
        </Button>
        {canShare && (
          <Button
            onClick={() =>
              navigator.share({
                title: brStore.selectedTitle,
                text: brStore.selectedText,
                url: window.location.href,
              })
            }
          >
            Share
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
