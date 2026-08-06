'use client';

/**
 * Classic desktop utilities: Calculator, Paint, Notepad, File Explorer.
 * Virtual FS in localStorage — create/rename/move folders & files.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brush, Eraser, Minus, Square, Circle, PaintBucket, Undo2, Redo2 } from 'lucide-react';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { useTruthOs, type OsAppId } from '../truthOsStore';

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

/**
 * Notepad — a scratchpad by default, or a real editor bound to a file in the
 * virtual file system when Files (or the command palette) opens a document.
 */
export function NotepadApp({ nodeId, name }: { nodeId?: string; name?: string } = {}) {
    const bound = !!nodeId;
    const [text, setText] = useState(() => {
        try {
            if (nodeId) {
                const node = loadFs().find((n) => n.id === nodeId);
                return node?.content ?? '';
            }
            return localStorage.getItem('truthos_notepad') || 'Truth.OS Notepad\n\n';
        } catch {
            return '';
        }
    });
    const [saved, setSaved] = useState(true);

    useEffect(() => {
        setSaved(false);
        const t = setTimeout(() => {
            try {
                if (nodeId) {
                    const nodes = loadFs();
                    const i = nodes.findIndex((n) => n.id === nodeId);
                    if (i >= 0) {
                        nodes[i] = { ...nodes[i], content: text, updatedAt: Date.now() };
                        saveFs(nodes);
                    }
                } else {
                    localStorage.setItem('truthos_notepad', text);
                }
            } catch {
                /* */
            }
            setSaved(true);
        }, 400);
        return () => clearTimeout(t);
    }, [text, nodeId]);

    return (
        <Panel>
            <div className="shrink-0 px-3 py-2 border-b border-white/10 flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono truncate">
                    {bound ? name || 'Document' : 'Notepad'}
                </p>
                <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[9px] font-mono ${saved ? 'text-emerald-400/70' : 'text-amber-400/80'}`}>
                        {saved ? 'saved' : 'saving…'}
                    </span>
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

type PaintTool = 'brush' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'fill';

const PAINT_BG = '#111318';
const UNDO_CAP = 25;

export function PaintApp() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawing = useRef(false);
    const startPt = useRef<{ x: number; y: number } | null>(null);
    const shapeSnapshot = useRef<ImageData | null>(null);
    const undoStack = useRef<ImageData[]>([]);
    const redoStack = useRef<ImageData[]>([]);
    const [tool, setTool] = useState<PaintTool>('brush');
    const [color, setColor] = useState('#34d399');
    const [size, setSize] = useState(4);

    const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

    // Responsive canvas: track the container, preserve pixels across resizes.
    useEffect(() => {
        const c = canvasRef.current;
        const wrap = containerRef.current;
        if (!c || !wrap) return;

        const applySize = (w: number, h: number) => {
            const nw = Math.max(1, Math.floor(w));
            const nh = Math.max(1, Math.floor(h));
            if (c.width === nw && c.height === nh) return;
            const off = document.createElement('canvas');
            off.width = Math.max(1, c.width);
            off.height = Math.max(1, c.height);
            off.getContext('2d')?.drawImage(c, 0, 0);
            c.width = nw;
            c.height = nh;
            const ctx = c.getContext('2d');
            if (!ctx) return;
            ctx.fillStyle = PAINT_BG;
            ctx.fillRect(0, 0, nw, nh);
            ctx.drawImage(off, 0, 0);
        };

        const r = wrap.getBoundingClientRect();
        applySize(r.width, r.height);
        const ro = new ResizeObserver((entries) => {
            for (const en of entries) applySize(en.contentRect.width, en.contentRect.height);
        });
        ro.observe(wrap);
        return () => ro.disconnect();
    }, []);

    const pos = (e: React.PointerEvent) => {
        const c = canvasRef.current!;
        const r = c.getBoundingClientRect();
        return {
            x: ((e.clientX - r.left) / r.width) * c.width,
            y: ((e.clientY - r.top) / r.height) * c.height,
        };
    };

    const pushUndo = () => {
        const c = canvasRef.current;
        const ctx = getCtx();
        if (!c || !ctx) return;
        undoStack.current.push(ctx.getImageData(0, 0, c.width, c.height));
        if (undoStack.current.length > UNDO_CAP) undoStack.current.shift();
        redoStack.current = [];
    };

    const restore = (img: ImageData) => {
        const c = canvasRef.current;
        const ctx = getCtx();
        if (!c || !ctx) return;
        ctx.fillStyle = PAINT_BG;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.putImageData(img, 0, 0);
    };

    const undo = useCallback(() => {
        const c = canvasRef.current;
        const ctx = c?.getContext('2d');
        if (!c || !ctx) return;
        const prev = undoStack.current.pop();
        if (!prev) return;
        redoStack.current.push(ctx.getImageData(0, 0, c.width, c.height));
        if (redoStack.current.length > UNDO_CAP) redoStack.current.shift();
        ctx.fillStyle = PAINT_BG;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.putImageData(prev, 0, 0);
        sacredUi.click();
    }, []);

    const redo = useCallback(() => {
        const c = canvasRef.current;
        const ctx = c?.getContext('2d');
        if (!c || !ctx) return;
        const next = redoStack.current.pop();
        if (!next) return;
        undoStack.current.push(ctx.getImageData(0, 0, c.width, c.height));
        if (undoStack.current.length > UNDO_CAP) undoStack.current.shift();
        ctx.fillStyle = PAINT_BG;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.putImageData(next, 0, 0);
        sacredUi.click();
    }, []);

    // Undo/redo shortcuts — scoped to this app: only fires while focus is inside the root div.
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!(e.ctrlKey || e.metaKey)) return;
        if (e.key.toLowerCase() !== 'z') return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
    };

    const floodFill = (sx: number, sy: number, fill: string) => {
        const c = canvasRef.current;
        const ctx = getCtx();
        if (!c || !ctx) return;
        const w = c.width;
        const h = c.height;
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return;
        // Resolve the fill color to raw RGBA bytes via a 1×1 scratch canvas.
        const scratch = document.createElement('canvas');
        scratch.width = 1;
        scratch.height = 1;
        const sctx = scratch.getContext('2d');
        if (!sctx) return;
        sctx.fillStyle = fill;
        sctx.fillRect(0, 0, 1, 1);
        const fillBytes = sctx.getImageData(0, 0, 1, 1).data;
        const fr = fillBytes[0];
        const fg = fillBytes[1];
        const fb = fillBytes[2];
        const img = ctx.getImageData(0, 0, w, h);
        const px = new Uint32Array(img.data.buffer);
        const repl = (255 << 24) | (fb << 16) | (fg << 8) | fr;
        const target = px[y0 * w + x0];
        if (target === repl) return;
        // Scanline flood fill, tolerance 0, bounded by the canvas.
        const stack: number[] = [x0, y0];
        while (stack.length) {
            const y = stack.pop()!;
            const x = stack.pop()!;
            let xl = x;
            while (xl >= 0 && px[y * w + xl] === target) xl -= 1;
            xl += 1;
            let spanUp = false;
            let spanDown = false;
            let xr = xl;
            while (xr < w && px[y * w + xr] === target) {
                px[y * w + xr] = repl;
                if (y > 0) {
                    const up = px[(y - 1) * w + xr] === target;
                    if (up && !spanUp) {
                        stack.push(xr, y - 1);
                        spanUp = true;
                    } else if (!up) spanUp = false;
                }
                if (y < h - 1) {
                    const dn = px[(y + 1) * w + xr] === target;
                    if (dn && !spanDown) {
                        stack.push(xr, y + 1);
                        spanDown = true;
                    } else if (!dn) spanDown = false;
                }
                xr += 1;
            }
        }
        ctx.putImageData(img, 0, 0);
    };

    const drawShape = (ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if (tool === 'line') {
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
        } else if (tool === 'rect') {
            ctx.rect(Math.min(from.x, to.x), Math.min(from.y, to.y), Math.abs(to.x - from.x), Math.abs(to.y - from.y));
        } else {
            ctx.ellipse(
                (from.x + to.x) / 2,
                (from.y + to.y) / 2,
                Math.abs(to.x - from.x) / 2,
                Math.abs(to.y - from.y) / 2,
                0,
                0,
                Math.PI * 2,
            );
        }
        ctx.stroke();
    };

    const down = (e: React.PointerEvent) => {
        const c = canvasRef.current;
        const ctx = c?.getContext('2d');
        if (!ctx || !c) return;
        const p = pos(e);
        pushUndo();
        if (tool === 'fill') {
            floodFill(p.x, p.y, color);
            sacredUi.click();
            return;
        }
        drawing.current = true;
        startPt.current = p;
        if (tool === 'brush' || tool === 'eraser') {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
        } else {
            shapeSnapshot.current = ctx.getImageData(0, 0, c.width, c.height);
        }
        c.setPointerCapture(e.pointerId);
    };

    const move = (e: React.PointerEvent) => {
        if (!drawing.current) return;
        const ctx = getCtx();
        if (!ctx) return;
        const p = pos(e);
        if (tool === 'brush' || tool === 'eraser') {
            ctx.strokeStyle = tool === 'eraser' ? PAINT_BG : color;
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
        } else if (shapeSnapshot.current && startPt.current) {
            // Live preview: restore the pre-drag snapshot, then draw the shape.
            restore(shapeSnapshot.current);
            drawShape(ctx, startPt.current, p);
        }
    };

    const up = () => {
        drawing.current = false;
        startPt.current = null;
        shapeSnapshot.current = null;
    };

    const clear = () => {
        const c = canvasRef.current;
        const ctx = c?.getContext('2d');
        if (!ctx || !c) return;
        pushUndo();
        ctx.fillStyle = PAINT_BG;
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

    const tools: { id: PaintTool; icon: typeof Brush; label: string }[] = [
        { id: 'brush', icon: Brush, label: 'Brush' },
        { id: 'eraser', icon: Eraser, label: 'Eraser' },
        { id: 'line', icon: Minus, label: 'Line' },
        { id: 'rect', icon: Square, label: 'Rectangle' },
        { id: 'ellipse', icon: Circle, label: 'Ellipse' },
        { id: 'fill', icon: PaintBucket, label: 'Fill' },
    ];

    return (
        <Panel>
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
            <div className="h-full flex flex-col outline-none" tabIndex={0} onKeyDown={onKeyDown}>
                <div className="shrink-0 flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-white/10">
                    {tools.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            type="button"
                            title={label}
                            aria-label={label}
                            onClick={() => {
                                setTool(id);
                                sacredUi.click();
                            }}
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                                tool === id
                                    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                                    : 'border-white/15 text-white/50 hover:text-white hover:border-white/30'
                            }`}
                        >
                            <Icon size={14} />
                        </button>
                    ))}
                    <span className="w-px h-5 bg-white/10 mx-1" />
                    <button
                        type="button"
                        title="Undo (Ctrl+Z)"
                        aria-label="Undo"
                        onClick={undo}
                        className="w-7 h-7 rounded-lg border border-white/15 text-white/50 hover:text-white hover:border-white/30 flex items-center justify-center"
                    >
                        <Undo2 size={14} />
                    </button>
                    <button
                        type="button"
                        title="Redo (Ctrl+Shift+Z)"
                        aria-label="Redo"
                        onClick={redo}
                        className="w-7 h-7 rounded-lg border border-white/15 text-white/50 hover:text-white hover:border-white/30 flex items-center justify-center"
                    >
                        <Redo2 size={14} />
                    </button>
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
                    <input
                        type="color"
                        value={color}
                        title="Custom color"
                        aria-label="Custom color"
                        onChange={(e) => setColor(e.target.value)}
                        className="w-7 h-7 rounded-full border-2 border-white/20 bg-transparent cursor-pointer p-0"
                    />
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
                </div>
                <div className="flex-1 min-h-0 p-2">
                    <div ref={containerRef} className="relative w-full h-full rounded-xl border border-white/10 bg-[#111318] overflow-hidden">
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 touch-none cursor-crosshair"
                            onPointerDown={down}
                            onPointerMove={move}
                            onPointerUp={up}
                            onPointerLeave={up}
                        />
                    </div>
                </div>
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
                    {preview && (
                        <div className="flex items-center gap-2 mb-2.5">
                            <p className="text-[11px] text-white/80 font-medium truncate flex-1">{preview.name}</p>
                            <button
                                type="button"
                                onClick={() => {
                                    const target: OsAppId = preview.kind === 'png' ? 'photos' : 'notepad';
                                    useTruthOs.getState().openApp(target, {
                                        payload: { nodeId: preview.id, name: preview.name },
                                    });
                                    sacredUi.click();
                                }}
                                className="shrink-0 px-2.5 py-1.5 rounded-lg border border-sky-400/35 bg-sky-500/15 text-sky-100 text-[10px] font-semibold hover:bg-sky-500/25 min-h-[32px] touch-manipulation"
                            >
                                Open in {preview.kind === 'png' ? 'Photos' : 'Notepad'}
                            </button>
                        </div>
                    )}
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
