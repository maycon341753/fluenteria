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

    type RecognitionResultAlternative = { transcript?: unknown };
    type RecognitionResult = { 0?: RecognitionResultAlternative };
    type RecognitionEvent = { results?: { 0?: RecognitionResult } };
    type RecognitionErrorEvent = { error?: unknown };

    type RecognitionInstance = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      continuous: boolean;
      start: () => void;
      stop: () => void;
      onresult: ((event: RecognitionEvent) => void) | null;
      onerror: ((event: RecognitionErrorEvent) => void) | null;
      onend: (() => void) | null;
    };

    type RecognitionConstructor = new () => RecognitionInstance;

    const w = window as unknown as {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
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
      } catch {
        void 0;
      }
      finish(() => reject(new Error("Tempo esgotado ao ouvir o microfone.")));
    }, options.timeoutMs ?? 8000);

    recognition.onresult = (event: RecognitionEvent) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      clearTimeout(timeout);
      finish(() => resolve(typeof transcript === "string" ? transcript : ""));
    };

    recognition.onerror = (event: RecognitionErrorEvent) => {
      clearTimeout(timeout);
      const code = typeof event.error === "string" ? event.error : undefined;
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
