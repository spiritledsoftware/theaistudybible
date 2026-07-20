import { Button } from '@/www/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/www/components/ui/dialog';
import { useAuth } from '@/www/hooks/use-auth';
import { useMutation } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { type ChangeEvent, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '../../../ui/avatar';

export function UpdateAvatarDialog() {
  const { user, refetch } = useAuth();

  const [toastId, setToastId] = useState<string | number>();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleUpdateAvatar = useMutation({
    mutationFn: async (file: File) => {
      const params = new URLSearchParams({ kind: 'profile', name: file.name });
      const response = await fetch(`/api/upload?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? 'Failed to upload avatar');
      }
    },
    onMutate: () =>
      setToastId(toast.loading('Updating avatar...', { duration: Number.POSITIVE_INFINITY })),
    onSuccess: () => {
      toast.dismiss(toastId);
      toast.success('Avatar updated');
      setOpen(false);
      void refetch();
    },
    onError: (error) => {
      toast.dismiss(toastId);
      toast.error(error.message);
    },
  });

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      setSelectedFile(() => file);
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(() => e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      handleUpdateAvatar.mutate(selectedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='rounded-full bg-secondary p-1.5 hover:bg-secondary/90'>
          <Pencil className='size-6' />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Update Profile Picture</DialogTitle>
        <div className='flex flex-col items-center gap-4'>
          <Avatar className='size-32 border-4 border-primary/10'>
            <AvatarImage src={previewUrl || user?.image || undefined} />
            <AvatarFallback className='text-3xl'>
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || '?'}
              {user?.lastName?.charAt(0) || ''}
            </AvatarFallback>
          </Avatar>
          <input
            type='file'
            accept='image/*'
            onChange={handleFileSelect}
            className='hidden'
            id='avatar-upload'
          />
          <label
            htmlFor='avatar-upload'
            className='cursor-pointer rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90'
          >
            Choose Image
          </label>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!selectedFile || handleUpdateAvatar.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
