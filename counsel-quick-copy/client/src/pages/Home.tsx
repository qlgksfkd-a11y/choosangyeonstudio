import { ImagePlus, ListOrdered, LogOut, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CategoryDialog } from "@/components/CategoryDialog";
import { CategoryNav } from "@/components/CategoryNav";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ImageCard, type ImageView } from "@/components/ImageCard";
import { ImageUploadDialog } from "@/components/ImageUploadDialog";
import type { SnippetView } from "@/components/SnippetCard";
import { SnippetFormDialog } from "@/components/SnippetFormDialog";
import { SnippetList, type ListSnippet } from "@/components/SnippetList";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { copyErrorMessage, copyImage, copyText, downloadImage } from "@/lib/clipboard";
import { applyOrder, moveIdByStep } from "@/lib/snippetOrder";
import { errorMessage, trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useDebounced } from "@/hooks/useDebounced";

type Tab = "snippets" | "images";
type Deletion =
  | { kind: "snippet"; id: number; label: string }
  | { kind: "image"; id: number; label: string }
  | { kind: "category"; id: number; label: string };

const ACTIVE_KEY = "cqc:activeCategory";

function readStoredCategory(): number | null {
  try {
    return Number(localStorage.getItem(ACTIVE_KEY)) || null;
  } catch {
    return null;
  }
}

