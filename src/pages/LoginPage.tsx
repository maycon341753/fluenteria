import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);

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
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {isSignup && (
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Nome</label>
                <input className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none" placeholder="Seu nome" />
              </div>
            )}
            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Email</label>
              <input type="email" className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none" placeholder="seu@email.com" />
            </div>
            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Senha</label>
              <input type="password" className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none" placeholder="••••••••" />
            </div>
            <Button variant="hero" size="lg" className="w-full" type="submit">
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
    </div>
  );
};

export default LoginPage;
