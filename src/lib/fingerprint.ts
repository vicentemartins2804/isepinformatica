import FingerprintJS from "@fingerprintjs/fingerprintjs";

const VISITOR_ID_KEY = "sweat:visitor-id";
const VOTED_KEY = "sweat:voted";

let visitorIdPromise: Promise<string> | null = null;

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage indisponível (ex.: modo privado); a base de dados continua a proteger.
  }
}

/** Gera (uma única vez) a hash do dispositivo com FingerprintJS e guarda-a no localStorage. */
export function getVisitorId(): Promise<string> {
  visitorIdPromise ??= FingerprintJS.load()
    .then((fp) => fp.get())
    .then(({ visitorId }) => {
      storageSet(VISITOR_ID_KEY, visitorId);
      return visitorId;
    })
    .catch((err) => {
      visitorIdPromise = null;
      throw err;
    });
  return visitorIdPromise;
}

export function hasVotedLocally(): boolean {
  return storageGet(VOTED_KEY) !== null;
}

export function markVotedLocally() {
  storageSet(VOTED_KEY, new Date().toISOString());
}
