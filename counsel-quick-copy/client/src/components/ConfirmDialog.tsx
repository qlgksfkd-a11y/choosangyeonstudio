import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel = "삭제", pending, onConfirm, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} className="sm:max-w-md">
        <div className="text-sm leading-relaxed text-ink-soft">{description}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            취소
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? "삭제 중…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
