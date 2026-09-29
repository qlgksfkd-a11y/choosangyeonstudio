// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "@/lib/clipboard";
import { EmptyState, ErrorState, LoadingState } from "./States";
import { SnippetCard, type SnippetView } from "./SnippetCard";
import { SnippetList, type ListSnippet } from "./SnippetList";
import { SnippetFormDialog } from "./SnippetFormDialog";
import { validateImageFile } from "./ImageUploadDialog";

const base: SnippetView = { id: 1, title: null, content: "본문만 있는 문장", isPinned: false };
const noop = () => {};
const handlers = { onCopy: async () => true, onEdit: noop, onDelete: noop, onTogglePin: noop };

afterEach(() => vi.restoreAllMocks());

describe("SnippetCard", () => {
  it("제목이 없으면 제목 영역 없이 본문만 렌더링한다", () => {
    const { container } = render(<SnippetCard snippet={base} {...handlers} />);
    expect(screen.getByText("본문만 있는 문장")).toBeInTheDocument();
    expect(container.querySelector(".display")).toBeNull();
    expect(screen.queryByText("제목 없음")).toBeNull();
  });

  it("공백뿐인 제목도 제목 영역을 만들지 않는다", () => {
    const { container } = render(<SnippetCard snippet={{ ...base, title: "   " }} {...handlers} />);
    expect(container.querySelector(".display")).toBeNull();
  });

  it("제목이 있으면 굵게 위에 표시한다", () => {
    const { container } = render(<SnippetCard snippet={{ ...base, title: "환불 안내" }} {...handlers} />);
    expect(container.querySelector(".display")).toHaveTextContent("환불 안내");
  });

  it("카드를 탭하면 복사 핸들러가 호출되고 '복사됨' 표시가 나타난다", async () => {
    const onCopy = vi.fn().mockResolvedValue(true);
    render(<SnippetCard snippet={base} {...handlers} onCopy={onCopy} />);
    await userEvent.click(screen.getByRole("button", { name: /복사$/ }));
    expect(onCopy).toHaveBeenCalledWith(base);
    expect(await screen.findByText("복사됨")).toBeInTheDocument();
  });

  it("순서 변경 모드에서는 탭해도 복사되지 않고 드래그 핸들이 보인다", async () => {
    const onCopy = vi.fn();
    const { rerender } = render(<SnippetCard snippet={base} {...handlers} onCopy={onCopy} />);
    expect(screen.queryByRole("button", { name: /순서 이동/ })).toBeNull();
    rerender(<SnippetCard snippet={base} {...handlers} onCopy={onCopy} reorderMode />);
    expect(screen.getByRole("button", { name: /순서 이동/ })).toBeInTheDocument();
    await userEvent.click(screen.getByText("본문만 있는 문장"));
    expect(onCopy).not.toHaveBeenCalled();
  });

  it("핀 고정 카드는 핀 해제 버튼과 강조 표시를 가진다", () => {
    render(<SnippetCard snippet={{ ...base, isPinned: true }} {...handlers} />);
    expect(screen.getByRole("button", { name: /핀 해제/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("snippet-card")).toHaveAttribute("data-pinned", "true");
  });

  it("긴 본문은 줄여 보여주고 전체 보기로 펼칠 수 있다", async () => {
    const long = "가".repeat(200);
    render(<SnippetCard snippet={{ ...base, content: long }} {...handlers} />);
    await userEvent.click(screen.getByRole("button", { name: /전체 보기/ }));
    expect(screen.getByRole("button", { name: /접기/ })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("SnippetList", () => {
  const list: ListSnippet[] = [
    { id: 1, title: "일반1", content: "a", isPinned: false, sortOrder: 0, categoryId: 1 },
    { id: 2, title: "일반2", content: "b", isPinned: false, sortOrder: 1, categoryId: 1 },
    { id: 3, title: "핀", content: "c", isPinned: true, sortOrder: 0, categoryId: 1 },
  ];

  it("핀 고정 문장이 항상 위에 표시된다", () => {
    render(<SnippetList snippets={list} reorderMode={false} onReorder={noop} {...handlers} />);
    const titles = screen.getAllByTestId("snippet-card").map((c) => c.textContent);
    expect(titles[0]).toContain("핀");
  });

  it("순서 변경 모드의 아래로 이동 버튼이 변경된 전체 순서를 전달한다", async () => {
    const onReorder = vi.fn();
    render(<SnippetList snippets={list} reorderMode onReorder={onReorder} {...handlers} />);
    await userEvent.click(screen.getByRole("button", { name: "일반1 아래로 이동" }));
    expect(onReorder).toHaveBeenCalledWith([3, 2, 1]);
  });

  it("핀 그룹 경계를 넘는 이동 버튼은 비활성화된다", () => {
    render(<SnippetList snippets={list} reorderMode onReorder={noop} {...handlers} />);
    expect(screen.getByRole("button", { name: "일반1 위로 이동" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "핀 아래로 이동" })).toBeDisabled();
  });
});

describe("SnippetFormDialog", () => {
  it("본문이 비어 있으면 저장되지 않고 오류를 보여준다", async () => {
    const onSubmit = vi.fn();
    render(<SnippetFormDialog open onSubmit={onSubmit} onOpenChange={noop} />);
    await userEvent.type(screen.getByLabelText(/제목/), "제목만");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("본문을 입력해 주세요.");
  });

  it("제목 없이 본문만으로 저장할 수 있다 (title = null)", async () => {
    const onSubmit = vi.fn();
    render(<SnippetFormDialog open onSubmit={onSubmit} onOpenChange={noop} />);
    await userEvent.type(screen.getByLabelText(/본문/), "  안녕하세요  ");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(onSubmit).toHaveBeenCalledWith({ title: null, content: "안녕하세요" });
  });
});

describe("copyText", () => {
  it("Clipboard API 로 복사한다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    expect(await copyText("hello")).toEqual({ ok: true });
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("권한이 거부되면 denied 를 반환한다", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new DOMException("no", "NotAllowedError")) },
    });
    Object.assign(document, { execCommand: vi.fn().mockReturnValue(false) });
    expect(await copyText("hello")).toEqual({ ok: false, reason: "denied" });
  });
});

describe("상태 화면", () => {
  it("로딩·빈 상태·오류 상태가 다음 행동을 안내한다", async () => {
    const retry = vi.fn();
    render(
      <>
        <LoadingState />
        <EmptyState title="아직 없어요" description="추가해 보세요" />
        <ErrorState message="불러오지 못했습니다." onRetry={retry} />
      </>,
    );
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(screen.getByTestId("empty-state")).toHaveTextContent("추가해 보세요");
    expect(screen.getByRole("alert")).toHaveTextContent("불러오지 못했습니다.");
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(retry).toHaveBeenCalled());
  });
});

describe("이미지 파일 검증", () => {
  it("지원하지 않는 형식과 용량 초과를 안내한다", () => {
    expect(validateImageFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateImageFile({ type: "application/pdf", size: 1000 })).toMatch(/PNG, JPG/);
    expect(validateImageFile({ type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/5MB/);
  });
});
