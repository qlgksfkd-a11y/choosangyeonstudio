import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { moveByStep, moveWithinGroup, splitByPin, sortSnippets } from "@/lib/snippetOrder";
import { cn } from "@/lib/utils";
import { SnippetCard, type SnippetCardProps, type SnippetView } from "./SnippetCard";

export interface ListSnippet extends SnippetView {
  sortOrder: number;
  categoryId: number;
}

type CardHandlers = Pick<SnippetCardProps, "onCopy" | "onEdit" | "onDelete" | "onTogglePin">;

interface Props extends CardHandlers {
  snippets: ListSnippet[];
  reorderMode: boolean;
  /** 순서 변경 결과(전체 ID 배열)를 받는다. 저장·롤백은 호출한 쪽에서 처리한다. */
  onReorder: (ids: number[]) => void;
  /** 검색 결과처럼 카테고리 표시가 필요할 때 */
  categoryLabelFor?: (categoryId: number) => { name: string; color: string } | undefined;
}

function SortableCard({
  snippet,
  reorderMode,
  ...rest
}: SnippetCardProps & { snippet: ListSnippet }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: snippet.id,
    disabled: !reorderMode,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-20 opacity-90 shadow-lift")}
    >
      <SnippetCard
        snippet={snippet}
        reorderMode={reorderMode}
        dragHandleProps={{ ref: setActivatorNodeRef, ...attributes, ...listeners }}
        {...rest}
      />
    </div>
  );
}

export function SnippetList({ snippets, reorderMode, onReorder, categoryLabelFor, ...handlers }: Props) {
  // 마우스는 6px 이상 움직여야, 터치는 핸들을 잠깐 누르고 있어야 드래그가 시작된다. (순서 변경 모드에서만 핸들이 있다)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const sorted = sortSnippets(snippets);
  const { pinned, regular } = splitByPin(snippets);

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const ids = moveWithinGroup(snippets, Number(active.id), Number(over.id));
    if (ids) onReorder(ids);
  }

  function step(snippet: SnippetView, direction: -1 | 1) {
    const ids = moveByStep(snippets, snippet.id, direction);
    if (ids) onReorder(ids);
  }

  const renderGroup = (group: ListSnippet[], label: string) =>
    group.length === 0 ? null : (
      <SortableContext items={group.map((s) => s.id)} strategy={rectSortingStrategy}>
        <ul aria-label={label} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {group.map((snippet) => {
            const index = sorted.indexOf(snippet);
            return (
              <li key={snippet.id} className="anim-rise min-w-0">
                <SortableCard
                  snippet={snippet}
                  reorderMode={reorderMode}
                  categoryLabel={categoryLabelFor?.(snippet.categoryId)}
                  canMoveUp={sorted[index - 1]?.isPinned === snippet.isPinned && index > 0}
                  canMoveDown={sorted[index + 1]?.isPinned === snippet.isPinned}
                  onMove={step}
                  {...handlers}
                />
              </li>
            );
          })}
        </ul>
      </SortableContext>
    );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="space-y-6">
        {renderGroup(pinned, "핀 고정된 문장")}
        {pinned.length > 0 && regular.length > 0 ? <hr className="border-rule" /> : null}
        {renderGroup(regular, "문장")}
      </div>
    </DndContext>
  );
}
