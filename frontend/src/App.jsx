import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Agents from '@/pages/Agents';
import LeadFinder from '@/pages/LeadFinder';
import Leads from '@/pages/Leads';
import Calls from '@/pages/Calls';
import Account from '@/pages/Account';
import ApiSettings from '@/pages/ApiSettings';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/lead-finder" element={<LeadFinder />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/calls" element={<Calls />} />
        <Route path="/account" element={<Account />} />
        <Route path="/api-settings" element={<ApiSettings />} />
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
