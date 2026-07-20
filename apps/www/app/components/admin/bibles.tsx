import { useMutation } from '@tanstack/react-query';
import { FolderArchive } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import {
  FileInput,
  FileInputDropArea,
  FileInputInput,
  FileInputRoot,
  FileInputTrigger,
} from '../ui/file-input';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export const BiblesContent = () => {
  const [publicationId, setPublicationId] = useState<string>();
  const [generateEmbeddings, setGenerateEmbeddings] = useState(false);
  const [files, setFiles] = useState<FileList>();
  const [toastId, setToastId] = useState<string | number>();

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const params = new URLSearchParams({
        kind: 'bible',
        name: file.name,
        generateEmbeddings: String(generateEmbeddings),
      });
      if (publicationId) params.set('publicationId', publicationId);
      const response = await fetch(`/api/upload?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/zip' },
        body: file,
      });
      if (!response.ok) throw new Error('Failed to upload Bible archive');
    },
    onMutate: () => {
      setToastId(toast.loading('Uploading...', { duration: Number.POSITIVE_INFINITY }));
    },
    onSuccess: () => {
      toast.dismiss(toastId);
      toast.success('Bible zip uploaded');
      setFiles(undefined);
    },
    onError: () => {
      toast.dismiss(toastId);
      toast.error('Failed to upload bible zip');
    },
  });

  const handleSubmit = () => {
    const file = files?.[0];
    if (file) {
      uploadFileMutation.mutate(file);
    } else {
      toast.error('Please select a file');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Bible</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex items-center gap-4'>
          <Input
            className='w-52'
            value={publicationId}
            onChange={(e) => setPublicationId(e.target.value)}
            placeholder='Publication ID (e.g p1)'
          />
          <div className='flex items-center gap-1'>
            <Label>Generate embeddings</Label>
            <Checkbox
              checked={generateEmbeddings}
              onCheckedChange={(checked) =>
                setGenerateEmbeddings(typeof checked === 'boolean' ? checked : false)
              }
            />
          </div>
        </div>
        <FileInput value={files} onChange={setFiles}>
          <FileInputRoot className='h-32'>
            <FileInputTrigger className='flex h-full items-center justify-center border-2 border-gray-300 border-dashed p-4 text-lg'>
              <FolderArchive className='mr-4 size-8' />
              Choose zip
            </FileInputTrigger>
            <FileInputInput />
            <FileInputDropArea className='border-2 border-gray-300 border-dashed p-4'>
              Drop your zip file here
            </FileInputDropArea>
          </FileInputRoot>
        </FileInput>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit}>Upload</Button>
      </CardFooter>
    </Card>
  );
};
