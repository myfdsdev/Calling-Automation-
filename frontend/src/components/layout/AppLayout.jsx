import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { ApiKeysOnboarding } from '@/components/common/ApiKeysOnboarding';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="page-container">
        <Outlet />
      </main>
      <ApiKeysOnboarding />
    </div>
  );
}
