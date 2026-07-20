import { db } from '@/core/database';
import { dataSources } from '@/core/database/schema';
import { CreateDataSourceSchema, SourceChristianTraditionSchema } from '@/schemas/data-sources';
import { Button } from '@/www/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/www/components/ui/card';
import {
  FileInput,
  FileInputDropArea,
  FileInputInput,
  FileInputRoot,
  FileInputTrigger,
} from '@/www/components/ui/file-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/www/components/ui/form';
import { Input } from '@/www/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/www/components/ui/select';
import { Textarea } from '@/www/components/ui/textarea';
import { requireAdminMiddleware } from '@/www/server/middleware/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { FolderArchive } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export const Route = createFileRoute('/_with-sidebar/admin/data-source')({
  component: RouteComponent,
});

const CreateDataSourceFormSchema = CreateDataSourceSchema.extend({
  type: z.enum(['FILE', 'REMOTE_FILE', 'WEBPAGE']),
  version: z.string().min(1, 'Version is required'),
  rightsBasis: z.enum(['LICENSED', 'PERMISSION', 'PUBLIC_DOMAIN']),
  attribution: z.string().min(1, 'Attribution is required'),
  traditionClassification: z.array(SourceChristianTraditionSchema).max(9),
  metadata: z
    .string()
    .refine(
      (value) => {
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Invalid JSON' },
    )
    .optional(),
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 25 * 1024 * 1024, {
      message: 'File must be 25MB or smaller',
    })
    .refine(
      (file) => ['application/pdf', 'text/html', 'text/markdown', 'text/plain'].includes(file.type),
      {
        message: 'File must be PDF, HTML, plain text, or Markdown',
      },
    )
    .optional(),
});

const CreateDataSourceInputSchema = CreateDataSourceFormSchema.omit({
  file: true,
  metadata: true,
}).extend({
  metadata: z.record(z.string(), z.json()).optional(),
});

const uploadResponseSchema = z.object({
  error: z.string().optional(),
  url: z.string().optional(),
  checksum: z.string().optional(),
});

const createDataSource = createServerFn({ method: 'POST' })
  .middleware([requireAdminMiddleware])
  .validator(CreateDataSourceInputSchema)
  .handler(async ({ data }) => {
    const [dataSource] = await db
      .insert(dataSources)
      .values({ ...data, approvalStatus: 'PENDING', approvedAt: null, approvedBy: null })
      .returning();
    return { dataSource };
  });

function RouteComponent() {
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof CreateDataSourceFormSchema>>({
    resolver: zodResolver(CreateDataSourceFormSchema),
    defaultValues: {
      metadata: JSON.stringify({ category: '', title: '', author: '' }, null, 2),
      version: 'unspecified',
      approvalStatus: 'PENDING',
      traditionClassification: [],
      syncSchedule: 'NEVER',
    },
  });

  const onSubmit = useMutation({
    mutationFn: async (values: z.input<typeof CreateDataSourceFormSchema>) => {
      let uploadedUrl = values.url;
      let checksum = values.checksum;
      if (values.type === 'FILE' && values.file) {
        const params = new URLSearchParams({
          kind: 'source',
          name: values.file.name,
        });
        const response = await fetch(`/api/upload?${params}`, {
          method: 'POST',
          headers: { 'Content-Type': values.file.type },
          body: values.file,
        });
        const result = uploadResponseSchema.parse(await response.json());
        if (!response.ok || !result.url || !result.checksum) {
          throw new Error(result.error ?? 'Failed to upload Grounding Source');
        }
        uploadedUrl = result.url;
        checksum = result.checksum;
      }

      const { metadata, file, ...rest } = values;
      const { dataSource } = await createDataSource({
        data: {
          ...rest,
          url: uploadedUrl,
          checksum,
          metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata,
        },
      });
      return { dataSource };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
      toast.success('Data source added');
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => form.reset(),
  });

  const [fileState, setFileState] = useState<FileList>();

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>Add Data Source</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => onSubmit.mutate(values))}
          className='space-y-4'
        >
          <CardContent className='flex flex-col gap-4'>
            <div className='flex gap-4'>
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem className='flex flex-col gap-2'>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value: 'FILE' | 'REMOTE_FILE' | 'WEBPAGE') => {
                        field.onChange(value);
                        if (value === 'FILE') {
                          form.setValue('url', 'r2://private-sources/pending');
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className='w-fit min-w-24'>
                          <SelectValue placeholder='Type' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(['FILE', 'REMOTE_FILE', 'WEBPAGE'] as const).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem className='flex-1'>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input type='text' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
              <FormField
                control={form.control}
                name='version'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edition or Version</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='rightsBasis'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rights Basis</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select verified rights basis' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='LICENSED'>Licensed</SelectItem>
                        <SelectItem value='PERMISSION'>Permission granted</SelectItem>
                        <SelectItem value='PUBLIC_DOMAIN'>Public domain</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='attribution'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Attribution</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='traditionClassification'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Christian Traditions (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value.join(', ')}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value
                            .split(',')
                            .map((value) => value.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('type') !== 'FILE' && (
              <FormField
                control={form.control}
                name='checksum'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected SHA-256 Checksum</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {form.watch('type') !== 'FILE' && (
              <FormField
                control={form.control}
                name='url'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HTTPS Origin</FormLabel>
                    <FormControl>
                      <Input type='url' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name='metadata'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metadata (JSON)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('type') === 'FILE' && (
              <FormField
                control={form.control}
                name='file'
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>File</FormLabel>
                    <FormControl>
                      <FileInput
                        value={fileState}
                        onChange={(files) => {
                          setFileState(files);
                          onChange(files?.[0]);
                        }}
                      >
                        <FileInputRoot className='h-32'>
                          <FileInputTrigger className='flex h-full items-center justify-center border-2 border-gray-300 border-dashed p-4 text-lg'>
                            <FolderArchive className='mr-4 size-8' />
                            Choose File
                          </FileInputTrigger>
                          <FileInputInput {...rest} />
                          <FileInputDropArea className='border-2 border-gray-300 border-dashed p-4'>
                            Drop your file here
                          </FileInputDropArea>
                        </FileInputRoot>
                      </FileInput>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name='syncSchedule'
              render={({ field }) => (
                <FormItem className='flex flex-col gap-2'>
                  <FormLabel>Sync Schedule</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value: string) => field.onChange(value || 'NEVER')}
                  >
                    <FormControl>
                      <SelectTrigger className='w-fit min-w-24'>
                        <SelectValue placeholder='Sync Schedule' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dataSources.syncSchedule.enumValues.map((schedule) => (
                        <SelectItem key={schedule} value={schedule}>
                          {schedule}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className='flex justify-end'>
            <Button
              type='submit'
              disabled={form.formState.isSubmitting || form.formState.isValidating}
            >
              Add Source
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
