'use client';

import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { Hexagon, Plus } from 'lucide-react';

export default function WorkspacesSidebar() {
    const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useArchiveStore();

    return (
        <div className="w-[72px] min-w-[72px] h-full bg-[#1e1f22] flex flex-col items-center py-3 gap-2 overflow-y-auto no-scrollbar pt-4 z-20 shrink-0">
            {/* Special Home/DMs Button */}
            <button 
                onClick={() => setActiveWorkspaceId(null)}
                className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center relative group
                ${activeWorkspaceId === null ? 'bg-[#5865F2] text-white rounded-[16px]' : 'bg-[#313338] text-[#dbdee1] hover:bg-[#5865F2] hover:text-white'}
            `}>
                <Hexagon className="w-6 h-6" />
                {activeWorkspaceId === null && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-10 bg-white rounded-r-full" />}
                {activeWorkspaceId !== null && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-0 group-hover:h-5 bg-white rounded-r-full transition-all duration-200" />}
            </button>

            <div className="w-8 h-[2px] bg-[#313338] rounded-full mx-auto my-1" />

            {/* Workspaces List */}
            {workspaces.map((workspace) => (
                <button 
                    key={workspace.id}
                    onClick={() => setActiveWorkspaceId(workspace.id)}
                    className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center font-bold text-[15px] relative group border border-white/5 shadow-sm
                    ${activeWorkspaceId === workspace.id ? 'bg-[#5865F2] text-white rounded-[16px]' : 'bg-[#313338] text-[#dbdee1] hover:bg-[#5865F2] hover:text-white'}
                `}>
                    {workspace.icon_url ? (
                        <div className="w-full h-full rounded-inherit overflow-hidden">
                           <img src={workspace.icon_url} alt={workspace.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <span>{workspace.name.substring(0, 2).toUpperCase()}</span>
                    )}

                    {/* Active Indicator Line */}
                    {activeWorkspaceId === workspace.id && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-10 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />}
                    {activeWorkspaceId !== workspace.id && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-0 group-hover:h-5 bg-white rounded-r-full transition-all duration-200" />}
                </button>
            ))}

            {/* Add Server Button */}
            <button className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-[#313338] text-[#23a559] hover:bg-[#23a559] hover:text-white transition-all duration-200 flex items-center justify-center mt-2 group">
                <Plus className="w-6 h-6" />
            </button>
        </div>
    );
}
