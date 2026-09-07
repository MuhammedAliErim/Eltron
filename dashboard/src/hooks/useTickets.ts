import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { cacheGet, cacheSet, cacheInvalidatePrefix, buildCacheKey } from '../lib/cache';
import type { Ticket, Pagination } from '../lib/types';

export function useTickets(guildId: string | null) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchTickets = useCallback(async (params?: { page?: number; pageSize?: number; status?: string }) => {
    if (!guildId) return;
    const cacheKey = buildCacheKey(guildId, 'tickets', JSON.stringify(params));
    const cached = cacheGet<{ tickets: Ticket[]; pagination: Pagination }>(cacheKey);
    if (cached) {
      setTickets(cached.tickets);
      setPagination(cached.pagination);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.tickets.list(guildId, params);
      const data = res.data as Ticket[];
      setTickets(data);
      setPagination(res.pagination);
      cacheSet(cacheKey, { tickets: data, pagination: res.pagination });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const getTicket = useCallback(async (ticketId: number) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.tickets.get(guildId, ticketId);
      setCurrentTicket(res.data as Ticket);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch ticket');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    cacheInvalidatePrefix(`${guildId}:tickets`);
    fetchTickets();
  }, [guildId, fetchTickets]);

  return { tickets, currentTicket, loading, error, pagination, fetchTickets, getTicket, refetch };
}
