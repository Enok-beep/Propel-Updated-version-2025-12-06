import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({ 
  open, 
  onOpenChange, 
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'danger' // 'danger' or 'warning'
}) {
  const { tokens } = useTheme();

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        style={{ 
          backgroundColor: tokens.card, 
          borderColor: tokens.border 
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: variant === 'danger' ? '#FEE2E2' : '#FEF3C7' 
              }}
            >
              <AlertTriangle 
                className="w-5 h-5" 
                style={{ color: variant === 'danger' ? '#DC2626' : '#F59E0B' }}
              />
            </div>
            <DialogTitle style={{ color: tokens.color }}>
              {title}
            </DialogTitle>
          </div>
          <DialogDescription style={{ color: tokens.subtle }}>
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            style={{ borderColor: tokens.border }}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            style={{ 
              backgroundColor: variant === 'danger' ? '#DC2626' : '#F59E0B',
              color: 'white'
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDialog;