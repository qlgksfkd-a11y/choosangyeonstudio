import { AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function LoadingState({ label = "불러오는 중…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="loading-state">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-[4px] border border-rule bg-sand/60" aria-hidden />
      ))}
    </div>
  );
}

export function FullScreenLoading() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center text-ink-soft">
      <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> 불러오는 중…
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-[4px] border border-dashed border-ink/30 px-6 py-12 text-center" data-testid="empty-state">
      <p className="display text-2xl font-bold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{description}</p>
      {action ? <div className="mt-5 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-[4px] border border-danger/40 bg-danger/5 px-6 py-10 text-center" data-testid="error-state">
      <AlertTriangle className="mx-auto mb-2 size-6 text-danger" aria-hidden />
      <p className="font-medium text-danger">{message}</p>
      <p className="mt-1 text-sm text-ink-soft">잠시 후 다시 시도해 주세요.</p>
      {onRetry ? (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          다시 시도
        </Button>
      ) : null}
    </div>
  );
}
