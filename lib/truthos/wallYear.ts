/** Calendar-year lock for The Mark. No house geometry — safe to import from OS + API. */

export const WALL_YEAR = () => new Date().getUTCFullYear();
export const nextYearOpen = (year: number) => new Date(Date.UTC(year + 1, 0, 1));
export const CAPTION_MAX = 24;
export const PNG_MAX_BYTES = 80_000;

export function normEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function clipCaption(raw: string): string {
    return raw.replace(/\s+/g, ' ').trim().slice(0, CAPTION_MAX);
}
