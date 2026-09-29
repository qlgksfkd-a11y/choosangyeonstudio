export interface OrderItem {
  id: number;
  isPinned: boolean;
  sortOrder: number;
}

/** 표시 순서: 핀 고정 먼저, 같은 그룹 안에서는 sortOrder(동률이면 id) 순. */
export function sortSnippets<T extends OrderItem>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return a.sortOrder - b.sortOrder || a.id - b.id;
  });
}

export function splitByPin<T extends OrderItem>(items: readonly T[]) {
  const sorted = sortSnippets(items);
  return { pinned: sorted.filter((s) => s.isPinned), regular: sorted.filter((s) => !s.isPinned) };
}

function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * activeId 를 overId 자리로 옮긴 전체 ID 순서를 반환한다.
 * 핀 그룹과 일반 그룹은 서로 넘나들 수 없으므로 그룹이 다르면 null.
 */
export function moveWithinGroup(items: readonly OrderItem[], activeId: number, overId: number): number[] | null {
  if (activeId === overId) return null;
  const sorted = sortSnippets(items);
  const active = sorted.find((s) => s.id === activeId);
  const over = sorted.find((s) => s.id === overId);
  if (!active || !over || active.isPinned !== over.isPinned) return null;
  const from = sorted.indexOf(active);
  const to = sorted.indexOf(over);
  return arrayMove(sorted, from, to).map((s) => s.id);
}

/** 같은 그룹 안에서 한 칸 위(-1)/아래(+1)로 옮긴 전체 ID 순서. 끝이면 null. (드래그를 못 쓰는 사용자용) */
export function moveByStep(items: readonly OrderItem[], id: number, step: -1 | 1): number[] | null {
  const sorted = sortSnippets(items);
  const index = sorted.findIndex((s) => s.id === id);
  const target = sorted[index + step];
  if (index === -1 || !target || target.isPinned !== sorted[index].isPinned) return null;
  return arrayMove(sorted, index, index + step).map((s) => s.id);
}

/** 서버가 저장하는 것과 같은 규칙으로 ID 순서를 sortOrder 로 반영한 목록(낙관적 업데이트용). */
export function applyOrder<T extends OrderItem>(items: readonly T[], ids: readonly number[]): T[] {
  const byId = new Map(items.map((s) => [s.id, s]));
  return ids.flatMap((id, index) => {
    const item = byId.get(id);
    return item ? [{ ...item, sortOrder: index }] : [];
  });
}

/** 카테고리처럼 단순한 목록용. */
export function moveId(ids: readonly number[], activeId: number, overId: number): number[] | null {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return null;
  return arrayMove([...ids], from, to);
}

export function moveIdByStep(ids: readonly number[], id: number, step: -1 | 1): number[] | null {
  const from = ids.indexOf(id);
  const to = from + step;
  if (from === -1 || to < 0 || to >= ids.length) return null;
  return arrayMove([...ids], from, to);
}
