"use client";

import { useEffect, useState } from "react";

const INK = "#F4EFDE";
const PAPER = "#0C0B09";
const PANEL = "#18160F";
const LINE = "rgba(201,162,39,0.22)";
const MUTED = "#9C9483";
const SAFELIGHT = "#C9A227";
const BRASS = "#8F7A45";
const DANGER = "#C1443A";

const CATEGORIES = ["프로필/인물", "웨딩", "가족", "반려동물", "상업/제품"];

const DUOTONES = {
  "프로필/인물": ["#0C0B09", "#8A6D2A"],
  "웨딩": ["#0C0B09", "#C9A227"],
  "가족": ["#0C0B09", "#7A6640"],
  "반려동물": ["#0C0B09", "#9C8A4E"],
  "상업/제품": ["#0C0B09", "#5C5344"],
};

// Hero / category-grid art direction images (served from /public/images,
// decoded once from the original prototype's inline base64 assets).
const FAMILY_IMG_1 = "/images/family_img_1.jpg";
const FAMILY_IMG_5 = "/images/family_img_5.jpg";
const PROFILE_IMG_1 = "/images/profile_img_1.jpg";
const PROFILE_IMG_2 = "/images/profile_img_2.jpg";

const FAVORITES_KEY = "loupe:favorites";

function Photo({ category, ratio = "4 / 3", small, src }) {
  if (src) {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: ratio, background: PANEL, overflow: "hidden" }}>
        <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  const [c1, c2] = DUOTONES[category];
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: ratio, background: `linear-gradient(155deg, ${c1} 0%, ${c2} 100%)`, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "3px 3px", mixBlendMode: "overlay" }} />
      {!small && (
        <span style={{ position: "absolute", left: 12, bottom: 10, fontSize: 11, color: "rgba(255,255,255,0.75)", fontStyle: "italic", fontFamily: "'Fraunces', serif" }}>
          portfolio still
        </span>
      )}
    </div>
  );
}

function Heart({ active, onToggle }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-label={active ? "찜 해제" : "찜하기"}
      style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(24,21,16,0.55)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
    >
      <i className={active ? "ti ti-heart-filled" : "ti ti-heart"} style={{ fontSize: 13, color: active ? SAFELIGHT : "#F5F1E8" }} aria-hidden="true" />
    </button>
  );
}

function Header({ onLogoClick, onNavCategory }) {
  return (
    <header style={{ borderBottom: `1px solid ${LINE}` }}>
      <div style={{ background: PANEL, color: BRASS, fontSize: 12.5, textAlign: "center", padding: "7px 12px", letterSpacing: "0.02em" }}>
        지금 문의하면 촬영 일정을 24시간 내에 확인해드려요
      </div>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <button onClick={onLogoClick} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 24, color: INK, flexShrink: 0 }}>
          루페
        </button>
        <nav style={{ display: "flex", gap: 18, overflowX: "auto" }}>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => onNavCategory(c)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, color: MUTED, whiteSpace: "nowrap", padding: "6px 0" }}>
              {c}
            </button>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <span className="header-photographer-cta" style={{ fontSize: 13, color: MUTED }}>작가이신가요?</span>
          <button style={{ background: SAFELIGHT, color: PAPER, border: "none", borderRadius: 3, padding: "8px 16px", fontSize: 13, letterSpacing: "0.01em", cursor: "pointer" }}>
            작가 등록
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero({ category }) {
  const bg = category === "가족" ? FAMILY_IMG_5 : category === "프로필/인물" ? PROFILE_IMG_2 : null;
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 7", background: bg ? `${PANEL}` : `linear-gradient(155deg, ${DUOTONES[category][0]} 0%, ${DUOTONES[category][1]} 100%)`, overflow: "hidden" }}>
      {bg && (
        <img src={bg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      {!bg && (
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "3px 3px", mixBlendMode: "overlay" }} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.5), transparent 55%)" }} />
      <div style={{ position: "absolute", left: "50%", bottom: 30, transform: "translateX(-50%)", width: "100%", maxWidth: 1040, padding: "0 20px", boxSizing: "border-box" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 15, color: "#F5F1E8", marginBottom: 10 }}>루페</div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 400, fontSize: "clamp(22px, 4vw, 34px)", lineHeight: 1.3, color: "#FFFFFF", margin: 0, maxWidth: 560 }}>
          전국 사진작가 중, 루페가 직접 검증한 작가들을 만나보세요
        </h1>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.8)", marginTop: 12 }}>
          선정 기준 알아보기 ›
        </p>
      </div>
    </div>
  );
}

