export type SpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
};

export const speak = (text: string, options: SpeakOptions = {}) =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Ambiente sem window."));
      return;
    }

    const synth = window.speechSynthesis;
    if (!synth || typeof window.SpeechSynthesisUtterance === "undefined") {
      reject(new Error("Text-to-speech não suportado neste navegador."));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang ?? "en-US";
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;

    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Falha ao reproduzir o áudio."));

    synth.cancel();
    synth.speak(utterance);
  });
