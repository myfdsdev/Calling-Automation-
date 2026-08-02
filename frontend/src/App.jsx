import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { RequireFeature } from '@/components/layout/RequireFeature';
import { AppLayout } from '@/components/layout/AppLayout';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import RegisterAdmin from '@/pages/RegisterAdmin';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import Agents from '@/pages/Agents';
import LeadFinder from '@/pages/LeadFinder';
import Leads from '@/pages/Leads';
import Calls from '@/pages/Calls';
import Account from '@/pages/Account';
import ApiSettings from '@/pages/ApiSettings';
import Workspace from '@/pages/Workspace';
import AcceptInvite from '@/pages/AcceptInvite';
import JoinWorkspace from '@/pages/JoinWorkspace';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register-admin" element={<RegisterAdmin />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/join/:token" element={<JoinWorkspace />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/agents"
          element={
            <RequireFeature feature="agents">
              <Agents />
            </RequireFeature>
          }
        />
        <Route
          path="/lead-finder"
          element={
            <RequireFeature feature="lead_finder">
              <LeadFinder />
            </RequireFeature>
          }
        />
        <Route
          path="/leads"
          element={
            <RequireFeature feature="leads">
              <Leads />
            </RequireFeature>
          }
        />
        <Route
          path="/calls"
          element={
            <RequireFeature feature="calls">
              <Calls />
            </RequireFeature>
          }
        />
        <Route path="/account" element={<Account />} />
        <Route path="/api-settings" element={<ApiSettings />} />
        <Route
          path="/workspace"
          element={
            <RequireFeature ownerOnly>
              <Workspace />
            </RequireFeature>
          }
        />
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
