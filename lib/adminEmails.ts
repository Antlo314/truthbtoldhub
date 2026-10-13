// The one soul who administers the Hub: the Architect, iamwhoiambook@gmail.com.
// This is the verified-email source of truth for the app (UI and API routes);
// server-side enforcement lives in RLS — architect_only.sql sets the database's
// is_sanctum_admin / is_library_admin / is_hub_admin to the same email. Keep the
// two in sync. The auth email is signed by Supabase and cannot be spoofed.

export const ADMIN_EMAILS = ['iamwhoiambook@gmail.com'] as const;

export function isAdminEmail(email?: string | null): boolean {
    return !!email && (ADMIN_EMAILS as readonly string[]).includes(email);
}
