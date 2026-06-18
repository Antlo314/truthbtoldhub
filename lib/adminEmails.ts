// The souls allowed to administer the Hub. This is the verified-email source of
// truth used to SHOW admin UI client-side; server-side enforcement lives in RLS
// (see library_schema.sql's is_library_admin(), which mirrors this list — keep
// the two in sync). The auth email is signed by Supabase and cannot be spoofed.

export const ADMIN_EMAILS = ['iamwhoiambook@gmail.com', 'admin@truthbtoldhub.com'] as const;

export function isAdminEmail(email?: string | null): boolean {
    return !!email && (ADMIN_EMAILS as readonly string[]).includes(email);
}
