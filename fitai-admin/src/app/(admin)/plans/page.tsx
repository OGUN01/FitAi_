'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/lib/auth/guard';
import { adminFetch } from '@/lib/workers/client';
import type { SubscriptionPlan } from '@/types/admin';

type EditableFieldType = 'text' | 'nullable-number' | 'boolean';

interface EditableFieldConfig {
  key: keyof Pick<
    SubscriptionPlan,
    | 'name'
    | 'description'
    | 'price_monthly'
    | 'price_yearly'
    | 'ai_generations_per_day'
    | 'ai_generations_per_month'
    | 'scans_per_day'
    | 'unlimited_scans'
    | 'unlimited_ai'
    | 'analytics'
    | 'coaching'
    | 'active'
  >;
  label: string;
  type: EditableFieldType;
}

const EDITABLE_FIELDS: EditableFieldConfig[] = [
  { key: 'name', label: 'name', type: 'text' },
  { key: 'description', label: 'description', type: 'text' },
  { key: 'price_monthly', label: 'price monthly', type: 'nullable-number' },
  { key: 'price_yearly', label: 'price yearly', type: 'nullable-number' },
  { key: 'ai_generations_per_day', label: 'ai generations per day', type: 'nullable-number' },
  { key: 'ai_generations_per_month', label: 'ai generations per month', type: 'nullable-number' },
  { key: 'scans_per_day', label: 'scans per day', type: 'nullable-number' },
  { key: 'unlimited_ai', label: 'unlimited ai', type: 'boolean' },
  { key: 'unlimited_scans', label: 'unlimited scans', type: 'boolean' },
  { key: 'analytics', label: 'analytics', type: 'boolean' },
  { key: 'coaching', label: 'coaching', type: 'boolean' },
  { key: 'active', label: 'active', type: 'boolean' },
];

function getDisplayValue(plan: SubscriptionPlan, field: EditableFieldConfig, editingValue?: string): string {
  if (editingValue !== undefined) {
    return editingValue;
  }

  const value = plan[field.key];
  if (field.type === 'boolean') {
    return String(Boolean(value));
  }

  return value === null || value === undefined ? '' : String(value);
}

function normalizeValue(field: EditableFieldConfig, rawValue: string): unknown {
  if (field.type === 'boolean') {
    if (rawValue !== 'true' && rawValue !== 'false') {
      throw new Error(`Invalid value for ${field.label}`);
    }
    return rawValue === 'true';
  }

  if (field.type === 'nullable-number') {
    if (rawValue.trim() === '') {
      return null;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid value for ${field.label}`);
    }

    return parsed;
  }

  const trimmed = rawValue.trim();
  if (field.key === 'description' && trimmed === '') {
    return null;
  }
  if (trimmed === '') {
    throw new Error(`Field '${field.label}' cannot be empty`);
  }
  return trimmed;
}

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

  function setVal(tier: string, field: string, val: string) {
    setEditing(e => ({ ...e, [tier]: { ...(e[tier] ?? {}), [field]: val } }));
  }

  async function savePlan(tier: string) {
    if (!accessToken || !editing[tier]) return;
    setSaving(s => ({ ...s, [tier]: true }));
    try {
      const updates: Record<string, unknown> = {};
      for (const [key, raw] of Object.entries(editing[tier])) {
        const field = EDITABLE_FIELDS.find(f => f.key === key);
        if (!field) {
          throw new Error(`Field '${key}' cannot be updated`);
        }
        updates[key] = normalizeValue(field, raw);
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
                {saving[plan.tier] ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EDITABLE_FIELDS.map(field => (
              <div key={field.key}>
                <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
                {field.type === 'boolean' ? (
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={getDisplayValue(plan, field, editing[plan.tier]?.[field.key])}
                    onChange={e => setVal(plan.tier, String(field.key), e.target.value)}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={getDisplayValue(plan, field, editing[plan.tier]?.[field.key])}
                    onChange={e => setVal(plan.tier, String(field.key), e.target.value)}
                    placeholder={field.type === 'nullable-number' ? 'Leave blank for null' : undefined}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
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
