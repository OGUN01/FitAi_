'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/lib/auth/guard';
import { adminFetch } from '@/lib/workers/client';
import type { SubscriptionPlan } from '@/types/admin';

export default function PlansPage() {
  const { accessToken } = useAdminSession();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    adminFetch<{ success: boolean; data: SubscriptionPlan[] }>('/api/admin/plans', {}, accessToken)
      .then(r => setPlans(r.data))
      .catch(e => setError(e.message));
  }, [accessToken]);

  function getVal(tier: string, field: string, original: unknown): string {
    return editing[tier]?.[field] ?? String(original ?? '');
  }

  function setVal(tier: string, field: string, val: string) {
    setEditing(e => ({ ...e, [tier]: { ...(e[tier] ?? {}), [field]: val } }));
  }

  async function savePlan(tier: string) {
    if (!accessToken || !editing[tier]) return;
    setSaving(s => ({ ...s, [tier]: true }));
    try {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(editing[tier])) {
        const num = Number(v);
        updates[k] = isNaN(num) || v === '' ? v : num;
      }
      await adminFetch(`/api/admin/plans/${tier}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }, accessToken);
      const r = await adminFetch<{ success: boolean; data: SubscriptionPlan[] }>('/api/admin/plans', {}, accessToken);
      setPlans(r.data);
      setEditing(e => { const n = { ...e }; delete n[tier]; return n; });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(s => ({ ...s, [tier]: false }));
    }
  }

  const EDITABLE = ['name', 'description', 'price_monthly', 'price_yearly', 'ai_generations_per_day', 'ai_generations_per_month', 'scans_per_day'] as const;

  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-4">
      {plans.map(plan => (
        <div key={plan.tier} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white capitalize">{plan.tier}</h2>
            {editing[plan.tier] && (
              <button
                onClick={() => savePlan(plan.tier)}
                disabled={saving[plan.tier]}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {saving[plan.tier] ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {EDITABLE.map(field => (
              <div key={field}>
                <label className="block text-xs text-gray-400 mb-1">{field.replace(/_/g, ' ')}</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  value={getVal(plan.tier, field, (plan as unknown as Record<string, unknown>)[field])}
                  onChange={e => setVal(plan.tier, field, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 text-sm text-gray-500">
            <span>Unlimited AI: <span className={plan.unlimited_ai ? 'text-green-400' : 'text-gray-500'}>{String(plan.unlimited_ai)}</span></span>
            <span>Unlimited Scans: <span className={plan.unlimited_scans ? 'text-green-400' : 'text-gray-500'}>{String(plan.unlimited_scans)}</span></span>
            <span>Analytics: <span className={plan.analytics ? 'text-green-400' : 'text-gray-500'}>{String(plan.analytics)}</span></span>
            <span>Coaching: <span className={plan.coaching ? 'text-green-400' : 'text-gray-500'}>{String(plan.coaching)}</span></span>
          </div>
        </div>
      ))}
    </div>
  );
}