function CategoryGrid({ onPick }) {
  return (
    <section style={{ maxWidth: 1040, margin: "0 auto", padding: "48px 20px 0" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 400, fontSize: 21, color: INK, margin: "0 0 20px" }}>
        관심있는 촬영 분야부터 둘러보세요
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => onPick(c)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
            <div style={{ position: "relative" }}>
              <Photo category={c} ratio="1 / 1" small src={c === "가족" ? FAMILY_IMG_1 : c === "프로필/인물" ? PROFILE_IMG_1 : undefined} />
              <span style={{ position: "absolute", left: 12, bottom: 10, fontSize: 14, color: "#FFFFFF", fontFamily: "'Fraunces', serif" }}>{c}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function PromoBanner() {
  return (
    <section style={{ maxWidth: 1040, margin: "40px auto 0", padding: "0 20px" }}>
      <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 4, padding: "30px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: BRASS, marginBottom: 8 }}>예약 전, 궁금한 건 먼저 물어보세요</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: "#F5F1E8", lineHeight: 1.4 }}>
            문의만 남기면, 작가가 직접 일정과 견적을 안내해드려요
          </div>
        </div>
        <button style={{ background: "none", border: "1px solid rgba(245,241,232,0.4)", color: "#F5F1E8", borderRadius: 3, padding: "11px 20px", fontSize: 13.5, cursor: "pointer", flexShrink: 0 }}>
          지금 문의하러 가기
        </button>
      </div>
    </section>
  );
}

function Rail({ category, photographers, favorites, onToggleFavorite, onSelect }) {
  const list = photographers.filter((p) => p.category === category);
  if (!list.length) return null;
  return (
    <section style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 20px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 400, fontSize: 18, color: INK, margin: 0 }}>{category}</h3>
        <span style={{ fontSize: 12.5, color: MUTED }}>더보기 ›</span>
      </div>
      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 4 }}>
        {list.map((p) => (
          <button key={p.id} onClick={() => onSelect(p.id)} style={{ flex: "0 0 200px", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}>
            <div style={{ position: "relative" }}>
              <Photo category={p.category} ratio="1 / 1" small src={p.photoUrl} />
              {p.badge && (
                <span style={{ position: "absolute", left: 8, bottom: 8, fontSize: 10.5, color: "#FFF6F2", background: "rgba(24,21,16,0.65)", padding: "3px 8px", borderRadius: 2 }}>
                  {p.badge}
                </span>
              )}
              <Heart active={favorites.has(p.id)} onToggle={() => onToggleFavorite(p.id)} />
            </div>
            <div style={{ marginTop: 9 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 14.5, color: INK }}>{p.studio}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{p.region} · {p.priceFrom.toLocaleString()}원~</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

const JOURNAL = [
  { cat: "프로필/인물", title: "면접용 프로필, 어디까지 손봐야 할까", body: "과한 보정보다 신뢰를 주는 톤이 먼저예요." },
  { cat: "웨딩", title: "본식스냅과 웨딩스냅, 뭐가 다를까", body: "촬영 시점과 목적부터 정리해봤어요." },
  { cat: "가족", title: "아이 표정, 어떻게 자연스럽게 담을까", body: "포즈보다 놀이에 가까운 촬영이 낫습니다." },
];

function Journal() {
  return (
    <section style={{ maxWidth: 1040, margin: "48px auto 0", padding: "0 20px" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 400, fontSize: 21, color: INK, margin: "0 0 20px" }}>매거진</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 22 }}>
        {JOURNAL.map((j, i) => (
          <div key={i}>
            <Photo category={j.cat} ratio="3 / 2" small />
            <div style={{ fontSize: 11.5, color: BRASS, marginTop: 10 }}>매거진 · {j.cat}</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15.5, color: INK, marginTop: 4, lineHeight: 1.4 }}>{j.title}</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>{j.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ marginTop: 60, borderTop: `1px solid ${LINE}` }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: INK }}>루페</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.7 }}>사진작가와 소비자를 연결하는 촬영 중개 플랫폼</div>
        </div>
        <div style={{ display: "flex", gap: 26, fontSize: 12.5, color: MUTED }}>
          <span>회사소개</span>
          <span>이용약관</span>
          <span>개인정보처리방침</span>
        </div>
      </div>
    </footer>
  );
}

function HomeScreen({ photographers, loading, onSelect, favorites, onToggleFavorite }) {
  const [category, setCategory] = useState(CATEGORIES[0]);

  if (loading) {
    return (
      <div style={{ padding: "120px 20px", textAlign: "center", color: MUTED, fontSize: 14 }}>
        불러오는 중…
      </div>
    );
  }

  return (
    <div>
      <Hero category={category} />
      <CategoryGrid onPick={setCategory} />
      <PromoBanner />
      {CATEGORIES.map((c) => (
        <Rail key={c} category={c} photographers={photographers} favorites={favorites} onToggleFavorite={onToggleFavorite} onSelect={onSelect} />
      ))}
      <Journal />
    </div>
  );
}

