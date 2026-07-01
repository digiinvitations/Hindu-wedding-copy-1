const CHUNK_SIZE = 500000;
const DIRECT_RETURN_THRESHOLD = 50000; // 50KB

const memoryCache = new Map<string, string>();

// Simple IndexedDB wrapper for persistent caching & local storage
function getIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FSDB_Cache", 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getFromIDB(key: string): Promise<string | null> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return null;
  }
}

async function saveToIDB(key: string, value: string): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    // Ignore
  }
}

export function transformGoogleDriveUrl(url: string): string {
  if (!url) return url;
  
  // Handle drive.google.com/file/d/ID/view format
  const match1 = url.match(/\/file\/d\/([^/]+)/);
  if (match1 && match1[1]) {
    return `https://drive.google.com/uc?export=download&id=${match1[1]}`;
  }
  
  // Handle drive.google.com/open?id=ID format
  const match2 = url.match(/id=([^&]+)/);
  if (url.includes('drive.google.com') && match2 && match2[1]) {
    return `https://drive.google.com/uc?export=download&id=${match2[1]}`;
  }
  
  return url;
}

export async function uploadToFsdb(base64: string): Promise<string> {
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ base64 })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.error("Failed to upload file to backend server, falling back to local storage:", err);
  }

  // If it's small enough, just return the base64 directly to save writes
  if (base64.length < DIRECT_RETURN_THRESHOLD) {
    return base64;
  }

  const fileId = `fsdb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const fileUrl = `fsdb://${fileId}`;

  try {
    await saveToIDB(fileUrl, base64);
    memoryCache.set(fileUrl, base64);
  } catch (err) {
    console.error("Local storage to IndexedDB failed:", err);
  }

  return fileUrl;
}

export async function fetchFromFsdb(fileUrl: string): Promise<string> {
  if (!fileUrl) return fileUrl;
  if (!fileUrl.startsWith("fsdb://")) return transformGoogleDriveUrl(fileUrl);
  
  if (memoryCache.has(fileUrl)) {
    return memoryCache.get(fileUrl)!;
  }

  const idbCache = await getFromIDB(fileUrl);
  if (idbCache) {
    memoryCache.set(fileUrl, idbCache);
    return idbCache;
  }

  return "";
}

