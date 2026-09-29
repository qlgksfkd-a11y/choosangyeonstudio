import { ImagePlus } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@shared/types";

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "PNG, JPG, WEBP, GIF 이미지만 올릴 수 있습니다.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `이미지 용량이 너무 큽니다. ${MAX_IMAGE_BYTES / 1024 / 1024}MB 이하 파일을 선택해 주세요.`;
  }
  return null;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export interface UploadPayload {
  name: string | null;
  filename: string;
  mimeType: string;
  dataBase64: string;
}

interface Props {
  open: boolean;
  pending?: boolean;
  error?: string | null;
  onSubmit: (payload: UploadPayload) => void;
  onOpenChange: (open: boolean) => void;
}

export function ImageUploadDialog({ open, pending, error, onSubmit, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setName("");
      setFileError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | undefined) {
    if (!f) return;
    const problem = validateImageFile(f);
    setFileError(problem);
    setFile(problem ? null : f);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files[0]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return setFileError("업로드할 이미지를 선택해 주세요.");
    try {
      onSubmit({ name: name.trim() || null, filename: file.name, mimeType: file.type, dataBase64: await readAsBase64(file) });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "파일을 읽지 못했습니다.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? undefined : onOpenChange(o))}>
      <DialogContent title="이미지 추가" description="PNG, JPG, WEBP, GIF · 최대 5MB">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-[4px] border-2 border-dashed p-4 text-center",
              dragging ? "border-navy bg-navy/5" : "border-ink/30 bg-paper",
            )}
          >
            {preview ? (
              <img src={preview} alt="선택한 이미지 미리보기" className="max-h-52 rounded-[3px] object-contain" />
            ) : (
              <ImagePlus className="size-8 text-ink-soft" aria-hidden />
            )}
            <p className="text-sm text-ink-soft">{file ? file.name : "이미지를 끌어다 놓거나 아래 버튼으로 선택하세요."}</p>
            <input
              ref={input}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              className="sr-only"
              aria-label="이미지 파일 선택"
              onChange={(e) => pick(e.target.files?.[0])}
              tabIndex={-1}
            />
            <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={pending}>
              {file ? "다른 파일 선택" : "파일 선택"}
            </Button>
          </div>

          <div>
            <Label htmlFor="image-name">
              이름 또는 설명 <span className="font-normal text-ink-soft">(선택)</span>
            </Label>
            <Input id="image-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="예: 매장 약도" autoComplete="off" />
          </div>

          {fileError || error ? (
            <p role="alert" className="rounded-[3px] bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {fileError ?? error}
            </p>
          ) : null}

          {pending ? (
            <div role="progressbar" aria-label="이미지 업로드 중" aria-busy="true" className="space-y-1.5">
              <p className="text-sm font-medium">업로드 중… 잠시만 기다려 주세요.</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-sand">
                <div className="anim-bar h-full w-1/3 rounded-full bg-navy" />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              취소
            </Button>
            <Button type="submit" disabled={pending || !file}>
              {pending ? "업로드 중…" : error ? "다시 시도" : "업로드"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
