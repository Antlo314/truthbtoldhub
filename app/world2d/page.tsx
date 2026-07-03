import { redirect } from 'next/navigation';

// The 2D game has been retired. Its code is archived in ArchivedWorld2D.tsx
// (kept in the repo, unrouted). All traffic now flows to the 3D Hut at /world.
export default function World2DRetired() {
    redirect('/world');
}
