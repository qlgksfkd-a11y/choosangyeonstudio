import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { errorMessage, trpc } from "@/lib/trpc";

export function AuthPage() {
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSuccess = () => utils.auth.me.invalidate();
  const login = trpc.auth.login.useMutation({ onSuccess, onError: (e) => setError(errorMessage(e)) });
  const register = trpc.auth.register.useMutation({ onSuccess, onError: (e) => setError(errorMessage(e)) });
  const pending = login.isPending || register.isPending;

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "login") login.mutate({ email, password });
    else register.mutate({ name, email, password });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink-soft">Counsel Quick Copy</p>
      <h1 className="display mt-2 text-5xl font-extrabold leading-none">상담 빠른복사</h1>
      <p className="mt-4 text-ink-soft">자주 쓰는 문장과 이미지를 저장해 두고, 한 번의 탭으로 복사해 카카오톡에 붙여넣으세요.</p>

      <form onSubmit={submit} className="mt-8 space-y-4 border-t-2 border-ink pt-6" noValidate>
        <h2 className="display text-2xl font-bold">{mode === "login" ? "로그인" : "회원가입"}</h2>
        {mode === "register" ? (
          <div>
            <Label htmlFor="auth-name">이름</Label>
            <Input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
        ) : null}
        <div>
          <Label htmlFor="auth-email">이메일</Label>
          <Input id="auth-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="auth-password">비밀번호</Label>
          <Input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "register" ? "8자 이상" : undefined}
          />
        </div>
        {error ? (
          <p role="alert" className="rounded-[3px] bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "처리 중…" : mode === "login" ? "로그인" : "가입하고 시작하기"}
        </Button>
        <button
          type="button"
          className="min-h-11 w-full text-sm text-ink-soft underline underline-offset-4"
          onClick={() => {
            setError(null);
            setMode(mode === "login" ? "register" : "login");
          }}
        >
          {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
        </button>
      </form>
    </main>
  );
}
