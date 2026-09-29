import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { AuthPage } from "@/components/AuthPage";
import { ErrorState, FullScreenLoading } from "@/components/States";
import { ToastProvider } from "@/components/Toast";
import { errorMessage, isUnauthorized, trpc } from "@/lib/trpc";
import Home from "@/pages/Home";
import "./index.css";

function App() {
  const me = trpc.auth.me.useQuery(undefined, { retry: 1 });
  if (me.isLoading) return <FullScreenLoading />;
  if (me.isError) return <ErrorState message={errorMessage(me.error, "서버에 연결하지 못했습니다.")} onRetry={() => me.refetch()} />;
  if (!me.data) return <AuthPage />;
  return <Home user={me.data} />;
}

function Root() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          // 세션이 만료되면 로그인 화면으로 돌아간다.
          onError: (error) => {
            if (isUnauthorized(error)) queryClient.invalidateQueries({ queryKey: [["auth", "me"]] });
          },
        }),
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: (count, error) => !(error instanceof TRPCClientError && error.data) && count < 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({ links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })] }),
  );
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
