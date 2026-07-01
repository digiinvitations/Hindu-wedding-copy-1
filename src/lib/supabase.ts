import { WeddingConfig } from "../weddingConfig";

export const isSupabaseEnabled = false;
export const supabase = null;

// Interface for RSVP database record
export interface RSVPRecord {
  id: string;
  name: string;
  phone: string;
  guestsCount: number;
  attend: boolean;
  message: string;
  timestamp: string;
}

/**
 * DB helper functions that seamlessly switch to 100% Client-Side Local Storage
 */

// 1. Settings / Configuration
export async function saveConfigToDb(newConfig: WeddingConfig, fallbackSave?: () => Promise<void>) {
  try {
    localStorage.setItem("wedding_config", JSON.stringify(newConfig));
    window.dispatchEvent(new Event("wedding_config_updated"));
  } catch (err) {
    console.error("Local storage save failed:", err);
  }
}

// 2. RSVP Add
export async function addRsvpToDb(newRsvp: Omit<RSVPRecord, "id">, fallbackAdd?: () => Promise<any>) {
  const rsvps = getLocalRsvps();
  const id = `rsvp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const record: RSVPRecord = { id, ...newRsvp };
  rsvps.unshift(record);
  localStorage.setItem("wedding_rsvps", JSON.stringify(rsvps));
  
  // Trigger storage events to sync tabs
  window.dispatchEvent(new Event("storage_rsvps_updated"));
  return record;
}

export function getLocalRsvps(): RSVPRecord[] {
  try {
    const raw = localStorage.getItem("wedding_rsvps");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function deleteLocalRsvp(id: string) {
  const rsvps = getLocalRsvps();
  const filtered = rsvps.filter(r => r.id !== id);
  localStorage.setItem("wedding_rsvps", JSON.stringify(filtered));
  window.dispatchEvent(new Event("storage_rsvps_updated"));
}

export function clearAllLocalRsvps() {
  localStorage.removeItem("wedding_rsvps");
  window.dispatchEvent(new Event("storage_rsvps_updated"));
}

// 3. Upload File Chunk (FSDB Placeholder)
export async function uploadChunkToDb() {
  // No-op
}

// 4. Fetch File Chunks (FSDB Placeholder)
export async function fetchChunksFromDb() {
  return "";
}

/**
 * Check which tables are accessible (Mock for complete offline)
 */
export async function checkSupabaseTables(): Promise<{
  settings: boolean;
  rsvps: boolean;
  fs_files: boolean;
}> {
  return { settings: false, rsvps: false, fs_files: false };
}
