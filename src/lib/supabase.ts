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
 * DB helper functions that sync with the Backend Server for Permanent Storage
 * and fallback to Local Storage for high-speed offline capabilities.
 */

// 1. Settings / Configuration
export async function saveConfigToDb(newConfig: WeddingConfig) {
  try {
    // 1. Save locally for fast load
    localStorage.setItem("wedding_config", JSON.stringify(newConfig));
    window.dispatchEvent(new Event("wedding_config_updated"));

    // 2. Save to Server-side file storage
    await fetch("/api/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newConfig)
    });
  } catch (err) {
    console.error("Failed to save config to server:", err);
  }
}

// Helper to fetch config from server and sync locally
export async function fetchConfigFromDb(): Promise<WeddingConfig | null> {
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const serverConfig = await res.json();
      if (serverConfig && Object.keys(serverConfig).length > 0) {
        localStorage.setItem("wedding_config", JSON.stringify(serverConfig));
        window.dispatchEvent(new Event("wedding_config_updated"));
        return serverConfig;
      }
    }
  } catch (err) {
    console.error("Failed to fetch configuration from backend server:", err);
  }
  return null;
}

// 2. RSVP Operations
export async function addRsvpToDb(newRsvp: Omit<RSVPRecord, "id">) {
  let record: RSVPRecord;
  try {
    // Save to server
    const response = await fetch("/api/rsvps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newRsvp)
    });
    if (response.ok) {
      record = await response.json();
    } else {
      throw new Error("Server RSVP save failed");
    }
  } catch (err) {
    console.warn("Save RSVP to server failed, storing locally first:", err);
    // Fallback to purely local ID generation
    const id = `rsvp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    record = { id, ...newRsvp, timestamp: new Date().toISOString() };
  }

  // Update local cache
  const rsvps = getLocalRsvps();
  // Filter out any duplicates with same ID if server returned one
  const filtered = rsvps.filter(r => r.id !== record.id);
  filtered.unshift(record);
  localStorage.setItem("wedding_rsvps", JSON.stringify(filtered));
  
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

// Fetch all RSVPs from server and update local cache
export async function fetchRsvpsFromDb(): Promise<RSVPRecord[]> {
  try {
    const response = await fetch("/api/rsvps");
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("wedding_rsvps", JSON.stringify(data));
      window.dispatchEvent(new Event("storage_rsvps_updated"));
      return data;
    }
  } catch (err) {
    console.error("Failed to fetch RSVPs from server:", err);
  }
  return getLocalRsvps();
}

export async function deleteLocalRsvp(id: string) {
  try {
    await fetch(`/api/rsvps/${id}`, { method: "DELETE" });
  } catch (err) {
    console.error("Failed to delete RSVP on server:", err);
  }

  const rsvps = getLocalRsvps();
  const filtered = rsvps.filter(r => r.id !== id);
  localStorage.setItem("wedding_rsvps", JSON.stringify(filtered));
  window.dispatchEvent(new Event("storage_rsvps_updated"));
}

export async function clearAllLocalRsvps() {
  try {
    await fetch("/api/rsvps", { method: "DELETE" });
  } catch (err) {
    console.error("Failed to clear all RSVPs on server:", err);
  }

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
export async function checkSupabaseTables() {
  return { settings: true, rsvps: true, fs_files: true };
}
