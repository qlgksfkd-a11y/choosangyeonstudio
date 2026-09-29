import { closestCenter, DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Plus } from "lucide-react";
import { moveId } from "@/lib/snippetOrder";
import { cn } from "@/lib/utils";

export interface NavCategory {
  id: number;
  name: string;
  color: string;
}

interface Props {
  categories: NavCategory[];
  activeId: number | null;
  orientation: "vertical" | "horizontal";
  onSelect: (id: number) => void;
  onEdit: (id: number) => void;
  onAdd: () => void;
  onReorder: (ids: number[]) => void;
}

function Item({ category, active, orientation, onSelect, onEdit }: {
  category: NavCategory;
  active: boolean;
  orientation: Props["orientation"];
  onSelect: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const vertical = orientation === "vertical";
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group flex shrink-0 items-stretch", isDragging && "z-20 opacity-90")}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "press flex min-h-11 min-w-0 items-center gap-2 border text-left text-[15px]",
          vertical ? "flex-1 px-3" : "rounded-full px-4 whitespace-nowrap",
          active ? "border-ink bg-ink font-bold text-cream" : "border-ink/20 bg-paper text-ink hover:border-ink/60",
          vertical && "rounded-[3px]",
          isDragging && "shadow-lift",
        )}
        {...attributes}
        role={undefined}
        aria-roledescription="정렬 가능한 카테고리"
        {...listeners}
      >
        <span className="size-3 shrink-0 rounded-full ring-2 ring-cream/80" style={{ background: category.color }} aria-hidden />
        <span className={cn(vertical && "truncate")}>{category.name}</span>
      </button>
      {active || vertical ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${category.name} 카테고리 편집`}
          className={cn(
            "press flex size-11 shrink-0 items-center justify-center rounded-[3px] text-ink-soft hover:bg-sand/70 hover:text-ink",
            vertical && !active && "lg:opacity-0 lg:focus-visible:opacity-100 lg:group-hover:opacity-100",
          )}
        >
          <Pencil className="size-4" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

/** 카테고리 목록. PC 는 좌측 사이드바(세로), 모바일은 가로 스크롤 탭. 길게 눌러(모바일)/끌어서(PC) 순서를 바꾼다. */
export function CategoryNav({ categories, activeId, orientation, onSelect, onEdit, onAdd, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // 가로 스와이프 스크롤과 구분하기 위해 잠깐 길게 눌러야 드래그가 시작된다.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  );
  const vertical = orientation === "vertical";

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const ids = moveId(categories.map((c) => c.id), Number(active.id), Number(over.id));
    if (ids) onReorder(ids);
  }

  return (
    <nav aria-label="카테고리">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={vertical ? verticalListSortingStrategy : horizontalListSortingStrategy}
        >
          <ul className={cn(vertical ? "flex flex-col gap-1.5" : "no-scrollbar flex gap-2 overflow-x-auto px-4 py-2")}>
            {categories.map((c) => (
              <Item
                key={c.id}
                category={c}
                active={c.id === activeId}
                orientation={orientation}
                onSelect={() => onSelect(c.id)}
                onEdit={() => onEdit(c.id)}
              />
            ))}
            {!vertical ? (
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={onAdd}
                  aria-label="카테고리 추가"
                  className="press flex min-h-11 items-center gap-1 rounded-full border border-dashed border-ink/40 px-4 text-sm"
                >
                  <Plus className="size-4" aria-hidden /> 추가
                </button>
              </li>
            ) : null}
          </ul>
        </SortableContext>
      </DndContext>
      {vertical ? (
        <button
          type="button"
          onClick={onAdd}
          className="press mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[3px] border border-dashed border-ink/40 text-sm font-medium hover:border-ink"
        >
          <Plus className="size-4" aria-hidden /> 카테고리 추가
        </button>
      ) : null}
    </nav>
  );
}
