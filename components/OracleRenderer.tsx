import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Platform, Switch, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { Typography } from '@/constants/typography';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import * as Notifications from 'expo-notifications';

type OracleComponentType = 'text' | 'number' | 'slider' | 'select' | 'switch' | 'date';

export type OracleJsonComponent = {
  id: string;
  type: OracleComponentType;
  label: string;
  placeholder?: string;
  defaultValue?: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
};

export type OracleJsonResult = {
  type: 'text' | 'chart' | 'list' | 'advice';
  formula?: string;
  chartType?: 'line' | 'bar' | 'pie';
  message?: string;
};

export type OracleJson = {
  title: string;
  description: string;
  category: string;
  // Optional state/persistence metadata (safe to store/ignore if not used by UI yet)
  persistence?: {
    type: string;
    key: string;
    fields: string[];
  };
  reminders?: Array<{
    interval: 'hourly' | 'daily' | 'weekly' | string;
    time?: string;
    message: string;
  }>;
  components: OracleJsonComponent[];
  result: OracleJsonResult;
};

type OracleRendererProps = {
  oracle: OracleJson;
  /**
   * When provided (and user is logged in), tracker logs will be persisted under:
   * users/{uid}/oracles/{oracleId}/logs
   */
  oracleId?: string;
};

function preprocessExpression(expr: string) {
  let out = String(expr ?? '').trim();
  // 5% -> (5/100)
  out = out.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
  // ^ -> **
  out = out.replace(/\^/g, '**');
  return out;
}

