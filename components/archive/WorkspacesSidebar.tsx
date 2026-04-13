'use client';

import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { Hexagon, Plus } from 'lucide-react';

export default function WorkspacesSidebar() {
    const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useArchiveStore();

    return (
        <div className="w-[72px] min-w-[72px] h-full bg-zinc-950 flex flex-col items-center py-4 gap-2 overflow-y-auto no-scrollbar pt-4 z-20 shrink-0 border-r border-white/5 shadow-2xl">
            {/* Special Home/DMs Button */}
            <button 
                id="archive-home-btn"
                onClick={() => setActiveWorkspaceId(null)}
                className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-300 flex items-center justify-center relative group
                ${activeWorkspaceId === null ? 'bg-orange-600 text-white rounded-[16px] shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 'bg-zinc-800 text-zinc-500 hover:bg-orange-600 hover:text-white'}
            `}>
                <Hexagon className="w-6 h-6" />
                {activeWorkspaceId === null && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-10 bg-orange-500 rounded-r-full shadow-[0_0_10px_rgba(234,88,12,0.6)]" />}
                {activeWorkspaceId !== null && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-0 group-hover:h-5 bg-orange-500 rounded-r-full transition-all duration-200" />}
            </button>

            <div className="w-8 h-[1px] bg-white/10 rounded-full mx-auto my-1" />

            {/* Workspaces List */}
                <button 
                    key={workspace.id}
                    onClick={() => setActiveWorkspaceId(workspace.id)}
                    className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-300 flex items-center justify-center font-bold text-[15px] relative group border border-white/5 shadow-sm
                    ${activeWorkspaceId === workspace.id ? 'bg-orange-600 text-white rounded-[16px] shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 'bg-zinc-800 text-zinc-500 hover:bg-orange-600 hover:text-white'}
                `}>
                    {workspace.icon_url ? (
                        <div className="w-full h-full rounded-inherit overflow-hidden">
                           <img src={workspace.icon_url} alt={workspace.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <span>{workspace.name.substring(0, 2).toUpperCase()}</span>
                    )}

                    {/* Active Indicator Line */}
                    {activeWorkspaceId === workspace.id && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-10 bg-orange-500 rounded-r-full shadow-[0_0_10px_rgba(234,88,12,0.6)]" />}
                    {activeWorkspaceId !== workspace.id && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-0 group-hover:h-5 bg-orange-500 rounded-r-full transition-all duration-200" />}
                </button>
            ))}

            {/* Add Server Button */}
            <button title="Add Sector" className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-zinc-800 text-orange-500/50 hover:bg-orange-600 hover:text-white transition-all duration-300 flex items-center justify-center mt-2 group border border-white/5">
                <Plus className="w-6 h-6" />
            </button>
        </div>
    );
}
