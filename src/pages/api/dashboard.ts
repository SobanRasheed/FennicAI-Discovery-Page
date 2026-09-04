/**
 * Dashboard stats + subjects/topics list for the admin UI.
 * GET /api/dashboard/
 */
import type { APIRoute } from 'astro';
import { json } from '../../../utils/backend';
import { dashboardStats, listSubjects } from '../../../utils/content';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const [stats, subjects] = await Promise.all([
    dashboardStats(locals),
    listSubjects(locals, true).catch(() => []),
  ]);
  return json({ stats, subjects });
};