function safeEvalExpression(expr: string, context: Record<string, any>) {
  const processed = preprocessExpression(expr);
  if (!processed) return null;

  // Block common escape hatches.
  const blocked =
    /[`;]|(\b(?:this|global|window|process|require|import|export|Function|eval|constructor|prototype)\b)/i;
  if (blocked.test(processed)) throw new Error('Unsafe expression');

  // Conservative allowed characters.
  const allowed = /^[0-9a-zA-Z_\s.+\-*/%(),?:<>=!&|[\]."'{}$]*$/;
  if (!allowed.test(processed)) throw new Error('Invalid expression');

  // eslint-disable-next-line no-new-func
  return new Function(...Object.keys(context), `"use strict"; return (${processed});`)(
    ...Object.values(context)
  );
}

function formatCurrencyUSD(value: number) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function isFinanceOracle(oracle: OracleJson) {
  const hay = `${oracle.category} ${oracle.title} ${oracle.description} ${oracle.result?.formula ?? ''}`.toLowerCase();
  return (
    hay.includes('finance') ||
    hay.includes('investment') ||
    hay.includes('savings') ||
    hay.includes('interest') ||
    hay.includes('compound') ||
    hay.includes('principal') ||
    hay.includes('pmt') ||
    hay.includes('rate')
  );
}

function hasAnyId(oracle: OracleJson, ids: string[]) {
  const set = new Set((oracle.components ?? []).map((c) => c.id));
  return ids.some((id) => set.has(id));
}

function getNumberByIds(
  inputs: Record<string, number | null | undefined>,
  ids: string[]
): number | null {
  for (const id of ids) {
    const v = inputs[id];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

type TrackerLog = {
  date: string; // YYYY-MM-DD
  rating?: number; // normalized numeric field (if any)
  status?: string | boolean; // normalized status (if any)
  [key: string]: any;
};

function toYyyyMmDd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeDateInput(value: string) {
  const s = String(value ?? '').trim();
  // accept YYYY-MM-DD only
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return '';
}

function isSuccessStatus(status: unknown) {
  if (typeof status === 'boolean') return status;
  const s = String(status ?? '').toLowerCase().trim();
  if (!s) return true; // if missing, assume success for streak trackers
  if (['failed', 'missed', 'no', 'false', 'rest', 'skip', 'skipped'].includes(s)) return false;
  return true; // done/crushed/yes/etc.
}

function computeStreak(logs: TrackerLog[]) {
  // Count consecutive successful days ending at today based on unique dates.
  const successDates = new Set(
    logs
      .filter((l) => isSuccessStatus(l.status))
      .map((l) => l.date)
  );

  let streak = 0;
  let cursor = new Date();
  for (;;) {
    const key = toYyyyMmDd(cursor);
    if (!successDates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function avgRating(logs: TrackerLog[]) {
  const nums = logs.map((l) => l.rating).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function avgNumberField(logs: TrackerLog[], fieldId: string) {
  const nums = logs
    .map((l) => l?.[fieldId])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sumNumberField(logs: TrackerLog[], fieldId: string) {
  const nums = logs
    .map((l) => l?.[fieldId])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0);
}

function looksLikeEchoFormula(expr: string | undefined) {
  const s = String(expr ?? '').trim();
  if (!s) return false;
  // Very common "echo" patterns: inputs.x, inputs["x"], String(inputs.x)
  return (
    /^inputs\.[a-zA-Z0-9_]+$/.test(s) ||
    /^inputs\[['"][^'"]+['"]\]$/.test(s) ||
    /^String\(\s*inputs\.[a-zA-Z0-9_]+\s*\)$/.test(s) ||
    /^String\(\s*inputs\[['"][^'"]+['"]\]\s*\)$/.test(s)
  );
}

function includesAny(hay: string, needles: string[]) {
  return needles.some((n) => hay.includes(n));
}

function pickInitialAmount(oracle: OracleJson, inputs: Record<string, number>) {
  const keys = ['principal', 'initial', 'initialAmount', 'startingAmount', 'deposit', 'P'];
  for (const k of keys) {
    const v = inputs[k];
    if (Number.isFinite(v) && v > 0) return v;
  }
  const first = (oracle.components ?? []).find((c) => c.type === 'number' || c.type === 'slider');
  if (!first) return null;
  const v = inputs[first.id];
  return Number.isFinite(v) && v > 0 ? v : null;
}

function interpolateMessage(template: string, ctx: Record<string, any>) {
  return template.replace(/\{([^}]+)\}/g, (_, expr) => {
    try {
      const val = safeEvalExpression(String(expr), ctx);
      if (typeof val === 'number') return Number.isFinite(val) ? val.toFixed(2) : 'NaN';
      if (val == null) return '';
      return String(val);
    } catch {
      return '';
    }
  });
}

export const OracleRenderer = ({ oracle, oracleId }: OracleRendererProps) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const finance = useMemo(() => isFinanceOracle(oracle), [oracle]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [datePickerOpenId, setDatePickerOpenId] = useState<string | null>(null);

  const haystack = useMemo(() => {
    const s = `${oracle.title} ${oracle.description} ${oracle.category} ${oracle.result?.message ?? ''} ${
      oracle.result?.formula ?? ''
    }`;
    return s.toLowerCase();
  }, [oracle]);

  const inferred = useMemo(() => {
    const isHabitOrHealth =
      String(oracle.category ?? '').toLowerCase() === 'habits' ||
      String(oracle.category ?? '').toLowerCase() === 'health';
    const isTrackerLike = includesAny(haystack, ['tracker', 'habit', 'streak', 'log', 'daily']);
    const isReminderLike = includesAny(haystack, ['reminder', 'notification', 'notify']);
    const wantsChart = Boolean(oracle.result?.type === 'chart' || includesAny(haystack, ['chart', 'trend', 'over time', 'graph']));
    return { isHabitOrHealth, isTrackerLike, isReminderLike, wantsChart };
  }, [haystack, oracle.category, oracle.result?.type]);

  const persistenceConfig = useMemo(() => {
    if (oracle.persistence?.type && oracle.persistence?.key && Array.isArray(oracle.persistence?.fields)) {
      return oracle.persistence;
    }

    // Back-compat: infer stateful behavior for habit/health/tracker-like tools.
    if (!(inferred.isHabitOrHealth || inferred.isTrackerLike)) return null;

    const comps = oracle.components ?? [];
    const dateComp = comps.find((c) => c.type === 'date' || c.id === 'date');
    const candidateFields = comps
      .filter((c) => c.id !== (dateComp?.id ?? 'date'))
      .map((c) => c.id)
      .filter((id) => id !== 'notes');

    // Prefer a familiar schema when possible.
    const fields: string[] = [];
    if (candidateFields.includes('rating')) fields.push('rating');
    if (candidateFields.includes('status')) fields.push('status');
    for (const id of candidateFields) {
      if (!fields.includes(id)) fields.push(id);
      if (fields.length >= 3) break;
    }

    return { type: 'daily_log', key: dateComp?.id ?? 'date', fields: fields.length ? fields : ['status'] };
  }, [inferred.isHabitOrHealth, inferred.isTrackerLike, oracle.components, oracle.persistence]);

  const remindersConfig = useMemo(() => {
    if (Array.isArray(oracle.reminders) && oracle.reminders.length) return oracle.reminders;
    if (!inferred.isReminderLike) return null;
    // Conservative default if user asked for reminders but model didn't include explicit config.
    return [{ interval: 'hourly', time: '9am-6pm', message: oracle.title || 'Reminder' }];
  }, [inferred.isReminderLike, oracle.reminders, oracle.title]);

  const statefulEnabled = Boolean(persistenceConfig);
  const isCompoundGrowth = useMemo(() => {
    // Treat as compound growth calculator when typical inputs are present.
    const hasPrincipal = hasAnyId(oracle, ['principal', 'P', 'initial', 'initialAmount']);
    const hasRate = hasAnyId(oracle, ['rate', 'interestRate', 'apr', 'r']);
    const hasYears = hasAnyId(oracle, ['years', 't', 'timeYears']);
    const hay = `${oracle.title} ${oracle.description} ${oracle.result?.formula ?? ''}`.toLowerCase();
    return (hasPrincipal && hasRate && hasYears) || hay.includes('compound');
  }, [oracle]);

  const initialRaw = useMemo(() => {
    const init: Record<string, any> = {};
    for (const c of oracle.components ?? []) {
      if (c.type === 'slider') init[c.id] = c.defaultValue ?? c.min ?? 0;
      else if (c.type === 'number') init[c.id] = c.defaultValue != null ? String(c.defaultValue) : '';
      else init[c.id] = c.defaultValue ?? '';
    }
    return init;
  }, [oracle.components]);

  const [rawInputs, setRawInputs] = useState<Record<string, any>>(initialRaw);
  const [resultNumber, setResultNumber] = useState<number | null>(null);
  const [resultDisplay, setResultDisplay] = useState<string>('');
  const [insights, setInsights] = useState<string[]>([]);
  const [isPlaceholder, setIsPlaceholder] = useState(true);

  // Stateful logs (in-memory; backed by Firestore when oracleId is provided).
  const [trackerLogs, setTrackerLogs] = useState<TrackerLog[]>([]);

  const numericInputs = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const c of oracle.components ?? []) {
      if (c.type === 'slider') out[c.id] = Number(rawInputs[c.id]);
      if (c.type === 'number') {
        const raw = rawInputs[c.id];
        const s = raw == null ? '' : String(raw).trim();
        if (!s) {
          out[c.id] = null;
          continue;
        }
        const n = parseFloat(s);
        out[c.id] = Number.isFinite(n) ? n : null;
      }
    }
    return out;
  }, [oracle.components, rawInputs]);

  const inputs = useMemo(() => {
    const out: Record<string, any> = {};
    for (const c of oracle.components ?? []) {
      if (c.type === 'slider' || c.type === 'number') out[c.id] = numericInputs[c.id] ?? 0;
      else out[c.id] = rawInputs[c.id];
    }
    return out;
  }, [numericInputs, oracle.components, rawInputs]);

  const reset = () => setRawInputs(initialRaw);

  const trackerConfig = useMemo(() => {
    const comps = oracle.components ?? [];
    const dateComp =
      comps.find((c) => c.id === (persistenceConfig?.key ?? 'date')) ??
      comps.find((c) => c.type === 'date' || c.id === 'date');
    const ratingComp =
      comps.find((c) => c.id.toLowerCase().includes('rating')) ||
      comps.find((c) => c.id.toLowerCase().includes('glasses')) ||
      comps.find((c) => c.id.toLowerCase().includes('minutes')) ||
      comps.find((c) => c.id.toLowerCase().includes('count')) ||
      comps.find((c) => c.id.toLowerCase().includes('energy')) ||
      comps.find((c) => c.type === 'slider' || c.type === 'number');
    const statusComp =
      comps.find((c) => c.id.toLowerCase().includes('status')) ||
      comps.find((c) => c.id.toLowerCase().includes('done')) ||
      comps.find((c) => c.type === 'select' || c.type === 'switch');

    const isTracker =
      Boolean(dateComp) &&
      (Boolean(ratingComp) || Boolean(statusComp)) &&
      (statusComp?.type === 'select' || statusComp?.type === 'switch' || Boolean(statusComp));

    return {
      isTracker: Boolean(isTracker && statefulEnabled),
      dateId: dateComp?.id ?? 'date',
      ratingId: ratingComp?.id ?? 'rating',
      statusId: statusComp?.id ?? 'status',
      ratingMax:
        typeof ratingComp?.max === 'number'
          ? ratingComp.max
          : ratingComp?.type === 'slider'
          ? 10
          : 10,
    };
  }, [oracle.components, persistenceConfig?.key, statefulEnabled]);

  const logsEnabled = Boolean(statefulEnabled && user?.uid && oracleId);

  useEffect(() => {
    // Instant updates on any input change
    setInsights([]);
    setResultNumber(null);
    setIsPlaceholder(false);

    const formula = oracle.result?.formula?.trim();
    const placeholder = 'Adjust values to see result';

    // If compound-growth style inputs exist, compute explicitly for accuracy.
    if (isCompoundGrowth) {
      const principal = getNumberByIds(numericInputs, ['principal', 'P', 'initial', 'initialAmount']);
      const rate = getNumberByIds(numericInputs, ['rate', 'interestRate', 'apr', 'r']);
      const years = getNumberByIds(numericInputs, ['years', 't', 'timeYears']);
      const contribution =
        getNumberByIds(numericInputs, ['contribution', 'monthlyContribution', 'pmt', 'PMT']) ?? 0;

      // Show placeholder until core inputs exist and are valid numbers.
      if (principal == null || rate == null || years == null) {
        setIsPlaceholder(true);
        setResultDisplay(oracle.description || placeholder);
        return;
      }

      if (principal <= 0 || years <= 0) {
        setIsPlaceholder(true);
        setResultDisplay(oracle.description || placeholder);
        return;
      }

      const annual = rate / 100;
      const finalBase = principal * Math.pow(1 + annual, years);

      let final = finalBase;
      const months = Math.max(0, Math.round(years * 12));

      if (contribution > 0 && months > 0) {
        const r = annual / 12;
        if (r === 0) {
          final += contribution * months;
        } else {
          const n = years * 12;
          final +=
            contribution *
            (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
        }
      }

      if (!Number.isFinite(final)) {
        setIsPlaceholder(true);
        setResultDisplay(oracle.description || placeholder);
        return;
      }

      const invested = principal + (contribution > 0 ? contribution * months : 0);
      const delta = final - invested;
      const pct = invested > 0 ? (delta / invested) * 100 : 0;

      setResultNumber(final);
      setResultDisplay(formatCurrencyUSD(final));
      setInsights([
        `Total growth: ${formatCurrencyUSD(delta)} (${formatPercent(pct)})`,
      ]);
      return;
    }

    // Fallback: if no formula, show description (guidance).
    if (!formula) {
      // If any inputs were entered, show a friendly confirmation + summary.
      const enteredPairs = (oracle.components ?? [])
        .map((c) => {
          const v = rawInputs[c.id];
          if (v == null) return null;
          if (c.type === 'number') {
            const s = String(v).trim();
            if (!s) return null;
            return `${c.id}: ${s}`;
          }
          if (c.type === 'slider') {
            if (!Number.isFinite(Number(v))) return null;
            return `${c.id}: ${Number(v)}`;
          }
          const s = String(v).trim();
          if (!s) return null;
          return `${c.id}: ${s}`;
        })
        .filter(Boolean) as string[];

      if (enteredPairs.length > 0) {
        setIsPlaceholder(false);
        setResultDisplay(`Logged successfully — ${enteredPairs.join(', ')}`);
      } else {
        setIsPlaceholder(true);
        setResultDisplay(oracle.description || 'This oracle provides guidance.');
      }
      return;
    }

    // Validate numeric inputs (subtle placeholder instead of red errors).
    const numericVals = Object.values(numericInputs);
    if (numericVals.length && numericVals.some((v) => v == null)) {
      setIsPlaceholder(true);
      setResultDisplay(oracle.description || placeholder);
      return;
    }

    try {
      const computed = safeEvalExpression(formula, { inputs, logs: trackerLogs, Math });

      // Support non-number outputs too (decisions/predictors)
      if (typeof computed === 'number') {
        if (!Number.isFinite(computed)) {
          setIsPlaceholder(true);
          setResultDisplay(oracle.description || placeholder);
          return;
        }
        setResultNumber(computed);

        if (finance) {
          const initial = pickInitialAmount(oracle, numericInputs);
          setResultDisplay(formatCurrencyUSD(computed));
          if (initial && initial > 0) {
            const delta = computed - initial;
            const pct = (delta / initial) * 100;
            setInsights([
              `Total growth: ${formatCurrencyUSD(delta)} (${formatPercent(pct)})`,
              `Multiple: ${(computed / initial).toFixed(2)}×`,
            ]);
          }
          return;
        }

        const message = oracle.result?.message?.trim();
        if (message) {
          setResultDisplay(interpolateMessage(message, { inputs, logs: trackerLogs, result: computed, Math }));
        } else {
          // Generic number formatting
          setResultDisplay(new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(computed));
        }

        // Auto-enhance overly basic "echo" formulas for stateful tools with history.
        if (statefulEnabled && looksLikeEchoFormula(formula) && trackerLogs.length) {
          const primary = trackerConfig.ratingId;
          const avg = avgNumberField(trackerLogs, primary);
          const sum = sumNumberField(trackerLogs, primary);
          setInsights((prev) => {
            const next = prev.slice();
            next.push(`Total logged: ${trackerLogs.length}`);
            if (avg != null) next.push(`Average ${primary}: ${avg.toFixed(1)}`);
            if (sum) next.push(`Sum ${primary}: ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(sum)}`);
            return next;
          });
        }
        return;
      }

      // Non-number: if there is a message, interpolate; else stringify computed
      const message = oracle.result?.message?.trim();
      if (message) {
        setResultDisplay(interpolateMessage(message, { inputs, logs: trackerLogs, result: computed, Math }));
      } else {
        setResultDisplay(String(computed));
      }

      // Auto-enhance trivial results by adding history summaries when relevant.
      if (statefulEnabled && trackerLogs.length && (!message || looksLikeEchoFormula(formula))) {
        setInsights((prev) => {
          const next = prev.slice();
          next.push(`Total logged: ${trackerLogs.length}`);
          const primary = trackerConfig.ratingId;
          const avg = avgNumberField(trackerLogs, primary);
          if (avg != null) next.push(`Average ${primary}: ${avg.toFixed(1)}`);
          return next;
        });
      }
    } catch {
      setIsPlaceholder(true);
      setResultDisplay(oracle.description || placeholder);
    }
  }, [finance, inputs, isCompoundGrowth, numericInputs, oracle, oracle.description, statefulEnabled, trackerConfig.ratingId, trackerLogs, haystack]);

  const positiveGrowth = typeof resultNumber === 'number' && resultNumber > 0;

  const currentTrackerDate = useMemo(() => {
    if (!trackerConfig.isTracker) return '';
    const raw = rawInputs[trackerConfig.dateId];
    const normalized = normalizeDateInput(String(raw ?? ''));
    return normalized || toYyyyMmDd(new Date());
  }, [rawInputs, trackerConfig]);

  const currentTrackerRating = useMemo(() => {
    if (!trackerConfig.isTracker) return null;
    const raw = rawInputs[trackerConfig.ratingId];
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').trim());
    return Number.isFinite(n) ? n : null;
  }, [rawInputs, trackerConfig]);

  const currentTrackerStatus = useMemo(() => {
    if (!trackerConfig.isTracker) return undefined;
    return rawInputs[trackerConfig.statusId];
  }, [rawInputs, trackerConfig]);

  // Optional native date picker support (if installed).
  const DateTimePicker: any = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('@react-native-community/datetimepicker');
      return mod?.default ?? mod;
    } catch {
      return null;
    }
  }, []);

  const trackerStreak = useMemo(() => computeStreak(trackerLogs), [trackerLogs]);
  const trackerAvg = useMemo(() => avgRating(trackerLogs), [trackerLogs]);
  const trackerTotal = trackerLogs.length;

  const logThis = () => {
    if (!trackerConfig.isTracker) return;
    const date = currentTrackerDate;
    const rating = currentTrackerRating ?? undefined;
    const status = currentTrackerStatus;

    setTrackerLogs((prev) => {
      const next = prev.filter((l) => l.date !== date);
      const entry: TrackerLog = { date, rating, status };
      // Store additional persistence fields when available.
      for (const f of persistenceConfig?.fields ?? []) {
        if (f === trackerConfig.dateId) continue;
        entry[f] = inputs[f];
      }
      next.push(entry);
      next.sort((a, b) => (a.date < b.date ? -1 : 1));
      return next.slice(-60); // keep recent history
    });

    // Persist to Firestore if available (best-effort).
    if (logsEnabled) {
      const uid = user!.uid;
      const logsRef = collection(db, 'users', uid, 'oracles', oracleId!, 'logs');
      const payload: Record<string, any> = {
        date,
        createdAt: serverTimestamp(),
      };
      for (const f of persistenceConfig?.fields ?? []) {
        if (f === trackerConfig.dateId) continue;
        payload[f] = inputs[f] ?? null;
      }
      // Keep back-compat fields.
      payload.rating = typeof rating === 'number' ? rating : payload.rating ?? null;
      payload.status = status ?? payload.status ?? null;

      void addDoc(logsRef, payload).catch((e) => {
        console.error('Failed to persist tracker log:', e);
      });
    }
  };

  useEffect(() => {
    // Load persisted logs for trackers (real-time) when possible.
    if (!trackerConfig.isTracker) return;
    if (!user?.uid || !oracleId) return;

    const logsRef = collection(db, 'users', user.uid, 'oracles', oracleId, 'logs');
    const q = query(logsRef, orderBy('date', 'asc'), limit(365));

    const unsub = onSnapshot(
      q,
      (snap) => {
        // Normalize and de-dupe by date (keep latest for the day).
        const map = new Map<string, TrackerLog>();
        for (const d of snap.docs) {
          const data = d.data() as any;
          const date = String(data.date ?? '').trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          const entry: TrackerLog = { date };
          // Pull persisted fields
          for (const f of persistenceConfig?.fields ?? []) {
            if (f === trackerConfig.dateId) continue;
            entry[f] = data[f];
          }

          // Normalize convenience fields for existing UI.
          const numericField = trackerConfig.ratingId;
          const rating =
            typeof data[numericField] === 'number' && Number.isFinite(data[numericField])
              ? data[numericField]
              : typeof data.rating === 'number' && Number.isFinite(data.rating)
              ? data.rating
              : undefined;
          entry.rating = rating;
          entry.status = data[trackerConfig.statusId] ?? data.status;

          map.set(date, entry);
        }
        const next = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
        setTrackerLogs(next);
      },
      (e) => {
        console.error('Failed to load tracker logs:', e);
      }
    );

    return () => unsub();
  }, [oracleId, persistenceConfig?.fields, trackerConfig.isTracker, trackerConfig.ratingId, trackerConfig.statusId, trackerConfig.dateId, user?.uid]);

  const scheduleReminders = async () => {
    if (!remindersConfig?.length) return;
    if (Platform.OS === 'web') {
      Alert.alert('Reminders', 'Reminders are not supported on web.');
      return;
    }
    try {
      const perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Reminders', 'Notification permission not granted.');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const now = new Date();
      const parseHour = (s: string) => {
        const t = s.trim().toLowerCase();
        const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
        if (!m) return null;
        let h = parseInt(m[1], 10);
        const ap = m[3];
        if (ap === 'pm' && h < 12) h += 12;
        if (ap === 'am' && h === 12) h = 0;
        return { h, min: m[2] ? parseInt(m[2], 10) : 0 };
      };

      for (const r of remindersConfig) {
        const msg = r.message || oracle.title || 'Reminder';
        const window = String(r.time ?? '').split('-').map((p) => p.trim());
        const start = window[0] ? parseHour(window[0]) : null;
        const end = window[1] ? parseHour(window[1]) : null;

        // Best-effort scheduling: next 3 days.
        for (let day = 0; day < 3; day++) {
          const base = new Date(now);
          base.setDate(base.getDate() + day);

          if (r.interval === 'hourly' && start && end) {
            for (let hh = start.h; hh <= end.h; hh++) {
              const t = new Date(base);
              t.setHours(hh, start.min, 0, 0);
              if (t.getTime() <= now.getTime()) continue;
              await Notifications.scheduleNotificationAsync({
                content: { title: oracle.title || 'Reminder', body: msg },
                trigger: t,
              });
            }
          } else if (r.interval === 'daily' && start) {
            const t = new Date(base);
            t.setHours(start.h, start.min, 0, 0);
            if (t.getTime() <= now.getTime()) continue;
            await Notifications.scheduleNotificationAsync({
              content: { title: oracle.title || 'Reminder', body: msg },
              trigger: t,
            });
          }
        }
      }

      Alert.alert('Reminders set', 'Notifications have been scheduled.');
    } catch (e) {
      console.error('Failed to schedule reminders:', e);
      Alert.alert('Reminders', 'Failed to schedule reminders.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          onPress={reset}
          style={({ pressed }) => [
            styles.resetButton,
            {
              borderColor: colors.border,
              backgroundColor: pressed ? colors.surfaceHover : colors.surface,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Text style={[styles.resetText, { color: colors.textMuted }]}>Reset Inputs</Text>
        </Pressable>
      </View>

      <View style={styles.inputs}>
        {(oracle.components ?? []).map((comp) => {
          if (comp.type === 'text' || comp.type === 'date') {
            return (
              <View key={comp.id} style={styles.block}>
                <Text style={[styles.label, { color: colors.textMuted }]}>{comp.label}</Text>
                {comp.type === 'date' && DateTimePicker && Platform.OS !== 'web' ? (
                  <>
                    <Pressable
                      onPress={() => setDatePickerOpenId((cur) => (cur === comp.id ? null : comp.id))}
                      style={({ pressed }) => [
                        styles.dateButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                    >
                      <Text style={[styles.dateButtonText, { color: colors.textSecondary }]}>
                        {normalizeDateInput(String(rawInputs[comp.id] ?? '')) || 'Select date'}
                      </Text>
                    </Pressable>
                    {datePickerOpenId === comp.id && (
                      <DateTimePicker
                        value={new Date((normalizeDateInput(String(rawInputs[comp.id] ?? '')) || toYyyyMmDd(new Date())) + 'T00:00:00')}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        onChange={(_: any, d: Date | undefined) => {
                          if (Platform.OS !== 'ios') setDatePickerOpenId(null);
                          if (!d) return;
                          const next = toYyyyMmDd(d);
                          setRawInputs((p: any) => ({ ...p, [comp.id]: next }));
                        }}
                      />
                    )}
                  </>
                ) : (
                  <TextInput
                    value={String(rawInputs[comp.id] ?? '')}
                    onChangeText={(t) => setRawInputs((p) => ({ ...p, [comp.id]: t }))}
                    placeholder={comp.placeholder ?? (comp.type === 'date' ? 'YYYY-MM-DD' : undefined)}
                    placeholderTextColor={colors.textMuted}
                    keyboardType={comp.type === 'date' ? 'numbers-and-punctuation' : 'default'}
                    onFocus={() => setFocusedId(comp.id)}
                    onBlur={() => setFocusedId((cur) => (cur === comp.id ? null : cur))}
                    style={[
                      styles.input,
                      { color: colors.textSecondary, backgroundColor: 'transparent' },
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.underline,
                    {
                      backgroundColor:
                        focusedId === comp.id ? 'rgba(0,170,255,0.60)' : 'rgba(255,255,255,0.10)',
                    },
                  ]}
                />
              </View>
            );
          }

          if (comp.type === 'number') {
            return (
              <View key={comp.id} style={styles.block}>
                <Text style={[styles.label, { color: colors.textMuted }]}>{comp.label}</Text>
                <TextInput
                  value={String(rawInputs[comp.id] ?? '')}
                  onChangeText={(t) => setRawInputs((p) => ({ ...p, [comp.id]: t }))}
                  placeholder={comp.placeholder ?? '0'}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                  onFocus={() => setFocusedId(comp.id)}
                  onBlur={() => setFocusedId((cur) => (cur === comp.id ? null : cur))}
                  style={[
                    styles.input,
                    { color: colors.textSecondary, backgroundColor: 'transparent' },
                  ]}
                />
                <View
                  style={[
                    styles.underline,
                    {
                      backgroundColor:
                        focusedId === comp.id ? 'rgba(0,170,255,0.60)' : 'rgba(255,255,255,0.10)',
                    },
                  ]}
                />
              </View>
            );
          }

          if (comp.type === 'slider') {
            const value = Number(rawInputs[comp.id] ?? comp.defaultValue ?? comp.min ?? 0);
            return (
              <View key={comp.id} style={styles.block}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  {comp.label} ({Number.isFinite(value) ? value : 0})
                </Text>
                <Slider
                  minimumValue={comp.min ?? 0}
                  maximumValue={comp.max ?? 100}
                  step={comp.step ?? 1}
                  value={Number.isFinite(value) ? value : 0}
                  onValueChange={(v) => setRawInputs((p) => ({ ...p, [comp.id]: v }))}
                  minimumTrackTintColor={'rgba(255,255,255,0.18)'}
                  maximumTrackTintColor={'rgba(255,255,255,0.10)'}
                  thumbTintColor={'#FFFFFF'}
                />
              </View>
            );
          }

          if (comp.type === 'select') {
            const value = String(rawInputs[comp.id] ?? comp.defaultValue ?? comp.options?.[0] ?? '');
            return (
              <View key={comp.id} style={styles.block}>
                <Text style={[styles.label, { color: colors.textMuted }]}>{comp.label}</Text>
                <View style={[styles.pickerWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Picker
                    selectedValue={value}
                    onValueChange={(v) => setRawInputs((p) => ({ ...p, [comp.id]: v }))}
                    dropdownIconColor={colors.textSecondary}
                    style={{ color: colors.textSecondary }}
                  >
                    {(comp.options ?? []).map((opt) => (
                      <Picker.Item key={opt} label={opt} value={opt} color={colors.textSecondary} />
                    ))}
                  </Picker>
                </View>
              </View>
            );
          }

          if (comp.type === 'switch') {
            const value = Boolean(rawInputs[comp.id] ?? comp.defaultValue ?? false);
            return (
              <View key={comp.id} style={styles.block}>
                <Text style={[styles.label, { color: colors.textMuted }]}>{comp.label}</Text>
                <View style={styles.switchRow}>
                  <Switch
                    value={value}
                    onValueChange={(v) => setRawInputs((p) => ({ ...p, [comp.id]: v }))}
                    trackColor={{ false: 'rgba(255,255,255,0.10)', true: 'rgba(255,255,255,0.18)' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            );
          }

          return null;
        })}
      </View>

      {trackerConfig.isTracker && (
        <View style={[styles.trackerBox, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
          <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.10)' }]} />
          <View style={styles.trackerHeader}>
            <Text style={[styles.resultLabel, { color: colors.textMuted }]}>Memory</Text>
            {remindersConfig?.length ? (
              <Pressable
                onPress={() => void scheduleReminders()}
                style={({ pressed }) => [
                  styles.logButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.surfaceHover : colors.surface,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Text style={[styles.logButtonText, { color: '#FFFFFF' }]}>Set Reminders</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={logThis}
              style={({ pressed }) => [
                styles.logButton,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceHover : colors.surface,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text style={[styles.logButtonText, { color: '#FFFFFF' }]}>Log This</Text>
            </Pressable>
          </View>

          <View style={styles.trackerStatsRow}>
            <View style={styles.trackerStat}>
              <Text style={[styles.trackerStatLabel, { color: colors.textMuted }]}>Streak</Text>
              <Text style={[styles.trackerStatValue, { color: colors.textSecondary }]}>
                {trackerStreak}d
              </Text>
            </View>
            <View style={styles.trackerStat}>
              <Text style={[styles.trackerStatLabel, { color: colors.textMuted }]}>Avg</Text>
              <Text style={[styles.trackerStatValue, { color: colors.textSecondary }]}>
                {trackerAvg == null ? '—' : trackerAvg.toFixed(1)}
              </Text>
            </View>
            <View style={styles.trackerStat}>
              <Text style={[styles.trackerStatLabel, { color: colors.textMuted }]}>Total</Text>
              <Text style={[styles.trackerStatValue, { color: colors.textSecondary }]}>
                {trackerTotal}
              </Text>
            </View>
          </View>

          {/* Chart from logs (inferred or requested) */}
          {(oracle.result?.type === 'chart' || inferred.wantsChart) && trackerLogs.length > 1 && (
            <View style={styles.chartWrap}>
              {oracle.result?.chartType === 'bar' ? (
                <BarChart
                  data={{
                    labels: trackerLogs.slice(-7).map((l) => l.date.slice(5)),
                    datasets: [
                      { data: trackerLogs.slice(-7).map((l) => (typeof l.rating === 'number' ? l.rating : 0)) },
                    ],
                  }}
                  width={Math.min(Dimensions.get('window').width - 40, 360)}
                  height={180}
                  yAxisLabel=""
                  yAxisSuffix=""
                  fromZero
                  chartConfig={{
                    backgroundGradientFrom: colors.backgroundSecondary,
                    backgroundGradientTo: colors.backgroundSecondary,
                    decimalPlaces: 0,
                    color: () => 'rgba(255,255,255,0.65)',
                    labelColor: () => colors.textMuted,
                  }}
                  style={styles.chart}
                />
              ) : (
                <LineChart
                  data={{
                    labels: trackerLogs.slice(-10).map((l) => l.date.slice(5)),
                    datasets: [
                      {
                        data: trackerLogs.slice(-10).map((l) => (typeof l.rating === 'number' ? l.rating : 0)),
                      },
                    ],
                  }}
                  width={Math.min(Dimensions.get('window').width - 40, 360)}
                  height={180}
                  withDots
                  withInnerLines={false}
                  withOuterLines={false}
                  chartConfig={{
                    backgroundGradientFrom: colors.backgroundSecondary,
                    backgroundGradientTo: colors.backgroundSecondary,
                    decimalPlaces: 0,
                    color: () => 'rgba(255,255,255,0.65)',
                    labelColor: () => colors.textMuted,
                    propsForDots: { r: '3', strokeWidth: '2', stroke: 'rgba(255,255,255,0.65)' },
                  }}
                  style={styles.chart}
                />
              )}
            </View>
          )}

          {/* Recent logs */}
          {trackerLogs.length > 0 ? (
            <View style={styles.logs}>
              <Text style={[styles.logsTitle, { color: colors.textMuted }]}>Recent</Text>
              {trackerLogs
                .slice()
                .reverse()
                .slice(0, 10)
                .map((l) => (
                  <View key={l.date} style={styles.logRow}>
                    <Text style={[styles.logText, { color: colors.textSecondary }]}>{l.date}</Text>
                    <Text style={[styles.logText, { color: colors.textMuted }]}>
                      {typeof l.rating === 'number' && Number.isFinite(l.rating) ? `rating ${l.rating}` : '—'}
                      {l.status != null ? ` · ${String(l.status)}` : ''}
                    </Text>
                  </View>
                ))}
            </View>
          ) : (
            <Text style={[styles.insightText, { color: colors.textMuted }]}>Start logging to see history</Text>
          )}
        </View>
      )}

      {/* Prominent result section (always visible at bottom of renderer) */}
      <View style={[styles.resultBox, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.10)' }]} />
        <Text style={[styles.resultLabel, { color: colors.textMuted }]}>Result</Text>
        <Text
          style={[
            styles.resultValue,
            {
              color: isPlaceholder ? colors.textMuted : positiveGrowth ? colors.accent : '#FFFFFF',
            },
          ]}
          numberOfLines={2}
        >
          {resultDisplay}
        </Text>

        {insights.length > 0 && (
          <View style={styles.insights}>
            {insights.map((line, idx) => (
              <Text key={idx} style={[styles.insightText, { color: colors.textSecondary }]}>
                {line}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  resetButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resetText: {
    fontFamily: Typography.body,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  inputs: {
    gap: 10,
  },
  block: {
    gap: 8,
  },
  label: {
    fontFamily: Typography.body,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontFamily: Typography.body,
    fontSize: 15,
  },
  underline: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  dateButtonText: {
    fontFamily: Typography.body,
    fontSize: 15,
  },
  pickerWrap: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  resultBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  resultLabel: {
    fontFamily: Typography.body,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  resultValue: {
    fontFamily: Typography.bodyStrong,
    fontSize: 30,
    lineHeight: 36,
  },
  insights: {
    marginTop: 10,
    gap: 4,
  },
  insightText: {
    fontFamily: Typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  trackerBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  trackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logButtonText: {
    fontFamily: Typography.bodyStrong,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  trackerStatsRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 12,
  },
  trackerStat: {
    flex: 1,
    gap: 4,
  },
  trackerStatLabel: {
    fontFamily: Typography.body,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  trackerStatValue: {
    fontFamily: Typography.bodyStrong,
    fontSize: 18,
  },
  chartWrap: {
    marginTop: 8,
  },
  chart: {
    borderRadius: 8,
  },
  logs: {
    marginTop: 14,
    gap: 8,
  },
  logsTitle: {
    fontFamily: Typography.body,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  logText: {
    fontFamily: Typography.body,
    fontSize: 12,
  },
});