function DetailScreen({ photographer, onBack, onInquire }) {
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 20px 80px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, color: MUTED, padding: "26px 0 18px" }}>
        ← 목록으로
      </button>
      <Photo category={photographer.category} ratio="4 / 3" src={photographer.photoUrl} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <Photo category={photographer.category} ratio="3 / 4" small />
        <Photo category={photographer.category} ratio="3 / 4" small />
      </div>
      <div style={{ marginTop: 26, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, color: INK }}>{photographer.studio}</div>
          <div style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{photographer.name} · {photographer.category} · {photographer.region}</div>
        </div>
        <div style={{ fontSize: 13.5, color: INK, textAlign: "right", flexShrink: 0 }}>{photographer.priceFrom.toLocaleString()}원~</div>
      </div>
      <p style={{ fontSize: 15, color: INK, lineHeight: 1.75, marginTop: 22, maxWidth: 560 }}>{photographer.bio}</p>
      <button onClick={onInquire} style={{ marginTop: 30, background: SAFELIGHT, color: PAPER, border: "none", borderRadius: 3, padding: "13px 26px", fontSize: 14.5, letterSpacing: "0.01em", cursor: "pointer" }}>
        이 작가에게 문의하기
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 22 }}>
      <span style={{ display: "block", fontSize: 12.5, color: MUTED, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = { width: "100%", border: "none", borderBottom: `1px solid ${LINE}`, background: "none", fontSize: 15, color: INK, padding: "6px 0", boxSizing: "border-box" };

function InquiryScreen({ photographer, onBack }) {
  const [form, setForm] = useState({ name: "", phone: "", category: photographer.category, date: "", message: "" });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit() {
    const next = {};
    if (!form.name.trim()) next.name = "이름을 입력해주세요";
    if (!form.phone.trim()) next.phone = "연락처를 입력해주세요";
    if (!form.message.trim()) next.message = "간단한 메시지를 남겨주세요";
    if (Object.keys(next).length) { setErrors(next); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photographerId: photographer.id, ...form }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors(data.errors || { message: "문의 전송에 실패했어요. 잠시 후 다시 시도해주세요." });
        return;
      }
      setSent(true);
    } catch {
      setErrors({ message: "문의 전송에 실패했어요. 네트워크를 확인해주세요." });
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "90px 20px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, color: INK, marginBottom: 10 }}>문의가 전달됐어요</div>
        <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.7 }}>{photographer.studio}에서 남겨주신 연락처로 회신드릴 예정이에요.</p>
        <button onClick={onBack} style={{ marginTop: 30, background: "none", border: `1px solid ${LINE}`, borderRadius: 3, padding: "11px 22px", fontSize: 14, color: INK, cursor: "pointer" }}>
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px 80px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, color: MUTED, padding: "26px 0 6px" }}>← 취소</button>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: INK, margin: "10px 0 4px" }}>{photographer.studio}에 문의하기</div>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 30 }}>아래 내용을 남기면 작가에게 바로 전달돼요.</p>
      <Field label="이름">
        <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="홍길동" />
        {errors.name && <span style={{ fontSize: 12, color: DANGER }}>{errors.name}</span>}
      </Field>
      <Field label="연락처">
        <input style={inputStyle} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="010-0000-0000" />
        {errors.phone && <span style={{ fontSize: 12, color: DANGER }}>{errors.phone}</span>}
      </Field>
      <Field label="촬영 종류">
        <select style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} value={form.category} onChange={(e) => set("category", e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="희망 일정 (선택)">
        <input type="date" style={inputStyle} value={form.date} onChange={(e) => set("date", e.target.value)} />
      </Field>
      <Field label="메시지">
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="촬영 목적, 인원, 장소 등을 자유롭게 적어주세요" />
        {errors.message && <span style={{ fontSize: 12, color: DANGER }}>{errors.message}</span>}
      </Field>
      <button onClick={submit} disabled={submitting} style={{ width: "100%", marginTop: 12, background: SAFELIGHT, color: PAPER, border: "none", borderRadius: 3, padding: "14px 0", fontSize: 15, letterSpacing: "0.01em", cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1 }}>
        {submitting ? "전송 중…" : "문의 보내기"}
      </button>
    </div>
  );
}

export default function PlatformApp() {
  const [screen, setScreen] = useState("home");
  const [selectedId, setSelectedId] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [photographers, setPhotographers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load the roster from the database-backed API instead of a hardcoded array.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/photographers")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setPhotographers(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Favorites have no user accounts yet, so they persist per-browser via
  // localStorage rather than a server table.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  function toggleFavorite(id) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  const selected = photographers.find((p) => p.id === selectedId);

  return (
    <div style={{ background: PAPER, minHeight: "100vh", fontFamily: "'IBM Plex Sans KR', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400&family=IBM+Plex+Sans+KR:wght@400;500&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/2.44.0/iconfont/tabler-icons.min.css');
        * { box-sizing: border-box; }
        input, textarea, select { outline: none; }
        input:focus, textarea:focus, select:focus { border-bottom-color: ${SAFELIGHT}; }
        .header-photographer-cta { display: inline; }
        @media (max-width: 640px) {
          .header-photographer-cta { display: none; }
        }
      `}</style>

      <Header
        onLogoClick={() => setScreen("home")}
        onNavCategory={() => setScreen("home")}
      />

      {screen === "home" && (
        <HomeScreen
          photographers={photographers}
          loading={loading}
          onSelect={(id) => { setSelectedId(id); setScreen("detail"); }}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {screen === "detail" && selected && (
        <DetailScreen photographer={selected} onBack={() => setScreen("home")} onInquire={() => setScreen("inquiry")} />
      )}

      {screen === "inquiry" && selected && (
        <InquiryScreen photographer={selected} onBack={() => setScreen("detail")} />
      )}

      <Footer />
    </div>
  );
}
