import * as React from 'react';

import { FileImage, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

interface AttachmentChipProps {
  readonly fileName: string;
  readonly onRemove: () => void;
}

function AttachmentChip({ fileName, onRemove }: AttachmentChipProps): React.ReactElement {
  // Truncate filename if too long
  const displayName = fileName.length > 20 ? `${fileName.slice(0, 17)}...` : fileName;

  return (
    <Badge variant="secondary" className="flex items-center gap-1.5 px-2 py-1">
      <FileImage className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="max-w-[120px] truncate text-xs" title={fileName}>
        {displayName}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 flex h-4 w-4 items-center justify-center rounded-full hover:bg-destructive hover:text-destructive-foreground"
        title="Remove attachment"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

export { AttachmentChip };
