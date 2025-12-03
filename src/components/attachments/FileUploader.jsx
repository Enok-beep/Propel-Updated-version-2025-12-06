import React, { useState, useRef } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Upload, X, File, Image, FileText, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export function FileUploader({ onUpload, multiple = false, maxSize = 10 * 1024 * 1024 }) {
  const { tokens } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    const uploaded = [];

    for (const file of files) {
      if (file.size > maxSize) {
        alert(`${file.name} is too large. Max size is ${maxSize / (1024 * 1024)}MB`);
        continue;
      }

      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({
          file_url: result.file_url,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type
        });
      } catch (e) {
        console.error('Upload failed:', e);
        alert(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    if (uploaded.length > 0) {
      onUpload(multiple ? uploaded : uploaded[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        multiple={multiple}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{ borderColor: tokens.border }}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Attach Files
          </>
        )}
      </Button>
    </div>
  );
}

export function AttachmentList({ attachments = [], onRemove, compact = false }) {
  const { tokens } = useTheme();

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return Image;
    if (type?.includes('pdf') || type?.includes('document')) return FileText;
    return File;
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!attachments.length) return null;

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      {attachments.map((att, idx) => {
        const Icon = getFileIcon(att.file_type);
        
        return (
          <div
            key={att.id || idx}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border",
              compact && "p-1.5"
            )}
            style={{ borderColor: tokens.border, backgroundColor: `${tokens.accent}05` }}
          >
            <Icon className={cn("flex-shrink-0", compact ? "w-3 h-3" : "w-4 h-4")} style={{ color: tokens.accent }} />
            <div className="flex-1 min-w-0">
              <a
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("hover:underline truncate block", compact ? "text-xs" : "text-sm")}
                style={{ color: tokens.color }}
              >
                {att.file_name}
              </a>
              {!compact && att.file_size && (
                <div className="text-xs" style={{ color: tokens.subtle }}>
                  {formatSize(att.file_size)}
                </div>
              )}
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(att)}
                className="p-1 hover:bg-red-50 rounded"
              >
                <X className="w-3 h-3 text-red-500" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}