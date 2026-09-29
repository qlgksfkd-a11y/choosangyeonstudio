import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";

export interface SnippetFormValues {
  title: string | null;
  content: string;
}

interface Props {
  open: boolean;
  initial?: { title: string | null; content: string } | null;
  pending?: boolean;
  error?: string | null;
  onSubmit: (values: SnippetFormValues) => void;
  onOpenChange: (open: boolean) => void;
}

export function SnippetFormDialog({ open, initial, pending, error, onSubmit, onOpenChange }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setContent(initial?.content ?? "");
      setTouched(false);
    }
  }, [open, initial]);

  const contentMissing = touched && content.trim().length === 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (content.trim().length === 0) return;
    onSubmit({ title: title.trim() || null, content: content.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={initial ? "문장 편집" : "새 문장"}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="snippet-title">
              제목 <span className="font-normal text-ink-soft">(선택)</span>
            </Label>
            <Input
              id="snippet-title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 환불 안내"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="snippet-content">
              본문 <span className="text-danger">*</span>
            </Label>
            <Textarea
              id="snippet-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="복사해서 붙여넣을 문장을 입력하세요."
              aria-required="true"
              aria-invalid={contentMissing}
              aria-describedby={contentMissing ? "snippet-content-error" : undefined}
              className="min-h-40"
            />
            {contentMissing ? (
              <p id="snippet-content-error" role="alert" className="mt-1 text-sm font-medium text-danger">
                본문을 입력해 주세요.
              </p>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="rounded-[3px] bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
