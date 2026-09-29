import { Copy, Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { canCopyImage } from "@/lib/clipboard";

export interface ImageView {
  id: number;
  name: string | null;
  url: string;
  filename: string;
}

interface Props {
  image: ImageView;
  onCopy: (image: ImageView) => void;
  onDownload: (image: ImageView) => void;
  onDelete: (image: ImageView) => void;
}

export function ImageCard({ image, onCopy, onDownload, onDelete }: Props) {
  const [broken, setBroken] = useState(false);
  const label = image.name?.trim() || image.filename;
  const copySupported = canCopyImage();

  return (
    <article data-testid="image-card" className="flex flex-col overflow-hidden rounded-[4px] border border-rule bg-paper shadow-card">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-rule bg-sand/50">
        {broken ? (
          <p className="px-4 text-center text-sm text-ink-soft">이미지를 불러오지 못했습니다.</p>
        ) : (
          <img
            src={image.url}
            alt={label}
            loading="lazy"
            onError={() => setBroken(true)}
            className="size-full object-contain"
          />
        )}
      </div>
      <div className="px-4 pt-3">
        <p className="break-words font-medium leading-snug">{label}</p>
      </div>
      <div className="flex items-center gap-1 px-2 pb-2 pt-1">
        {copySupported ? (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onCopy(image)}>
            <Copy aria-hidden /> 복사
          </Button>
        ) : null}
        <Button variant={copySupported ? "outline" : "primary"} size="sm" className="flex-1" onClick={() => onDownload(image)}>
          <Download aria-hidden /> 다운로드
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`${label} 삭제`} onClick={() => onDelete(image)} className="text-danger hover:bg-danger/10">
          <Trash2 aria-hidden />
        </Button>
      </div>
    </article>
  );
}
