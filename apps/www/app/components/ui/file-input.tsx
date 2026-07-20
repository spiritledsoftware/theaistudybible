import { cn } from '@/www/lib/utils';
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Button } from './button';

type FileInputProps = Omit<React.ComponentProps<'div'>, 'children' | 'value' | 'onChange'> & {
  children: React.ReactNode;
  value?: FileList | undefined;
  onChange?: (files: FileList | undefined) => void;
};

const FileInput = React.forwardRef<HTMLDivElement, FileInputProps>(
  ({ className, children, value, onChange, ...props }, ref) => {
    const [internalFiles, setInternalFiles] = useState<FileList | undefined>(undefined);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounterRef = useRef(0);
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const files = value ?? internalFiles;
    const setFiles = (newFiles: FileList | undefined) => {
      if (onChange) {
        onChange(newFiles);
      } else {
        setInternalFiles(newFiles);
      }
    };

    const handleDragEnter = (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsDragging(false), 100);
      }
    };

    const handleDragOver = (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const handleDrop = (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      const newFiles = event.dataTransfer?.files;
      if (newFiles && newFiles.length > 0) {
        setFiles(newFiles);
      }
    };

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <FileInputContext.Provider value={{ files, setFiles, isDragging }}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: Drag events supplement the keyboard-accessible file input */}
        <div
          className={cn('relative flex flex-col gap-2', className)}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </FileInputContext.Provider>
    );
  },
);

FileInput.displayName = 'FileInput';

type FileInputContextValue = {
  files: FileList | undefined;
  setFiles: (files: FileList | undefined) => void;
  isDragging: boolean;
};

const FileInputContext = createContext<FileInputContextValue | null>(null);

const useFileInput = () => {
  const context = useContext(FileInputContext);
  if (!context) {
    throw new Error('useFileInput must be used within a FileInput component');
  }
  return context;
};

type FileInputRootProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

const FileInputRoot = React.forwardRef<HTMLDivElement, FileInputRootProps>(
  ({ className, ...props }, ref) => {
    return <div className={cn('relative flex flex-col gap-2', className)} ref={ref} {...props} />;
  },
);

FileInputRoot.displayName = 'FileInputRoot';

type FileInputTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  children?: React.ReactNode;
};

const FileInputTrigger = React.forwardRef<HTMLButtonElement, FileInputTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { files } = useFileInput();

    return (
      <Button
        variant='outline'
        className={cn(
          'w-full justify-start text-left font-normal',
          !files && 'text-muted-foreground',
          className,
        )}
        onClick={() => document.getElementById('file-input')?.click()}
        ref={ref}
        {...props}
      >
        {files ? `${files.length} file(s) selected` : children || 'Select file or drag and drop'}
      </Button>
    );
  },
);

FileInputTrigger.displayName = 'FileInputTrigger';

type FileInputInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

const FileInputInput = React.forwardRef<HTMLInputElement, FileInputInputProps>(
  ({ className, onChange, ...props }, ref) => {
    const { setFiles } = useFileInput();

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      setFiles(input.files ?? undefined);
      if (onChange) {
        onChange(event);
      }
    };

    return (
      <input
        id='file-input'
        type='file'
        className={cn('hidden', className)}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
    );
  },
);

FileInputInput.displayName = 'FileInputInput';

type FileInputDropAreaProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children?: React.ReactNode;
};

const FileInputDropArea = React.forwardRef<HTMLDivElement, FileInputDropAreaProps>(
  ({ className, children, ...props }, ref) => {
    const { isDragging } = useFileInput();

    if (!isDragging) return null;

    return (
      <div
        className={cn(
          'absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs transition-opacity duration-300',
          className,
        )}
        ref={ref}
        {...props}
      >
        {children || <p className='text-lg text-muted-foreground'>Drop files here</p>}
      </div>
    );
  },
);

FileInputDropArea.displayName = 'FileInputDropArea';

type FileInputDescriptionProps = React.HTMLAttributes<HTMLParagraphElement> & {
  className?: string;
};

const FileInputDescription = React.forwardRef<HTMLParagraphElement, FileInputDescriptionProps>(
  ({ className, ...props }, ref) => {
    return <p className={cn('text-muted-foreground text-sm', className)} ref={ref} {...props} />;
  },
);

FileInputDescription.displayName = 'FileInputDescription';

type FileInputErrorMessageProps = React.HTMLAttributes<HTMLParagraphElement> & {
  className?: string;
};

const FileInputErrorMessage = React.forwardRef<HTMLParagraphElement, FileInputErrorMessageProps>(
  ({ className, ...props }, ref) => {
    return (
      <p className={cn('font-medium text-destructive text-sm', className)} ref={ref} {...props} />
    );
  },
);

FileInputErrorMessage.displayName = 'FileInputErrorMessage';

export {
  FileInput,
  FileInputDescription,
  FileInputDropArea,
  FileInputErrorMessage,
  FileInputInput,
  FileInputRoot,
  FileInputTrigger,
};
