import { describe, expect, it } from "vitest";
import { applyOrder, moveByStep, moveId, moveIdByStep, moveWithinGroup, sortSnippets, splitByPin } from "./snippetOrder";

const items = [
  { id: 1, isPinned: false, sortOrder: 0 },
  { id: 2, isPinned: false, sortOrder: 1 },
  { id: 3, isPinned: true, sortOrder: 5 },
  { id: 4, isPinned: true, sortOrder: 2 },
  { id: 5, isPinned: false, sortOrder: 2 },
];

describe("snippetOrder", () => {
  it("핀 고정 먼저, 같은 그룹은 sortOrder 순으로 정렬한다", () => {
    expect(sortSnippets(items).map((s) => s.id)).toEqual([4, 3, 1, 2, 5]);
    expect(splitByPin(items).pinned.map((s) => s.id)).toEqual([4, 3]);
  });

  it("같은 그룹 안에서만 이동할 수 있다", () => {
    expect(moveWithinGroup(items, 5, 1)).toEqual([4, 3, 5, 1, 2]);
    expect(moveWithinGroup(items, 3, 4)).toEqual([3, 4, 1, 2, 5]);
    expect(moveWithinGroup(items, 1, 3)).toBeNull(); // 일반 → 핀 그룹
    expect(moveWithinGroup(items, 4, 1)).toBeNull(); // 핀 → 일반 그룹
    expect(moveWithinGroup(items, 1, 1)).toBeNull();
  });

  it("한 칸씩 이동하되 그룹 경계와 목록 끝은 넘지 않는다", () => {
    expect(moveByStep(items, 1, 1)).toEqual([4, 3, 2, 1, 5]);
    expect(moveByStep(items, 1, -1)).toBeNull(); // 위는 핀 그룹
    expect(moveByStep(items, 5, 1)).toBeNull();
    expect(moveByStep(items, 3, -1)).toEqual([3, 4, 1, 2, 5]);
  });

  it("applyOrder 는 새 순서대로 sortOrder 를 다시 매긴다", () => {
    const next = applyOrder(items, [4, 3, 5, 1, 2]);
    expect(next.map((s) => [s.id, s.sortOrder])).toEqual([[4, 0], [3, 1], [5, 2], [1, 3], [2, 4]]);
    expect(sortSnippets(next).map((s) => s.id)).toEqual([4, 3, 5, 1, 2]);
  });

  it("카테고리용 단순 이동", () => {
    expect(moveId([1, 2, 3], 3, 1)).toEqual([3, 1, 2]);
    expect(moveId([1, 2, 3], 9, 1)).toBeNull();
    expect(moveIdByStep([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
    expect(moveIdByStep([1, 2, 3], 1, -1)).toBeNull();
  });
});
