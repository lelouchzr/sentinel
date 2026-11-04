import type { Scene } from "./game";

export type CreationIntent = {
  id: string;
  createdAt: number;
  kind: "import" | "generate";
  phase: "requested" | "working" | "ready" | "failed";
  filename?: string;
  file?: Blob;
  prompt?: string;
  scene?: Scene;
};

/** IndexedDB keeps a selected file across navigation and sign-in without URL
 * payloads, small sessionStorage quotas, or a silent upload before sign-in. */
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(
        new Error(
          "Le stockage local est indisponible. Autorisez-le pour reprendre votre création dans l’atelier.",
        ),
      );
      return;
    }
    const request = indexedDB.open("frame-creation", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("intents", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error("Impossible de conserver votre création dans ce navigateur."),
      );
    request.onblocked = () =>
      reject(new Error("Fermez les autres onglets FRAME, puis réessayez."));
  });
}
export async function putCreation(intent: CreationIntent) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("intents", "readwrite");
      transaction.objectStore("intents").put(intent);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(
          new Error(
            "Impossible d’enregistrer cette création. L’image est peut-être trop volumineuse.",
          ),
        );
      transaction.onabort = () =>
        reject(new Error("L’enregistrement local a été interrompu."));
    });
  } finally {
    db.close();
  }
}
export async function getCreation(id: string): Promise<CreationIntent> {
  if (!/^[a-f0-9-]{36}$/.test(id))
    throw new Error("Le lien de création est invalide.");
  const db = await open();
  let value: CreationIntent | undefined;
  try {
    value = await new Promise((resolve, reject) => {
      const request = db.transaction("intents").objectStore("intents").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error("Impossible de retrouver votre création."));
    });
  } finally {
    db.close();
  }
  if (!value || Date.now() - value.createdAt > 86_400_000)
    throw new Error(
      "Cette création a expiré ou vient d’un autre navigateur. Importez votre image ou saisissez à nouveau votre prompt.",
    );
  if (value.kind !== "import" && value.kind !== "generate")
    throw new Error("Cette création est invalide.");
  return value;
}
export async function removeCreation(id: string) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("intents", "readwrite");
      transaction.objectStore("intents").delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(new Error("Impossible de nettoyer la création locale."));
    });
  } finally {
    db.close();
  }
}

export function checkIllustration(file: Blob) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Choisissez une image PNG, JPG ou WebP.");
  if (file.size > 10_000_000)
    throw new Error("Choisissez une illustration de moins de 10 Mo.");
  if (!file.size)
    throw new Error("Ce fichier est vide. Choisissez une autre image.");
}
/** Normalize supported browser formats to the server's bounded PNG contract. */
export async function prepareIllustration(file: Blob): Promise<string> {
  checkIllustration(file);
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(
          new Error(
            "Cette image ne peut pas être lue. Essayez un autre fichier.",
          ),
        );
      image.src = url;
    });
    if (image.naturalWidth < 100 || image.naturalHeight < 100)
      throw new Error(
        "L’illustration doit mesurer au moins 100 pixels de chaque côté.",
      );
    if (image.naturalWidth * image.naturalHeight > 60_000_000)
      throw new Error(
        "Cette image est trop grande. Exportez une version plus petite.",
      );
    let scale = Math.min(
      1,
      2048 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      if (canvas.width < 100 || canvas.height < 100)
        throw new Error(
          "Cette image est trop allongée. Choisissez un cadrage moins étroit.",
        );
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Ce navigateur ne permet pas de préparer l’image.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/png");
      if ((data.length - data.indexOf(",") - 1) * 0.75 <= 5_000_000)
        return data;
      scale *= 0.8;
    }
    throw new Error(
      "L’image reste trop volumineuse. Exportez une version plus légère.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
