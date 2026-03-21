import siteSeguroBadge from "@/assets/site-100-seguro.svg";
import sslSeguroBadge from "@/assets/ssl-certificado-seguro.svg";

const Footer = () => (
  <footer className="border-t-2 border-border bg-card py-10">
    <div className="container mx-auto px-4">
      <div className="flex flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">
        <div>
          <div className="mb-4 flex items-center justify-center gap-2 md:justify-start">
            <span className="text-2xl">🗣️</span>
            <span className="font-display text-xl font-bold text-primary">Fluenteria</span>
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:justify-start">
            <a href="/eca-lgpd" className="font-body text-sm font-semibold text-foreground hover:text-primary transition-colors">
              ECA e LGPD
            </a>
            <a href="/referrals" className="font-body text-sm font-semibold text-foreground hover:text-primary transition-colors">
              Indicação
            </a>
            <a href="/sobre-nos" className="font-body text-sm font-semibold text-foreground hover:text-primary transition-colors">
              Sobre nós
            </a>
            <a href="/privacidade-seguranca" className="font-body text-sm font-semibold text-foreground hover:text-primary transition-colors">
              Privacidade e segurança
            </a>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            © 2026 Fluenteria. Todos os direitos reservados. Feito com 💙 para crianças.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
          <img src={siteSeguroBadge} alt="Site 100% seguro" className="max-h-12 w-auto max-w-full select-none object-contain" />
          <img src={sslSeguroBadge} alt="Compra 100% segura e SSL certificado" className="max-h-12 w-auto max-w-full select-none object-contain" />
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
