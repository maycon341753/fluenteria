const Footer = () => (
  <footer className="border-t-2 border-border bg-card py-10">
    <div className="container mx-auto px-4 text-center">
      <div className="mb-4 flex items-center justify-center gap-2">
        <span className="text-2xl">🗣️</span>
        <span className="font-display text-xl font-bold text-primary">Fluenteria</span>
      </div>
      <div className="mb-4 flex items-center justify-center">
        <a href="/eca-lgpd" className="font-body text-sm font-semibold text-foreground hover:text-primary transition-colors">
          ECA e LGPD
        </a>
      </div>
      <p className="font-body text-sm text-muted-foreground">
        © 2026 Fluenteria. Todos os direitos reservados. Feito com 💙 para crianças.
      </p>
    </div>
  </footer>
);

export default Footer;