export default function Home({ user }: { user: { name: string } }) {
  const utils = trpc.useUtils();
  const toast = useToast();

  const [storedId, setStoredId] = useState<number | null>(readStoredCategory);
  const [tab, setTab] = useState<Tab>("snippets");
  const [query, setQuery] = useState("");
  const [reorderMode, setReorderMode] = useState(false);
  const [snippetDialog, setSnippetDialog] = useState<{ open: boolean; editing: ListSnippet | null }>({ open: false, editing: null });
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; editingId: number | null }>({ open: false, editingId: null });
  const [imageDialog, setImageDialog] = useState(false);
  const [deletion, setDeletion] = useState<Deletion | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const debouncedQuery = useDebounced(query.trim(), 250);
  const searching = tab === "snippets" && debouncedQuery.length > 0;

  // ── 데이터 ──────────────────────────────────────────
  const categoriesQ = trpc.categories.list.useQuery();
  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const active = categories.find((c) => c.id === storedId) ?? categories[0] ?? null;
  const categoryId = active?.id ?? 0;

  useEffect(() => {
    if (!active) return;
    try {
      localStorage.setItem(ACTIVE_KEY, String(active.id));
    } catch {
      /* 저장소를 못 쓰는 환경에서는 무시 */
    }
  }, [active]);

  const snippetsQ = trpc.snippets.listByCategory.useQuery({ categoryId }, { enabled: !!active && !searching });
  const searchQ = trpc.snippets.search.useQuery({ query: debouncedQuery }, { enabled: searching });
  const imagesQ = trpc.images.listByCategory.useQuery({ categoryId }, { enabled: !!active && tab === "images" });
  const deletionCount = trpc.categories.contentCount.useQuery(
    { id: deletion?.kind === "category" ? deletion.id : 0 },
    { enabled: deletion?.kind === "category" },
  );

  // ── 변경(mutation) ──────────────────────────────────
  const invalidateSnippets = () => Promise.all([utils.snippets.listByCategory.invalidate(), utils.snippets.search.invalidate()]);

  const createSnippet = trpc.snippets.create.useMutation({
    onSuccess: async () => {
      await invalidateSnippets();
      setSnippetDialog({ open: false, editing: null });
      toast.success("문장을 저장했습니다.");
    },
    onError: (e) => setFormError(errorMessage(e, "문장을 저장하지 못했습니다.")),
  });
  const updateSnippet = trpc.snippets.update.useMutation({
    onSuccess: async () => {
      await invalidateSnippets();
      setSnippetDialog({ open: false, editing: null });
      toast.success("문장을 수정했습니다.");
    },
    onError: (e) => setFormError(errorMessage(e, "문장을 저장하지 못했습니다.")),
  });
  const deleteSnippet = trpc.snippets.delete.useMutation({
    onSuccess: async () => {
      await invalidateSnippets();
      setDeletion(null);
      toast.success("문장을 삭제했습니다.");
    },
    onError: (e) => toast.error(errorMessage(e, "문장을 삭제하지 못했습니다.")),
  });
  const togglePin = trpc.snippets.togglePin.useMutation({
    onSuccess: (s) => {
      invalidateSnippets();
      toast.success(s.isPinned ? "핀 고정했습니다." : "핀을 해제했습니다.");
    },
    onError: (e) => toast.error(errorMessage(e, "핀 고정을 변경하지 못했습니다.")),
  });

  // 순서 변경은 즉시 화면에 반영하고 서버에 저장한다. 실패하면 이전 순서로 되돌린다.
  const reorderSnippets = trpc.snippets.reorder.useMutation({
    onMutate: async ({ categoryId: id, ids }) => {
      await utils.snippets.listByCategory.cancel({ categoryId: id });
      const previous = utils.snippets.listByCategory.getData({ categoryId: id });
      if (previous) utils.snippets.listByCategory.setData({ categoryId: id }, applyOrder(previous, ids));
      return { previous, id };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) utils.snippets.listByCategory.setData({ categoryId: ctx.id }, ctx.previous);
      toast.error(`${errorMessage(e, "순서를 저장하지 못했습니다.")} 이전 순서로 되돌렸습니다.`);
    },
    onSettled: (_d, _e, v) => utils.snippets.listByCategory.invalidate({ categoryId: v.categoryId }),
  });

  const createCategory = trpc.categories.create.useMutation({
    onSuccess: async (c) => {
      await utils.categories.list.invalidate();
      setStoredId(c.id);
      setCategoryDialog({ open: false, editingId: null });
      toast.success("카테고리를 만들었습니다.");
    },
    onError: (e) => setFormError(errorMessage(e, "카테고리를 저장하지 못했습니다.")),
  });
  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: async () => {
      await utils.categories.list.invalidate();
      setCategoryDialog({ open: false, editingId: null });
      toast.success("카테고리를 수정했습니다.");
    },
    onError: (e) => setFormError(errorMessage(e, "카테고리를 저장하지 못했습니다.")),
  });
  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: async (_d, v) => {
      if (storedId === v.id) setStoredId(null);
      await utils.categories.list.invalidate();
      setDeletion(null);
      toast.success("카테고리를 삭제했습니다.");
    },
    onError: (e) => toast.error(errorMessage(e, "카테고리를 삭제하지 못했습니다.")),
  });
  const reorderCategories = trpc.categories.reorder.useMutation({
    onMutate: async ({ ids }) => {
      await utils.categories.list.cancel();
      const previous = utils.categories.list.getData();
      if (previous) {
        const byId = new Map(previous.map((c) => [c.id, c]));
        utils.categories.list.setData(undefined, ids.flatMap((id, i) => (byId.has(id) ? [{ ...byId.get(id)!, sortOrder: i }] : [])));
      }
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) utils.categories.list.setData(undefined, ctx.previous);
      toast.error(`${errorMessage(e, "카테고리 순서를 저장하지 못했습니다.")} 이전 순서로 되돌렸습니다.`);
    },
    onSettled: () => utils.categories.list.invalidate(),
  });

  const uploadImage = trpc.images.create.useMutation({
    onSuccess: async () => {
      await utils.images.listByCategory.invalidate();
      setImageDialog(false);
      toast.success("이미지를 올렸습니다.");
    },
    onError: (e) => setFormError(errorMessage(e, "이미지를 올리지 못했습니다. 다시 시도해 주세요.")),
  });
  const deleteImage = trpc.images.delete.useMutation({
    onSuccess: async () => {
      await utils.images.listByCategory.invalidate();
      setDeletion(null);
      toast.success("이미지를 삭제했습니다.");
    },
    onError: (e) => toast.error(errorMessage(e, "이미지를 삭제하지 못했습니다.")),
  });
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => utils.auth.me.reset() });

  // ── 동작 ────────────────────────────────────────────
  async function copySnippet(snippet: SnippetView): Promise<boolean> {
    const result = await copyText(snippet.content);
    if (result.ok) toast.success("문장이 복사되었습니다.");
    else toast.error(copyErrorMessage(result.reason));
    return result.ok;
  }

  async function copyImageToClipboard(image: ImageView) {
    const result = await copyImage(image.url);
    if (result.ok) return toast.success("이미지가 복사되었습니다.");
    if (result.reason === "unsupported") return toast.error("이 브라우저는 이미지 복사를 지원하지 않습니다. 다운로드 버튼을 이용해 주세요.");
    if (result.reason === "denied") return toast.error(copyErrorMessage("denied"));
    toast.error("이미지를 복사하지 못했습니다. 다운로드한 뒤 직접 첨부해 주세요.");
  }

  async function saveImage(image: ImageView) {
    if (await downloadImage(image.url, image.filename)) toast.success("이미지를 내려받았습니다.");
    else toast.error("이미지를 내려받지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  function confirmDelete() {
    if (!deletion) return;
    if (deletion.kind === "snippet") deleteSnippet.mutate({ id: deletion.id });
    else if (deletion.kind === "image") deleteImage.mutate({ id: deletion.id });
    else deleteCategory.mutate({ id: deletion.id });
  }

  function openAdd() {
    setFormError(null);
    if (tab === "snippets") setSnippetDialog({ open: true, editing: null });
    else setImageDialog(true);
  }

  const categoryById = (id: number) => categories.find((c) => c.id === id);
  const editingCategory = categoryDialog.editingId ? categoryById(categoryDialog.editingId) : null;
  const editingIndex = categories.findIndex((c) => c.id === categoryDialog.editingId);
  const snippets: ListSnippet[] = (searching ? searchQ.data : snippetsQ.data) ?? [];
  const snippetsQuery = searching ? searchQ : snippetsQ;
  const images = (imagesQ.data ?? []).filter((img) => {
    const q = query.trim().toLowerCase();
    return !q || `${img.name ?? ""} ${img.filename}`.toLowerCase().includes(q);
  });

  const navProps = {
    categories,
    activeId: active?.id ?? null,
    onSelect: (id: number) => {
      setStoredId(id);
      setReorderMode(false);
    },
    onEdit: (id: number) => {
      setFormError(null);
      setCategoryDialog({ open: true, editingId: id });
    },
    onAdd: () => {
      setFormError(null);
      setCategoryDialog({ open: true, editingId: null });
    },
    onReorder: (ids: number[]) => reorderCategories.mutate({ ids }),
  };

  return (
    <div className="min-h-dvh pb-28 lg:pb-12">
      <header className="border-b-2 border-ink bg-cream pt-[env(safe-area-inset-top)] lg:sticky lg:top-0 lg:z-30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <h1 className="display text-2xl font-extrabold leading-none sm:text-3xl">상담 빠른복사</h1>
          <div className="order-last relative w-full sm:order-none sm:ml-auto sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "snippets" ? "모든 카테고리의 문장 검색" : "이미지 이름 검색"}
              aria-label="검색"
              className="min-h-11 w-full rounded-[3px] border border-ink/25 bg-paper pl-9 pr-10 text-base placeholder:text-ink-soft/70 focus-visible:border-navy"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="검색어 지우기"
                className="press absolute right-0 top-0 flex size-11 items-center justify-center text-ink-soft"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <span className="hidden max-w-32 truncate text-sm text-ink-soft md:inline">{user.name}</span>
            <Button variant="ghost" size="icon" aria-label="로그아웃" onClick={() => logout.mutate()}>
              <LogOut aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      {/* 모바일: 가로 스크롤 카테고리 탭 */}
      {categories.length > 0 ? (
        <div className="sticky top-0 z-20 border-b border-rule bg-cream/95 backdrop-blur lg:hidden">
          <CategoryNav {...navProps} orientation="horizontal" />
        </div>
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:pt-8">
        {/* PC: 좌측 사이드바 */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <h2 className="mb-3 border-b border-ink pb-2 text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">카테고리</h2>
            <CategoryNav {...navProps} orientation="vertical" />
          </div>
        </aside>

        <main className="min-w-0">
          {categoriesQ.isLoading ? (
            <LoadingState />
          ) : categoriesQ.isError ? (
            <ErrorState message={errorMessage(categoriesQ.error, "카테고리를 불러오지 못했습니다.")} onRetry={() => categoriesQ.refetch()} />
          ) : !active ? (
            <EmptyState
              title="첫 카테고리를 만들어 보세요"
              description="카테고리는 문장과 이미지를 묶는 폴더입니다. 예: 인사말, 환불 안내, 운영 시간"
              action={<Button onClick={navProps.onAdd}><Plus aria-hidden /> 카테고리 만들기</Button>}
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
                    {searching ? "검색 결과" : "카테고리"}
                  </p>
                  <h2 className="display flex items-center gap-2.5 text-3xl font-extrabold leading-tight sm:text-4xl">
                    <span className="h-7 w-1.5 shrink-0 rounded-full" style={{ background: searching ? "var(--color-ink)" : active.color }} aria-hidden />
                    <span className="break-words">{searching ? `“${debouncedQuery}”` : active.name}</span>
                  </h2>
                </div>
                <div className="hidden gap-2 lg:flex">
                  <Button onClick={() => { setFormError(null); setSnippetDialog({ open: true, editing: null }); setTab("snippets"); }}>
                    <Plus aria-hidden /> 새 문장
                  </Button>
                  <Button variant="outline" onClick={() => { setFormError(null); setImageDialog(true); }}>
                    <ImagePlus aria-hidden /> 이미지 추가
                  </Button>
                </div>
              </div>

              <div className="mb-5 flex flex-wrap items-center gap-2 border-y border-ink/20 py-2">
                <div role="tablist" aria-label="콘텐츠 종류" className="flex gap-1">
                  {(["snippets", "images"] as const).map((t) => (
                    <button
                      key={t}
                      role="tab"
                      type="button"
                      aria-selected={tab === t}
                      onClick={() => {
                        setTab(t);
                        setReorderMode(false);
                      }}
                      className={cn(
                        "press min-h-11 rounded-[3px] px-4 text-[15px] font-medium",
                        tab === t ? "bg-ink text-cream" : "text-ink hover:bg-sand/70",
                      )}
                    >
                      {t === "snippets" ? "문장" : "이미지"}
                    </button>
                  ))}
                </div>
                {tab === "snippets" && !searching && snippets.length > 1 ? (
                  <Button
                    variant={reorderMode ? "primary" : "outline"}
                    size="default"
                    className="ml-auto"
                    aria-pressed={reorderMode}
                    onClick={() => setReorderMode((v) => !v)}
                  >
                    <ListOrdered aria-hidden /> {reorderMode ? "순서 변경 완료" : "순서 변경"}
                  </Button>
                ) : null}
              </div>

              {reorderMode ? (
                <p role="status" className="mb-4 rounded-[3px] border border-navy/40 bg-navy/5 px-3 py-2 text-sm text-navy">
                  순서 변경 모드입니다. 카드를 탭해도 복사되지 않아요. 핸들(⠿)을 끌거나 위·아래 버튼으로 옮기세요. 핀 고정 문장은 위쪽 그룹에서만 이동합니다.
                </p>
              ) : null}

              {tab === "snippets" ? (
                snippetsQuery.isLoading ? (
                  <LoadingState />
                ) : snippetsQuery.isError ? (
                  <ErrorState message={errorMessage(snippetsQuery.error, "문장을 불러오지 못했습니다.")} onRetry={() => snippetsQuery.refetch()} />
                ) : snippets.length === 0 ? (
                  searching ? (
                    <EmptyState title="검색 결과가 없습니다" description={`“${debouncedQuery}”와 일치하는 문장이 없어요. 다른 단어로 검색해 보세요.`} />
                  ) : (
                    <EmptyState
                      title="아직 저장한 문장이 없습니다"
                      description="자주 쓰는 답변을 저장해 두면 탭 한 번으로 복사할 수 있어요."
                      action={<Button onClick={openAdd}><Plus aria-hidden /> 첫 문장 추가</Button>}
                    />
                  )
                ) : (
                  <SnippetList
                    snippets={snippets}
                    reorderMode={reorderMode && !searching}
                    categoryLabelFor={searching ? categoryById : undefined}
                    onCopy={copySnippet}
                    onEdit={(s) => {
                      setFormError(null);
                      setSnippetDialog({ open: true, editing: s as ListSnippet });
                    }}
                    onDelete={(s) => setDeletion({ kind: "snippet", id: s.id, label: s.title?.trim() || s.content.slice(0, 24) })}
                    onTogglePin={(s) => togglePin.mutate({ id: s.id })}
                    onReorder={(ids) => reorderSnippets.mutate({ categoryId, ids })}
                  />
                )
              ) : imagesQ.isLoading ? (
                <LoadingState />
              ) : imagesQ.isError ? (
                <ErrorState message={errorMessage(imagesQ.error, "이미지를 불러오지 못했습니다.")} onRetry={() => imagesQ.refetch()} />
              ) : images.length === 0 ? (
                query.trim() ? (
                  <EmptyState title="검색 결과가 없습니다" description="이름이 일치하는 이미지가 없어요." />
                ) : (
                  <EmptyState
                    title="아직 저장한 이미지가 없습니다"
                    description="약도, 안내문, 가격표 같은 이미지를 올려 두면 복사하거나 내려받아 바로 보낼 수 있어요."
                    action={<Button onClick={openAdd}><ImagePlus aria-hidden /> 이미지 추가</Button>}
                  />
                )
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="이미지">
                  {images.map((img) => (
                    <li key={img.id} className="anim-rise min-w-0">
                      <ImageCard
                        image={img}
                        onCopy={copyImageToClipboard}
                        onDownload={saveImage}
                        onDelete={(i) => setDeletion({ kind: "image", id: i.id, label: i.name?.trim() || i.filename })}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </main>
      </div>

      {/* 모바일 플로팅 추가 버튼 */}
      {active ? (
        <button
          type="button"
          onClick={openAdd}
          aria-label={tab === "snippets" ? "새 문장 추가" : "이미지 추가"}
          className="press fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-30 flex size-14 items-center justify-center rounded-full bg-navy text-cream shadow-lift lg:hidden"
        >
          {tab === "snippets" ? <Plus className="size-6" aria-hidden /> : <ImagePlus className="size-6" aria-hidden />}
        </button>
      ) : null}

      <SnippetFormDialog
        open={snippetDialog.open}
        initial={snippetDialog.editing}
        pending={createSnippet.isPending || updateSnippet.isPending}
        error={formError}
        onOpenChange={(open) => setSnippetDialog((s) => ({ ...s, open }))}
        onSubmit={(v) => {
          setFormError(null);
          if (snippetDialog.editing) updateSnippet.mutate({ id: snippetDialog.editing.id, ...v });
          else createSnippet.mutate({ categoryId, ...v });
        }}
      />

      <CategoryDialog
        open={categoryDialog.open}
        initial={editingCategory}
        pending={createCategory.isPending || updateCategory.isPending}
        error={formError}
        canMoveUp={editingIndex > 0}
        canMoveDown={editingIndex >= 0 && editingIndex < categories.length - 1}
        onOpenChange={(open) => setCategoryDialog((s) => ({ ...s, open }))}
        onMove={(step) => {
          const ids = moveIdByStep(categories.map((c) => c.id), categoryDialog.editingId!, step);
          if (ids) reorderCategories.mutate({ ids });
        }}
        onDelete={() => {
          if (!editingCategory) return;
          setCategoryDialog({ open: false, editingId: null });
          setDeletion({ kind: "category", id: editingCategory.id, label: editingCategory.name });
        }}
        onSubmit={(v) => {
          setFormError(null);
          if (editingCategory) updateCategory.mutate({ id: editingCategory.id, ...v });
          else createCategory.mutate(v);
        }}
      />

      <ImageUploadDialog
        open={imageDialog}
        pending={uploadImage.isPending}
        error={formError}
        onOpenChange={setImageDialog}
        onSubmit={(payload) => {
          setFormError(null);
          uploadImage.mutate({ categoryId, ...payload });
        }}
      />

      <ConfirmDialog
        open={!!deletion}
        title={deletion?.kind === "category" ? "카테고리를 삭제할까요?" : deletion?.kind === "image" ? "이미지를 삭제할까요?" : "문장을 삭제할까요?"}
        pending={deleteSnippet.isPending || deleteImage.isPending || deleteCategory.isPending}
        onOpenChange={(open) => !open && setDeletion(null)}
        onConfirm={confirmDelete}
        description={
          deletion?.kind === "category" ? (
            <>
              <p>
                <strong className="text-ink">{deletion.label}</strong> 카테고리를 삭제합니다.
              </p>
              <p className="mt-2">
                {deletionCount.data
                  ? `안에 있는 문장 ${deletionCount.data.snippets}개와 이미지 ${deletionCount.data.images}개도 함께 삭제되며,`
                  : "안에 있는 문장과 이미지도 함께 삭제되며,"}{" "}
                되돌릴 수 없습니다.
              </p>
            </>
          ) : (
            <p>
              <strong className="text-ink">{deletion?.label}</strong>을(를) 삭제합니다. 되돌릴 수 없습니다.
            </p>
          )
        }
      />
    </div>
  );
}
