import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="page-container">
        <Outlet />
      </main>
    </div>
  );
}
