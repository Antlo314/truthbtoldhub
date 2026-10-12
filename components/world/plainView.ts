/** Out on the plain the body is the point: third person unless you chose otherwise. */
const KEY = 'tbth-plain-view-v1';

export function loadPlainView(): 'first' | 'third' {
    try {
        return localStorage.getItem(KEY) === 'first' ? 'first' : 'third';
    } catch {
        return 'third';
    }
}

export function savePlainView(v: 'first' | 'third') {
    try {
        localStorage.setItem(KEY, v);
    } catch {
        /* */
    }
}
