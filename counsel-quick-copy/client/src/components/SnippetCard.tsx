import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, GripVertical, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { useState, type HTMLAttributes, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SnippetView {
  id: number;
  title: string | null;
  content: string;
  isPinned: boolean;
}

export interface SnippetCardProps {
  snippet: SnippetView;
  /** 순서 변경 모드: 켜져 있으면 탭으로 복사되지 않고 드래그 핸들이 나타난다. */
  reorderMode?: boolean;
  categoryLabel?: { name: string; color: string };
  dragHandleProps?: HTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> };
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onCopy: (snippet: SnippetView) => Promise<boolean> | boolean;
  onEdit: (snippet: SnippetView) => void;
  onDelete: (snippet: SnippetView) => void;
  onTogglePin: (snippet: SnippetView) => void;
  onMove?: (snippet: SnippetView, step: -1 | 1) => void;
}

const LONG_TEXT = 140;

export function SnippetCard({
  snippet,
  reorderMode = false,
  categoryLabel,
  dragHandleProps,
  canMoveUp,
  canMoveDown,
  onCopy,
  onEdit,
  onDelete,
  onTogglePin,
  onMove,
}: SnippetCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const title = snippet.title?.trim();
  const isLong = snippet.content.length > LONG_TEXT || snippet.content.split("\n").length > 4;
  const label = title ?? snippet.content.slice(0, 20);

  async function handleCopy() {
    if (reorderMode) return;
    const ok = await onCopy(snippet);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }

  return (
    <article
      data-testid="snippet-card"
      data-pinned={snippet.isPinned}
      className={cn(
        "relative flex flex-col rounded-[4px] border bg-paper shadow-card transition-colors",
        snippet.isPinned ? "border-navy border-l-4" : "border-rule",
        copied && "border-success bg-success/5",
      )}
    >
      <div className="flex items-stretch">
        {reorderMode ? (
          <button
            type="button"
            aria-label={`${label} 순서 이동 (끌어서 이동, 키보드는 스페이스 후 화살표)`}
            className="press flex w-12 shrink-0 cursor-grab touch-none items-center justify-center border-r border-rule text-ink-soft hover:bg-sand/60 active:cursor-grabbing"
            {...dragHandleProps}
          >
            <GripVertical className="size-5" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleCopy}
          disabled={reorderMode}
          aria-label={reorderMode ? undefined : `${label} 복사`}
          className={cn(
            "press min-h-16 min-w-0 flex-1 px-4 py-3.5 text-left",
            reorderMode ? "cursor-default" : "hover:bg-sand/40 active:bg-sand/70",
          )}
        >
          {categoryLabel ? (
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-soft">
              <span className="size-2 rounded-full" style={{ background: categoryLabel.color }} aria-hidden />
              {categoryLabel.name}
            </span>
          ) : null}
          {title ? <span className="display mb-1 block break-words text-lg font-bold leading-snug">{title}</span> : null}
          <span
            className={cn(
              "block whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink",
              !expanded && isLong && "line-clamp-4",
            )}
          >
            {snippet.content}
          </span>
        </button>
        {copied ? (
          <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs font-bold text-white" aria-hidden>
            <Check className="size-3" /> 복사됨
          </span>
        ) : snippet.isPinned ? (
          <Pin className="pointer-events-none absolute right-3 top-3 size-4 fill-navy text-navy" aria-hidden />
        ) : null}
      </div>

      <div className="flex items-center gap-0.5 border-t border-rule/70 px-1.5 py-1">
        {isLong ? (
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="text-ink-soft">
            {expanded ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
            {expanded ? "접기" : "전체 보기"}
          </Button>
        ) : null}
        <div className="ml-auto flex items-center">
          {reorderMode ? (
            <>
              <Button variant="ghost" size="icon" aria-label={`${label} 위로 이동`} disabled={!canMoveUp} onClick={() => onMove?.(snippet, -1)}>
                <ArrowUp aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`${label} 아래로 이동`} disabled={!canMoveDown} onClick={() => onMove?.(snippet, 1)}>
                <ArrowDown aria-hidden />
              </Button>
            </>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            aria-label={snippet.isPinned ? `${label} 핀 해제` : `${label} 핀 고정`}
            aria-pressed={snippet.isPinned}
            onClick={() => onTogglePin(snippet)}
          >
            {snippet.isPinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
          </Button>
          <Button variant="ghost" size="icon" aria-label={`${label} 편집`} onClick={() => onEdit(snippet)}>
            <Pencil aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`${label} 삭제`} onClick={() => onDelete(snippet)} className="text-danger hover:bg-danger/10">
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>
    </article>
  );
}
