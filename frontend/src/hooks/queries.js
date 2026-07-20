import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* --------------------------- Dashboard --------------------------- */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => (await api.get('/dashboard/stats')).data.stats,
  });
}
export function useRecentLeads() {
  return useQuery({
    queryKey: ['dashboard', 'recent-leads'],
    queryFn: async () => (await api.get('/dashboard/recent-leads')).data.leads,
  });
}
export function useRecentCalls() {
  return useQuery({
    queryKey: ['dashboard', 'recent-calls'],
    queryFn: async () => (await api.get('/dashboard/recent-calls')).data.calls,
  });
}
export function useActiveAutomation(poll = false) {
  return useQuery({
    queryKey: ['dashboard', 'active-automation'],
    queryFn: async () => (await api.get('/dashboard/active-automation')).data.automation,
    refetchInterval: poll ? 6000 : false,
  });
}

/* ---------------------------- Agents ----------------------------- */
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => (await api.get('/agents')).data.agents,
  });
}

export function useAgentMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['agents'] });

  const create = useMutation({
    mutationFn: async (payload) => (await api.post('/agents', payload)).data.agent,
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.put(`/agents/${id}`, payload)).data.agent,
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id) => (await api.delete(`/agents/${id}`)).data,
    onSuccess: invalidate,
  });
  const generateScript = useMutation({
    mutationFn: async (payload) => (await api.post('/agents/generate-script', payload)).data.script,
  });
  const test = useMutation({
    mutationFn: async (id) => (await api.post(`/agents/${id}/test`)).data.preview,
  });
  return { create, update, remove, generateScript, test };
}

/* ----------------------------- Leads ----------------------------- */
export function useLeads(filters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => (await api.get('/leads', { params })).data,
  });
}
export function useLead(id) {
  return useQuery({
    queryKey: ['leads', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get(`/leads/${id}`)).data.lead,
  });
}
export function useLeadMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['leads'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const update = useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.put(`/leads/${id}`, payload)).data.lead,
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id) => (await api.delete(`/leads/${id}`)).data,
    onSuccess: invalidate,
  });
  const selectBest = useMutation({
    mutationFn: async (payload) => (await api.post('/leads/select-best', payload)).data,
    onSuccess: invalidate,
  });
  return { update, remove, selectBest };
}

/* -------------------------- Automations -------------------------- */
export function useAutomations() {
  return useQuery({
    queryKey: ['automations'],
    queryFn: async () => (await api.get('/automations')).data.automations,
  });
}
export function useAutomationControls() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['automations'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['calls'] });
  };
  const mk = (verb) =>
    useMutation({
      mutationFn: async (id) => (await api.post(`/automations/${id}/${verb}`)).data.automation,
      onSuccess: invalidate,
    });
  return { start: mk('start'), pause: mk('pause'), resume: mk('resume'), stop: mk('stop') };
}

/* ----------------------------- Calls ----------------------------- */
export function useCalls(filters = {}, poll = false) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  return useQuery({
    queryKey: ['calls', params],
    queryFn: async () => (await api.get('/calls', { params })).data,
    refetchInterval: poll ? 6000 : false,
  });
}
