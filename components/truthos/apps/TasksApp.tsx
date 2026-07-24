'use client';

/**
 * Truth.OS Tasks — a real to-do list, not a mock.
 * Add / edit inline / complete / delete / reorder, three priorities, optional
 * due dates with overdue flagging, and All / Active / Done filters.
 *
 * Everything persists to localStorage under `truthos_tasks_v1` (versioned,
 * guarded load). Completing a task pushes one notification to the OS centre.
 */
import { useEffect, useRef, useState } from 'react';
import {
    CalendarDays,
    Check,
    ChevronDown,
    ChevronUp,
    ListTodo,
    Plus,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import { useOsSystem } from '../osSystemStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';

const STORE_KEY = 'truthos_tasks_v1';

type Priority = 'low' | 'normal' | 'high';
type Filter = 'all' | 'active' | 'done';

type Task = {
    id: string;
    text: string;
    done: boolean;
    priority: Priority;
    /** ISO `YYYY-MM-DD`, or null when undated. */
    due: string | null;
    createdAt: number;
};

const PRIORITY_META: Record<Priority, { label: string; bar: string; chip: string }> = {
    high: {
        label: 'High',
        bar: 'bg-rose-400',
        chip: 'border-rose-400/40 bg-rose-500/15 text-rose-200',
    },
    normal: {
        label: 'Normal',
        bar: 'bg-amber-400',
        chip: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
    },
    low: {
        label: 'Low',
        bar: 'bg-sky-400',
        chip: 'border-sky-400/40 bg-sky-500/15 text-sky-200',
    },
};

const PRIORITY_CYCLE: Priority[] = ['normal', 'high', 'low'];

function uid(): string {
    return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Local (not UTC) calendar day as `YYYY-MM-DD`, matching <input type="date">. */
function todayKey(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

function dueLabel(due: string): string {
    const parts = due.split('-');
    if (parts.length !== 3) return due;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (Number.isNaN(d.getTime())) return due;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function seedTasks(): Task[] {
    const now = Date.now();
    return [
        {
            id: uid(),
            text: 'Open the Music app and pick an ambient bed',
            done: false,
            priority: 'low',
            due: null,
            createdAt: now,
        },
        {
            id: uid(),
            text: 'Click a task to rename it — Enter saves, Escape cancels',
            done: false,
            priority: 'normal',
            due: null,
            createdAt: now - 1,
        },
    ];
}

function asPriority(v: unknown): Priority {
    return v === 'low' || v === 'high' ? v : 'normal';
}

function loadTasks(): Task[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORE_KEY);
        if (raw) {
            const parsed: unknown = JSON.parse(raw);
            const rows =
                parsed && typeof parsed === 'object'
                    ? (parsed as { tasks?: unknown }).tasks
                    : undefined;
            if (Array.isArray(rows)) {
                const out: Task[] = [];
                rows.forEach((row) => {
                    if (!row || typeof row !== 'object') return;
                    const r = row as Record<string, unknown>;
                    if (typeof r.text !== 'string') return;
                    out.push({
                        id: typeof r.id === 'string' && r.id ? r.id : uid(),
                        text: r.text,
                        done: r.done === true,
                        priority: asPriority(r.priority),
                        due: typeof r.due === 'string' && r.due ? r.due : null,
                        createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
                    });
                });
                return out;
            }
        }
    } catch {
        /* corrupt payload or private mode — fall through to seeds */
    }
    return seedTasks();
}

function saveTasks(tasks: Task[]) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, tasks }));
    } catch {
        /* quota / private mode — the session still works in memory */
    }
}

