import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;

/** 모바일에서는 하단 시트, 넓은 화면에서는 가운데 모달. 키보드가 올라와도 내부 스크롤로 입력할 수 있다. */
export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string; description?: string }
>(({ className, children, title, description, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="anim-fade fixed inset-0 z-50 bg-ink/50" />
    <DialogPrimitive.Content
      ref={ref}
      aria-describedby={undefined}
      className={cn(
        "anim-sheet fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto overscroll-contain border border-ink/20 bg-cream p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lift",
        "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[4px] sm:pb-5",
        className,
      )}
      {...props}
    >
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-ink pb-3">
        <div>
          <DialogPrimitive.Title className="display text-2xl font-bold leading-tight">{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-sm text-ink-soft">{description}</DialogPrimitive.Description>
          ) : null}
        </div>
        <DialogPrimitive.Close
          aria-label="닫기"
          className="press -mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-[3px] hover:bg-sand/70"
        >
          <X className="size-5" />
        </DialogPrimitive.Close>
      </div>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";
