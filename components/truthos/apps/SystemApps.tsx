'use client';

/**
 * Classic desktop utilities: Calculator, Paint, Notepad, File Explorer.
 * Virtual FS in localStorage — create/rename/move folders & files.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sacredUi } from '@/lib/game/sacredUiSfx';

const FS_KEY = 'truthos_vfs_v1';

export type VNode = {
    id: string;
    name: string;
    type: 'folder' | 'file';
    parentId: string | null;
    content?: string; // text or paint dataURL
    kind?: 'txt' | 'png' | 'note';
    updatedAt: number;
};

function uid() {
    return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadFs(): VNode[] {
    try {
        const raw = localStorage.getItem(FS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as VNode[];
            if (Array.isArray(parsed) && parsed.length) return parsed;
        }
    } catch {
        /* */
    }
    const now = Date.now();
    return [
        { id: 'root', name: 'Home', type: 'folder', parentId: null, updatedAt: now },
        { id: 'docs', name: 'Documents', type: 'folder', parentId: 'root', updatedAt: now },
        { id: 'pics', name: 'Pictures', type: 'folder', parentId: 'root', updatedAt: now },
        {
            id: 'welcome',
            name: 'Welcome.txt',
            type: 'file',
            parentId: 'docs',
            kind: 'txt',
            content: 'Welcome to Truth.OS Files.\nCreate folders, move items, open text in Notepad.',
            updatedAt: now,
        },
    ];
}

function saveFs(nodes: VNode[]) {
    try {
        localStorage.setItem(FS_KEY, JSON.stringify(nodes));
    } catch {
        /* */
    }
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`h-full overflow-hidden flex flex-col bg-zinc-950 text-zinc-200 ${className}`}>{children}</div>;
}

/* ─── Calculator ─────────────────────────────────────────── */

export function CalculatorApp() {
    const [display, setDisplay] = useState('0');
    const [acc, setAcc] = useState<number | null>(null);
    const [op, setOp] = useState<string | null>(null);
    const [fresh, setFresh] = useState(true);

    const input = (d: string) => {
        sacredUi.click();
        setDisplay((cur) => {
            if (fresh || cur === '0') {
                setFresh(false);
                return d === '.' ? '0.' : d;
            }
            if (d === '.' && cur.includes('.')) return cur;
            if (cur.length > 14) return cur;
            return cur + d;
        });
    };

    const applyOp = (next: string) => {
        sacredUi.click();
        const n = parseFloat(display);
        if (acc === null || op === null || fresh) {
            setAcc(n);
            setOp(next);
            setFresh(true);
            return;
        }
        let r = acc;
        if (op === '+') r = acc + n;
        if (op === '−') r = acc - n;
        if (op === '×') r = acc * n;
        if (op === '÷') r = n === 0 ? NaN : acc / n;
        const s = Number.isFinite(r) ? String(parseFloat(r.toPrecision(12))) : 'Error';
        setDisplay(s);
        setAcc(s === 'Error' ? null : r);
        setOp(next === '=' ? null : next);
        setFresh(true);
    };

    const clear = () => {
        sacredUi.click();
        setDisplay('0');
        setAcc(null);
        setOp(null);
        setFresh(true);
    };

    const keys = [
        ['C', '±', '%', '÷'],
        ['7', '8', '9', '×'],
        ['4', '5', '6', '−'],
        ['1', '2', '3', '+'],
        ['0', '.', '='],
    ];

    const onKey = (k: string) => {
        if (k === 'C') return clear();
        if (k === '±') {
            sacredUi.click();
            setDisplay((d) => (d.startsWith('-') ? d.slice(1) : d === '0' ? d : `-${d}`));
            return;
        }
        if (k === '%') {
            sacredUi.click();
            setDisplay((d) => String(parseFloat(d) / 100));
            setFresh(true);
            return;
        }
        if ('÷×−+='.includes(k)) return applyOp(k);
        input(k);
    };

    return (
        <Panel className="p-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/50 px-4 py-4 text-right font-mono text-3xl text-white tabular-nums tracking-tight min-h-[64px] flex items-center justify-end break-all">
                {display}
            </div>
            <div className="grid grid-cols-4 gap-2 flex-1">
                {keys.flat().map((k) => {
                    const wide = k === '0';
                    const opish = '÷×−+=C±%'.includes(k);
                    return (
                        <button
                            key={k + (k === '0' ? 'z' : '')}
                            type="button"
                            onClick={() => onKey(k)}
                            className={`min-h-[48px] rounded-xl border text-lg font-medium transition active:scale-95 ${
                                wide ? 'col-span-2' : ''
                            } ${
                                opish
                                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                                    : 'border-white/10 bg-white/[0.06] text-white hover:bg-white/10'
                            }`}
                        >
                            {k}
                        </button>
                    );
                })}
            </div>
        </Panel>
    );
}