export function TasksApp() {
    const [tasks, setTasks] = useState<Task[]>(loadTasks);
    const [filter, setFilter] = useState<Filter>('all');
    const [draft, setDraft] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    /** Set by Escape so the input's blur doesn't commit the abandoned edit. */
    const cancelEditRef = useRef(false);
    const notify = useOsSystem((s) => s.notify);

    const today = todayKey();

    useEffect(() => {
        saveTasks(tasks);
    }, [tasks]);

    const activeCount = tasks.filter((t) => !t.done).length;
    const doneCount = tasks.length - activeCount;
    const visible = tasks.filter((t) =>
        filter === 'active' ? !t.done : filter === 'done' ? t.done : true,
    );

    const addTask = () => {
        const text = draft.trim();
        if (!text) return;
        setTasks((prev) => [
            {
                id: uid(),
                text,
                done: false,
                priority: 'normal',
                due: null,
                createdAt: Date.now(),
            },
            ...prev,
        ]);
        setDraft('');
        sacredUi.click();
    };

    const patch = (id: string, next: Partial<Task>) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...next } : t)));
    };

    const toggleDone = (task: Task) => {
        const nowDone = !task.done;
        patch(task.id, { done: nowDone });
        if (!nowDone) {
            sacredUi.click();
            return;
        }
        sacredUi.access();
        const remaining = tasks.filter((t) => !t.done && t.id !== task.id).length;
        notify({
            title: remaining === 0 ? 'List cleared' : 'Task complete',
            body:
                remaining === 0
                    ? `“${task.text}” — nothing left on the list.`
                    : `“${task.text}” · ${remaining} still active`,
            accent: 'emerald',
        });
    };

    const removeTask = (id: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        if (editingId === id) setEditingId(null);
        sacredUi.click();
    };

    const cyclePriority = (task: Task) => {
        const i = PRIORITY_CYCLE.indexOf(task.priority);
        patch(task.id, { priority: PRIORITY_CYCLE[(i + 1) % PRIORITY_CYCLE.length] });
        sacredUi.click();
    };

    /**
     * Reorder by swapping past the neighbour that is actually *visible* under the
     * current filter, so the row always moves somewhere the user can see.
     */
    const move = (id: string, dir: -1 | 1) => {
        setTasks((prev) => {
            const shown = prev.filter((t) =>
                filter === 'active' ? !t.done : filter === 'done' ? t.done : true,
            );
            const vi = shown.findIndex((t) => t.id === id);
            const neighbour = vi < 0 ? undefined : shown[vi + dir];
            if (!neighbour) return prev;
            const from = prev.findIndex((t) => t.id === id);
            const to = prev.findIndex((t) => t.id === neighbour.id);
            if (from < 0 || to < 0) return prev;
            const next = prev.slice();
            const [row] = next.splice(from, 1);
            // `to` is the neighbour's index in the pre-removal array, which lands the
            // row before it when moving up and after it when moving down.
            next.splice(to, 0, row);
            return next;
        });
        sacredUi.click();
    };

    const startEdit = (task: Task) => {
        cancelEditRef.current = false;
        setEditingId(task.id);
        setEditText(task.text);
    };

    const commitEdit = () => {
        const id = editingId;
        setEditingId(null);
        if (!id) return;
        const text = editText.trim();
        if (!text) return; // empty edit keeps the original wording
        patch(id, { text });
    };

    const clearCompleted = () => {
        setTasks((prev) => prev.filter((t) => !t.done));
        sacredUi.click();
    };

    return (
        <div className="h-full flex flex-col bg-zinc-950 text-zinc-200 min-h-[220px]">
            {/* Compose */}
            <form
                className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-black/40"
                onSubmit={(e) => {
                    e.preventDefault();
                    addTask();
                }}
            >
                <ListTodo size={15} className="text-emerald-300 shrink-0" />
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="What needs doing?"
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white placeholder:text-zinc-600 min-h-[40px]"
                    autoCapitalize="sentences"
                    autoCorrect="off"
                    spellCheck={false}
                />
                <button
                    type="submit"
                    disabled={!draft.trim()}
                    title="Add task"
                    className="shrink-0 w-10 h-10 min-w-[40px] rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 flex items-center justify-center hover:bg-emerald-500/30 disabled:opacity-30 touch-manipulation"
                >
                    <Plus size={17} />
                </button>
            </form>

            {/* Filters */}
            <div className="shrink-0 flex border-b border-white/10">
                {(
                    [
                        ['all', 'All', tasks.length],
                        ['active', 'Active', activeCount],
                        ['done', 'Done', doneCount],
                    ] as const
                ).map(([id, label, count]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => {
                            setFilter(id);
                            sacredUi.click();
                        }}
                        className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors min-h-[42px] touch-manipulation ${
                            filter === id
                                ? 'text-emerald-300 border-b-2 border-emerald-400 bg-emerald-500/5'
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        {label}
                        <span className="ml-1.5 text-[10px] text-zinc-600 tabular-nums">{count}</span>
                    </button>
                ))}
            </div>

            {/* List */}
            <ul className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
                {visible.length === 0 && (
                    <li className="px-3 py-8 text-center text-xs text-zinc-600 font-mono">
                        {tasks.length === 0
                            ? 'Nothing here yet — add your first task above.'
                            : filter === 'done'
                              ? 'No completed tasks yet.'
                              : 'All clear. Nothing active.'}
                    </li>
                )}
                {visible.map((task, vi) => {
                    const overdue = !task.done && !!task.due && task.due < today;
                    const dueToday = !task.done && task.due === today;
                    const meta = PRIORITY_META[task.priority];
                    return (
                        <li
                            key={task.id}
                            className={`rounded-xl border transition-colors ${
                                overdue
                                    ? 'border-rose-500/40 bg-rose-500/[0.07]'
                                    : 'border-white/10 bg-white/[0.03]'
                            }`}
                        >
                            <div className="flex items-start gap-2 px-2 pt-2">
                                <span
                                    className={`mt-1.5 w-1 h-7 rounded-full shrink-0 ${meta.bar} ${
                                        task.done ? 'opacity-30' : ''
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleDone(task)}
                                    title={task.done ? 'Mark as active' : 'Mark as done'}
                                    aria-pressed={task.done}
                                    className={`shrink-0 w-10 h-10 min-w-[40px] rounded-lg flex items-center justify-center border touch-manipulation transition-colors ${
                                        task.done
                                            ? 'border-emerald-400/45 bg-emerald-500/20 text-emerald-200'
                                            : 'border-white/15 text-transparent hover:border-emerald-400/40 hover:text-emerald-400/50'
                                    }`}
                                >
                                    <Check size={15} />
                                </button>

                                <div className="flex-1 min-w-0 py-1">
                                    {editingId === task.id ? (
                                        <input
                                            autoFocus
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitEdit();
                                                } else if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    cancelEditRef.current = true;
                                                    setEditingId(null);
                                                }
                                            }}
                                            onBlur={() => {
                                                if (cancelEditRef.current) {
                                                    cancelEditRef.current = false;
                                                    return;
                                                }
                                                commitEdit();
                                            }}
                                            className="w-full bg-black/60 border border-emerald-500/40 rounded-lg px-2 py-1.5 text-sm text-white outline-none"
                                            spellCheck={false}
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => startEdit(task)}
                                            title="Click to edit"
                                            className={`w-full text-left text-sm leading-snug break-words touch-manipulation ${
                                                task.done
                                                    ? 'text-zinc-600 line-through'
                                                    : 'text-white/90 hover:text-emerald-200'
                                            }`}
                                        >
                                            {task.text}
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => removeTask(task.id)}
                                    title="Delete task"
                                    className="shrink-0 w-10 h-10 min-w-[40px] rounded-lg flex items-center justify-center text-zinc-600 hover:text-rose-300 hover:bg-rose-500/10 touch-manipulation"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap px-2 pb-2 pt-1.5 pl-[26px]">
                                <button
                                    type="button"
                                    onClick={() => cyclePriority(task)}
                                    title="Change priority"
                                    className={`px-2.5 h-9 min-h-[36px] rounded-lg border text-[10px] font-semibold uppercase tracking-wider touch-manipulation ${meta.chip}`}
                                >
                                    {meta.label}
                                </button>

                                <label
                                    className={`flex items-center gap-1 h-9 min-h-[36px] px-1.5 rounded-lg border text-[10px] [color-scheme:dark] ${
                                        overdue
                                            ? 'border-rose-400/45 bg-rose-500/10 text-rose-200'
                                            : dueToday
                                              ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                                              : 'border-white/10 bg-black/40 text-zinc-400'
                                    }`}
                                    title={task.due ? `Due ${dueLabel(task.due)}` : 'Set a due date'}
                                >
                                    {overdue ? <TriangleAlert size={12} /> : <CalendarDays size={12} />}
                                    <input
                                        type="date"
                                        value={task.due ?? ''}
                                        onChange={(e) =>
                                            patch(task.id, { due: e.target.value || null })
                                        }
                                        className="bg-transparent outline-none text-[10px] w-[104px] cursor-pointer"
                                    />
                                </label>

                                {overdue && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                                        Overdue
                                    </span>
                                )}
                                {dueToday && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                                        Today
                                    </span>
                                )}

                                <span className="flex-1" />

                                <button
                                    type="button"
                                    onClick={() => move(task.id, -1)}
                                    disabled={vi === 0}
                                    title="Move up"
                                    className="w-9 h-9 min-w-[36px] rounded-lg border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-25 flex items-center justify-center touch-manipulation"
                                >
                                    <ChevronUp size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => move(task.id, 1)}
                                    disabled={vi >= visible.length - 1}
                                    title="Move down"
                                    className="w-9 h-9 min-w-[36px] rounded-lg border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-25 flex items-center justify-center touch-manipulation"
                                >
                                    <ChevronDown size={14} />
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {/* Summary */}
            <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-t border-white/10 bg-black/40">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono truncate flex-1 min-w-0">
                    {activeCount} active · {doneCount} done
                </p>
                <button
                    type="button"
                    onClick={clearCompleted}
                    disabled={doneCount === 0}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-white/15 text-[10px] uppercase tracking-wider text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-30 min-h-[36px] touch-manipulation"
                >
                    Clear completed
                </button>
            </div>
        </div>
    );
}
