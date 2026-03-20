import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { resolvePostLoginRedirect } from "@/lib/postLoginRedirect";
import { Eye, EyeOff } from "lucide-react";

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 9);
  const part4 = digits.slice(9, 11);

  let result = part1;
  if (part2) result += `.${part2}`;
  if (part3) result += `.${part3}`;
  if (part4) result += `-${part4}`;
  return result;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSignup, setIsSignup] = useState(() => searchParams.get("mode") === "signup");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalVariant, setModalVariant] = useState<"success" | "error">("success");
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const userId = data.session?.user.id;
      if (!userId) return;
      const path = await resolvePostLoginRedirect(userId);
      navigate(path, { replace: true });
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2">
            <span className="text-4xl">🗣️</span>
            <span className="font-display text-3xl font-bold text-primary">Fluenteria</span>
          </button>
        </div>
        <div className="rounded-3xl border-2 border-border bg-card p-8 shadow-lg">
          <h1 className="mb-6 text-center font-display text-2xl font-bold text-foreground">
            {isSignup ? "Criar Conta 🎉" : "Entrar 👋"}
          </h1>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();

              if (!supabase) {
                setModalVariant("error");
                setModalTitle("Configuração pendente");
                setModalDescription("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
                setModalOpen(true);
                return;
              }

              if (!email.trim() || !password) {
                if (isSignup) {
                  setModalVariant("error");
                  setModalTitle("Erro ao criar conta");
                  setModalDescription("Preencha email e senha.");
                  setModalOpen(true);
                } else {
                  toast({ title: "Preencha email e senha" });
                }
                return;
              }

              if (isSignup) {
                const cpfDigits = cpf.replace(/\D/g, "");

                if (!fullName.trim()) {
                  setModalVariant("error");
                  setModalTitle("Erro ao criar conta");
                  setModalDescription("Informe seu nome.");
                  setModalOpen(true);
                  return;
                }

                if (cpfDigits.length !== 11) {
                  setModalVariant("error");
                  setModalTitle("Erro ao criar conta");
                  setModalDescription("CPF inválido. Informe 11 números.");
                  setModalOpen(true);
                  return;
                }

                if (password !== confirmPassword) {
                  setModalVariant("error");
                  setModalTitle("Erro ao criar conta");
                  setModalDescription("As senhas não conferem.");
                  setModalOpen(true);
                  return;
                }

                setIsSubmitting(true);
                try {
                  const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                      data: {
                        full_name: fullName,
                        cpf: cpfDigits,
                      },
                    },
                  });

                  if (error) {
                    setModalVariant("error");
                    setModalTitle("Erro ao criar conta");
                    setModalDescription(error.message);
                    setModalOpen(true);
                    return;
                  }

                  if (!data.user) {
                    setModalVariant("error");
                    setModalTitle("Erro ao criar conta");
                    setModalDescription("Não foi possível criar o usuário.");
                    setModalOpen(true);
                    return;
                  }

                  setModalVariant("success");
                  setModalTitle("Conta criada com sucesso");
                  setModalDescription(
                    data.session
                      ? "Seu cadastro foi realizado. Agora você já pode entrar."
                      : "Seu cadastro foi realizado. Verifique seu email para confirmar a conta e depois entre.",
                  );
                  setModalOpen(true);
                  return;
                } finally {
                  setIsSubmitting(false);
                }
              }

              setIsSubmitting(true);
              try {
                const { data, error } = await supabase.auth.signInWithPassword({
                  email,
                  password,
                });

                if (error) {
                  toast({ title: "Erro ao entrar", description: error.message });
                  return;
                }

                const userId = data.user?.id ?? null;
                if (!userId) return;
                const path = await resolvePostLoginRedirect(userId);
                navigate(path, { replace: true });
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSignup && (
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Nome</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                  placeholder="Seu nome"
                />
              </div>
            )}
            {isSignup && (
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">CPF</label>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  inputMode="numeric"
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                  placeholder="000.000.000-00"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Senha</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 pr-12 font-body text-foreground focus:border-primary focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {isSignup && (
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Confirmar senha</label>
                <div className="relative">
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 pr-12 font-body text-foreground focus:border-primary focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}
            <Button variant="hero" size="lg" className="w-full" type="submit" disabled={isSubmitting}>
              {isSignup ? "Criar Conta" : "Entrar"}
            </Button>
          </form>
          <p className="mt-4 text-center font-body text-sm text-muted-foreground">
            {isSignup ? "Já tem conta?" : "Não tem conta?"}{" "}
            <button onClick={() => setIsSignup(!isSignup)} className="font-bold text-primary hover:underline">
              {isSignup ? "Entrar" : "Criar conta"}
            </button>
          </p>
        </div>
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            {modalDescription ? <DialogDescription>{modalDescription}</DialogDescription> : null}
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setModalOpen(false);
                if (modalVariant === "success") {
                  setIsSignup(false);
                  setPassword("");
                  setConfirmPassword("");
                }
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