/* ─── Notepad ────────────────────────────────────────────── */

export function NotepadApp() {
    const [text, setText] = useState(() => {
        try {
            return localStorage.getItem('truthos_notepad') || 'Truth.OS Notepad\n\n';
        } catch {
            return '';
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('truthos_notepad', text);
        } catch {
            /* */
        }
    }, [text]);

    return (
        <Panel>
            <div className="shrink-0 px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Notepad</p>
                <button
                    type="button"
                    onClick={() => {
                        setText('');
                        sacredUi.click();
                    }}
                    className="text-[10px] text-white/50 hover:text-white"
                >
                    Clear
                </button>
            </div>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 w-full resize-none bg-zinc-950 text-zinc-100 p-4 font-mono text-sm outline-none min-h-[240px]"
                spellCheck={false}
            />
        </Panel>
    );
}

/* ─── Paint ──────────────────────────────────────────────── */

export function PaintApp() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const [color, setColor] = useState('#34d399');
    const [size, setSize] = useState(4);

    useEffect(() => {
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#111318';
        ctx.fillRect(0, 0, c.width, c.height);
    }, []);

    const pos = (e: React.PointerEvent) => {
        const c = canvasRef.current!;
        const r = c.getBoundingClientRect();
        return {
            x: ((e.clientX - r.left) / r.width) * c.width,
            y: ((e.clientY - r.top) / r.height) * c.height,
        };
    };

    const down = (e: React.PointerEvent) => {
        drawing.current = true;
        const c = canvasRef.current;
        const ctx = c?.getContext('2d');
        if (!ctx || !c) return;
        const p = pos(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        c.setPointerCapture(e.pointerId);
    };

    const move = (e: React.PointerEvent) => {
        if (!drawing.current) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const p = pos(e);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    };

    const up = () => {
        drawing.current = false;
    };

    const clear = () => {
        const c = canvasRef.current;
        const ctx = c?.getContext('2d');
        if (!ctx || !c) return;
        ctx.fillStyle = '#111318';
        ctx.fillRect(0, 0, c.width, c.height);
        sacredUi.click();
    };

    const saveToFs = () => {
        const c = canvasRef.current;
        if (!c) return;
        const data = c.toDataURL('image/png');
        const nodes = loadFs();
        const file: VNode = {
            id: uid(),
            name: `Drawing-${new Date().toISOString().slice(0, 16).replace('T', '_')}.png`,
            type: 'file',
            parentId: 'pics',
            kind: 'png',
            content: data,
            updatedAt: Date.now(),
        };
        nodes.push(file);
        saveFs(nodes);
        sacredUi.access();
    };

    const colors = ['#34d399', '#22d3ee', '#fbbf24', '#f472b6', '#ffffff', '#000000', '#ef4444', '#a78bfa'];

    return (
        <Panel>
            <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-b border-white/10">
                {colors.map((c) => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => {
                            setColor(c);
                            sacredUi.click();
                        }}
                        className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-white/20'}`}
                        style={{ background: c }}
                    />
                ))}
                <label className="flex items-center gap-2 text-[10px] text-white/50 ml-2">
                    Size
                    <input
                        type="range"
                        min={1}
                        max={24}
                        value={size}
                        onChange={(e) => setSize(Number(e.target.value))}
                        className="w-20 accent-emerald-400"
                    />
                </label>
                <button type="button" onClick={clear} className="ml-auto text-[10px] uppercase tracking-widest text-white/50 hover:text-white px-2 py-1">
                    Clear
                </button>
                <button
                    type="button"
                    onClick={saveToFs}
                    className="text-[10px] uppercase tracking-widest text-emerald-300/90 hover:text-emerald-200 px-2 py-1 border border-emerald-500/30 rounded-lg"
                >
                    Save to Pictures
                </button>
            </div>
            <div className="flex-1 min-h-0 p-2">
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={400}
                    className="w-full h-full max-h-[360px] rounded-xl border border-white/10 touch-none cursor-crosshair bg-[#111318]"
                    onPointerDown={down}
                    onPointerMove={move}
                    onPointerUp={up}
                    onPointerLeave={up}
                />
            </div>
        </Panel>
    );
}

