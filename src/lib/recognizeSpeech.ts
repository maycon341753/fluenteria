export type RecognizeSpeechOptions = {
  lang?: string;
  timeoutMs?: number;
};

export const recognizeSpeech = (options: RecognizeSpeechOptions = {}) =>
  new Promise<string>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Ambiente sem window."));
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };

    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) {
      reject(new Error("Reconhecimento de voz não suportado neste navegador."));
      return;
    }

    const recognition = new Recognition();
    recognition.lang = options.lang ?? "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    let didFinish = false;
    const finish = (fn: () => void) => {
      if (didFinish) return;
      didFinish = true;
      fn();
    };

    const timeout = setTimeout(() => {
      try {
        recognition.stop();
      } catch {}
      finish(() => reject(new Error("Tempo esgotado ao ouvir o microfone.")));
    }, options.timeoutMs ?? 8000);

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript;
      clearTimeout(timeout);
      finish(() => resolve(typeof transcript === "string" ? transcript : ""));
    };

    recognition.onerror = (event: any) => {
      clearTimeout(timeout);
      const code = event?.error as string | undefined;
      if (code === "not-allowed" || code === "service-not-allowed") {
        finish(() => reject(new Error("Permita o uso do microfone no navegador.")));
        return;
      }
      if (code === "no-speech") {
        finish(() => reject(new Error("Nenhuma fala detectada. Tente novamente.")));
        return;
      }
      finish(() => reject(new Error("Falha no reconhecimento de voz.")));
    };

    recognition.onend = () => {
      clearTimeout(timeout);
      finish(() => resolve(""));
    };

    try {
      recognition.start();
    } catch {
      clearTimeout(timeout);
      finish(() => reject(new Error("Não foi possível iniciar o microfone.")));
    }
  });
