/** Zustand persist schema — bump when stored shape changes. */
export const PERSIST_STORE_VERSION = 6;

/** Bump when migrating from legacy single-key payloads. */
export const STORAGE_KEY_PRIMARY = "frictionmap-app-v2";

/** Tracks report IDs submitted on this device so "My Reports" survives Supabase reloads. */
export const MY_REPORT_IDS_KEY = "frictionmap-my-report-ids";