/* ─── File Explorer ──────────────────────────────────────── */

export function FileExplorerApp() {
    const [nodes, setNodes] = useState<VNode[]>(() => loadFs());
    const [cwd, setCwd] = useState('root');
    const [selected, setSelected] = useState<string | null>(null);
    const [clipboard, setClipboard] = useState<{ id: string; mode: 'cut' | 'copy' } | null>(null);
    const [preview, setPreview] = useState<VNode | null>(null);
    const [renameId, setRenameId] = useState<string | null>(null);
    const [renameVal, setRenameVal] = useState('');

    const persist = useCallback((next: VNode[]) => {
        setNodes(next);
        saveFs(next);
    }, []);

    const children = useMemo(
        () => nodes.filter((n) => n.parentId === cwd).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1)),
        [nodes, cwd],
    );

    const path = useMemo(() => {
        const parts: VNode[] = [];
        let id: string | null = cwd;
        while (id) {
            const n = nodes.find((x) => x.id === id);
            if (!n) break;
            parts.unshift(n);
            id = n.parentId;
        }
        return parts;
    }, [nodes, cwd]);

    const createFolder = () => {
        const name = prompt('Folder name', 'New Folder');
        if (!name?.trim()) return;
        const n: VNode = { id: uid(), name: name.trim(), type: 'folder', parentId: cwd, updatedAt: Date.now() };
        persist([...nodes, n]);
        sacredUi.click();
    };

    const createFile = () => {
        const name = prompt('File name', 'Note.txt');
        if (!name?.trim()) return;
        const n: VNode = {
            id: uid(),
            name: name.trim().endsWith('.txt') ? name.trim() : `${name.trim()}.txt`,
            type: 'file',
            parentId: cwd,
            kind: 'txt',
            content: '',
            updatedAt: Date.now(),
        };
        persist([...nodes, n]);
        sacredUi.click();
    };

    const removeSelected = () => {
        if (!selected || selected === 'root') return;
        if (!confirm('Delete selected item and its contents?')) return;
        const kill = new Set<string>();
        const walk = (id: string) => {
            kill.add(id);
            nodes.filter((n) => n.parentId === id).forEach((c) => walk(c.id));
        };
        walk(selected);
        persist(nodes.filter((n) => !kill.has(n.id)));
        setSelected(null);
        setPreview(null);
        sacredUi.click();
    };

    const cut = () => {
        if (!selected || selected === 'root') return;
        setClipboard({ id: selected, mode: 'cut' });
        sacredUi.click();
    };

    const copy = () => {
        if (!selected || selected === 'root') return;
        setClipboard({ id: selected, mode: 'copy' });
        sacredUi.click();
    };

    const paste = () => {
        if (!clipboard) return;
        const src = nodes.find((n) => n.id === clipboard.id);
        if (!src) return;
        // prevent paste into self
        if (src.type === 'folder') {
            let p: string | null = cwd;
            while (p) {
                if (p === src.id) return;
                p = nodes.find((n) => n.id === p)?.parentId ?? null;
            }
        }
        if (clipboard.mode === 'cut') {
            persist(nodes.map((n) => (n.id === src.id ? { ...n, parentId: cwd, updatedAt: Date.now() } : n)));
            setClipboard(null);
        } else {
            const clone = (node: VNode, parentId: string | null): VNode[] => {
                const nid = uid();
                const self: VNode = { ...node, id: nid, parentId, updatedAt: Date.now(), name: node.parentId === src.parentId ? `${node.name} copy` : node.name };
                const kids = nodes.filter((n) => n.parentId === node.id).flatMap((k) => clone(k, nid));
                return [self, ...kids];
            };
            persist([...nodes, ...clone(src, cwd)]);
        }
        sacredUi.access();
    };

    const commitRename = () => {
        if (!renameId || !renameVal.trim()) {
            setRenameId(null);
            return;
        }
        persist(nodes.map((n) => (n.id === renameId ? { ...n, name: renameVal.trim(), updatedAt: Date.now() } : n)));
        setRenameId(null);
        sacredUi.click();
    };

    return (
        <Panel>
            <div className="shrink-0 flex flex-wrap items-center gap-1 px-2 py-2 border-b border-white/10 bg-black/40">
                <button type="button" disabled={cwd === 'root'} onClick={() => setCwd(path[path.length - 2]?.id || 'root')} className="px-2 py-1.5 rounded-lg text-[11px] border border-white/10 hover:bg-white/5 disabled:opacity-30">
                    ↑ Up
                </button>
                <div className="flex-1 flex items-center gap-1 overflow-x-auto text-[11px] font-mono text-white/50 px-1 min-w-0">
                    {path.map((p, i) => (
                        <button key={p.id} type="button" onClick={() => setCwd(p.id)} className="hover:text-emerald-300 shrink-0">
                            {i > 0 && <span className="text-white/20 mx-0.5">/</span>}
                            {p.name}
                        </button>
                    ))}
                </div>
            </div>
            <div className="shrink-0 flex flex-wrap gap-1 px-2 py-2 border-b border-white/8">
                {[
                    ['New folder', createFolder],
                    ['New file', createFile],
                    ['Cut', cut],
                    ['Copy', copy],
                    ['Paste', paste],
                    ['Rename', () => {
                        const n = nodes.find((x) => x.id === selected);
                        if (!n || n.id === 'root') return;
                        setRenameId(n.id);
                        setRenameVal(n.name);
                    }],
                    ['Delete', removeSelected],
                ].map(([label, fn]) => (
                    <button
                        key={label as string}
                        type="button"
                        onClick={fn as () => void}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider border border-white/10 text-white/60 hover:bg-white/5 hover:text-white min-h-[36px]"
                    >
                        {label as string}
                    </button>
                ))}
                {clipboard && (
                    <span className="text-[9px] text-amber-400/80 self-center ml-1 font-mono">
                        {clipboard.mode}: clipboard
                    </span>
                )}
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-5">
                <ul className="sm:col-span-3 overflow-y-auto p-2 space-y-0.5 border-r border-white/8">
                    {children.length === 0 && (
                        <li className="text-xs text-zinc-600 p-3 font-mono">Empty folder</li>
                    )}
                    {children.map((n) => (
                        <li key={n.id}>
                            {renameId === n.id ? (
                                <input
                                    autoFocus
                                    value={renameVal}
                                    onChange={(e) => setRenameVal(e.target.value)}
                                    onBlur={commitRename}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitRename();
                                        if (e.key === 'Escape') setRenameId(null);
                                    }}
                                    className="w-full bg-black border border-emerald-500/40 rounded-lg px-2 py-1.5 text-sm text-white"
                                />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelected(n.id);
                                        if (n.type === 'file') setPreview(n);
                                        else setPreview(null);
                                    }}
                                    onDoubleClick={() => {
                                        if (n.type === 'folder') setCwd(n.id);
                                        else setPreview(n);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm ${
                                        selected === n.id ? 'bg-emerald-500/15 border border-emerald-400/30' : 'border border-transparent hover:bg-white/5'
                                    }`}
                                >
                                    <span className="text-base w-6 text-center">{n.type === 'folder' ? '📁' : n.kind === 'png' ? '🖼' : '📄'}</span>
                                    <span className="truncate flex-1">{n.name}</span>
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
                <div className="sm:col-span-2 p-3 overflow-y-auto text-xs text-zinc-400 border-t sm:border-t-0">
                    {!preview && <p className="font-mono text-zinc-600">Select a file to preview. Double-click folders to open. Cut/Copy then Paste to move or duplicate.</p>}
                    {preview?.kind === 'png' && preview.content && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview.content} alt={preview.name} className="w-full rounded-lg border border-white/10" />
                    )}
                    {preview && preview.kind !== 'png' && (
                        <pre className="whitespace-pre-wrap font-mono text-[11px] text-zinc-300 bg-black/40 rounded-lg p-3 border border-white/8 max-h-64 overflow-auto">
                            {preview.content || '(empty)'}
                        </pre>
                    )}
                </div>
            </div>
        </Panel>
    );
}
