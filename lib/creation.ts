import type { Scene, Room } from "./game";

export type CreationIntent = {
  id: string;
  createdAt: number;
  kind: "import" | "generate";
  phase: "requested" | "working" | "ready" | "failed";
  filename?: string;
  file?: Blob;
  prompt?: string;
  scene?: Scene;
  brief?: string;
  format?: "long" | "short";
  proposal?: Room;
};

/** IndexedDB keeps a selected file across navigation and sign-in without URL
 * payloads, small sessionStorage quotas, or a silent upload before sign-in. */
// Keep the original storage namespace so existing creation intents survive rebranding.
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(
        new Error(
          "Local storage is unavailable. Allow it to resume your creation in the studio.",
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
        new Error("Unable to keep your creation in this browser."),
      );
    request.onblocked = () =>
      reject(
        new Error("Close the other Storyscape tabs, then try again."),
      );
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
            "Unable to save this creation. The image may be too large.",
          ),
        );
      transaction.onabort = () =>
        reject(new Error("Local saving was interrupted."));
    });
  } finally {
    db.close();
  }
}
export async function getCreation(id: string): Promise<CreationIntent> {
  if (!/^[a-f0-9-]{36}$/.test(id))
    throw new Error("The creation link is invalid.");
  const db = await open();
  let value: CreationIntent | undefined;
  try {
    value = await new Promise((resolve, reject) => {
      const request = db.transaction("intents").objectStore("intents").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error("Unable to find your creation."));
    });
  } finally {
    db.close();
  }
  if (!value || Date.now() - value.createdAt > 86_400_000)
    throw new Error(
      "This creation has expired or comes from another browser. Import your image or enter your prompt again.",
    );
  if (value.kind !== "import" && value.kind !== "generate")
    throw new Error("This creation is invalid.");
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
        reject(new Error("Unable to clean up the local creation."));
    });
  } finally {
    db.close();
  }
}

export function checkIllustration(file: Blob) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Choose a PNG, JPG or WebP image.");
  if (file.size > 10_000_000)
    throw new Error("Choose an illustration under 10 MB.");
  if (!file.size)
    throw new Error("This file is empty. Choose another image.");
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
            "This image cannot be read. Try another file.",
          ),
        );
      image.src = url;
    });
    if (image.naturalWidth < 100 || image.naturalHeight < 100)
      throw new Error(
        "The illustration must measure at least 100 pixels on each side.",
      );
    if (image.naturalWidth * image.naturalHeight > 60_000_000)
      throw new Error(
        "This image is too large. Export a smaller version.",
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
          "This image is too elongated. Choose a less narrow crop.",
        );
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("This browser cannot prepare the image.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/png");
      if ((data.length - data.indexOf(",") - 1) * 0.75 <= 5_000_000)
        return data;
      scale *= 0.8;
    }
    throw new Error(
      "The image is still too large. Export a lighter version.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
