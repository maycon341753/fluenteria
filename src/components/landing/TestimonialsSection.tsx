import { Star } from "lucide-react";

type Testimonial = {
  name: string;
  rating: number;
  comment: string;
};

const testimonials: Testimonial[] = [
  {
    name: "Mariana S.",
    rating: 5,
    comment: "Meu filho começou a repetir as frases com confiança. A rotina ficou leve e divertida, e dá para ver evolução rápido.",
  },
  {
    name: "Rafael C.",
    rating: 5,
    comment: "A organização por módulos ajudou muito. Em poucos dias já percebemos mais vocabulário e mais interesse em praticar.",
  },
  {
    name: "Aline P.",
    rating: 5,
    comment: "Os vídeos e as músicas fazem toda a diferença. Aqui em casa a criança aprende brincando, canta junto e volta por vontade própria.",
  },
  {
    name: "João M.",
    rating: 5,
    comment: "Excelente para criar hábito. As metas e o progresso deixam claro o que precisa fazer a cada dia.",
  },
  {
    name: "Camila R.",
    rating: 5,
    comment: "Recomendo! É simples de usar e o conteúdo é direto. Aqui em casa virou parte da rotina.",
  },
  {
    name: "Bruno L.",
    rating: 5,
    comment: "O formato é muito intuitivo. Dá para aprender sem ficar cansativo, e a experiência é bem fluida no celular.",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">Avaliações ⭐</h2>
          <p className="mx-auto max-w-2xl font-body text-lg text-muted-foreground">
            Pessoas que gostaram da Blastidiomas e recomendam a plataforma.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, index) => (
            <div
              key={`${t.name}-${index}`}
              className="rounded-3xl border-2 border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg animate-slide-up"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-bold text-foreground">{t.name}</div>
                  <div className="mt-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 text-gamification"
                        fill={i < t.rating ? "hsl(var(--gamification))" : "transparent"}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-full bg-success/15 px-3 py-1 font-body text-xs font-semibold text-success">Recomendado</div>
              </div>
              <p className="mt-4 font-body text-muted-foreground">{t.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
