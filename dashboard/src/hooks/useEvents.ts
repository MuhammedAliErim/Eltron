import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { cacheGet, cacheSet, cacheInvalidatePrefix, buildCacheKey } from '../lib/cache';
import type { Event, EventParticipant, EventWinner, Pagination } from '../lib/types';

export function useEvents(guildId: string | null) {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<(Event & { participants: EventParticipant[]; winners: EventWinner[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchEvents = useCallback(async (params?: { page?: number; pageSize?: number; status?: string }) => {
    if (!guildId) return;
    const cacheKey = buildCacheKey(guildId, 'events', JSON.stringify(params));
    const cached = cacheGet<{ events: Event[]; pagination: Pagination }>(cacheKey);
    if (cached) {
      setEvents(cached.events);
      setPagination(cached.pagination);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.events.list(guildId, params);
      const data = res.data as Event[];
      setEvents(data);
      setPagination(res.pagination);
      cacheSet(cacheKey, { events: data, pagination: res.pagination });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const getEvent = useCallback(async (eventId: number) => {
    if (!guildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.events.get(guildId, eventId);
      setCurrentEvent(res.data as Event & { participants: EventParticipant[]; winners: EventWinner[] });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to fetch event');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const refetch = useCallback(() => {
    cacheInvalidatePrefix(`${guildId}:events`);
    fetchEvents();
  }, [guildId, fetchEvents]);

  return { events, currentEvent, loading, error, pagination, fetchEvents, getEvent, refetch };
}
