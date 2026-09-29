import { ArrowLeft, ArrowRight, Check, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "@shared/types";

interface Props {
  open: boolean;
  initial?: { name: string; color: string } | null;
  pending?: boolean;
  error?: string | null;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onSubmit: (values: { name: string; color: string }) => void;
  onDelete?: () => void;
  onMove?: (step: -1 | 1) => void;
  onOpenChange: (open: boolean) => void;
}

export function CategoryDialog({ open, initial, pending, error, canMoveUp, canMoveDown, onSubmit, onDelete, onMove, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setColor(initial?.color ?? CATEGORY_COLORS[0]);
      setTouched(false);
    }
  }, [open, initial]);

  const nameMissing = touched && !name.trim();

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), color });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={initial ? "카테고리 편집" : "새 카테고리"}>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div>
            <Label htmlFor="category-name">
              이름 <span className="text-danger">*</span>
            </Label>
            <Input
              id="category-name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 환불·교환"
              autoComplete="off"
              aria-invalid={nameMissing}
            />
            {nameMissing ? (
              <p role="alert" className="mt-1 text-sm font-medium text-danger">
                이름을 입력해 주세요.
              </p>
            ) : null}
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">색상</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`색상 ${c}`}
                  aria-pressed={color === c}
                  className={cn(
                    "press flex size-11 items-center justify-center rounded-full border-2",
                    color === c ? "border-ink" : "border-transparent",
                  )}
                  style={{ background: c }}
                >
                  {color === c ? <Check className="size-5 text-white" aria-hidden /> : null}
                </button>
              ))}
            </div>
          </fieldset>

          {initial && onMove ? (
            <div>
              <p className="mb-1.5 text-sm font-medium">순서</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!canMoveUp} onClick={() => onMove(-1)}>
                  <ArrowLeft aria-hidden /> 앞으로
                </Button>
                <Button variant="outline" size="sm" disabled={!canMoveDown} onClick={() => onMove(1)}>
                  뒤로 <ArrowRight aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-[3px] bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {initial && onDelete ? (
              <Button variant="ghost" className="text-danger hover:bg-danger/10 sm:mr-auto" onClick={onDelete} disabled={pending}>
                <Trash2 aria-hidden /> 카테고리 삭제
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "저장 중…" : "저장"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
