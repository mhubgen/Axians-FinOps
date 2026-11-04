// Central place to choose the active cost data provider.
//
// Live: Azure Cost Management via the "HTTP with Microsoft Entra ID" connector
// (shared_webcontents). The signed-in user's delegated identity (Cost
// Management Reader) authorizes the calls — no service principal, no secret.
// Set USE_LIVE_DATA = false to fall back to demo data.

import { MockCostProvider, type CostDataProvider } from './costProvider';
import { createAzureCostProvider, type CostQueryFn } from './azureCostProvider';
import { queryUrl, type CostQueryBody } from './costQueries';
import { createCachedCostProvider } from './cachedCostProvider';
import { CostQueryThrottle } from './queryThrottle';
import type { CostQueryResponse } from './costMapping';
import { HTTPwithMicrosoftEntraID_preauthorized_Service as HttpService } from '../generated/services/HTTPwithMicrosoftEntraID_preauthorized_Service';

/** Azure subscription used as the Cost Management query scope. */
export const SUBSCRIPTION_ID = '99495075-933b-466d-bb21-0e0a44fbe606';

/** Toggle between live Azure Cost Management and demo data. */
const USE_LIVE_DATA = true;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const queryThrottle = new CostQueryThrottle();

/** Detects Cost Management throttling (HTTP 429 / "Too many requests"). */
function isThrottled(value: unknown): boolean {
  if (value == null) return false;
  let s = '';
  try {
    s = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    s = String(value);
  }
  s += ' ' + String((value as { message?: string })?.message ?? '');
  return s.includes('429') || /too many requests/i.test(s);
}

/** Extracts a Cost Management error body ({ error: { code, message } }) if present. */
function costMgmtError(data: unknown): { code?: string; message?: string } | null {
  if (data && typeof data === 'object' && 'error' in data) {
    return (data as { error: { code?: string; message?: string } }).error;
  }
  return null;
}

const MAX_RETRIES = 3;
const DEFAULT_RETRY_AFTER_MS = 60_000;

function retryAfterMs(value: unknown): number | null {
  const values: number[] = [];

  const visit = (candidate: unknown, key = '', depth = 0): void => {
    if (depth > 5 || candidate == null) return;
    if (typeof candidate === 'object') {
      for (const [childKey, child] of Object.entries(candidate)) {
        visit(child, childKey, depth + 1);
      }
      return;
    }

    const numeric = Number(candidate);
    if (/retry.?after/i.test(key) && Number.isFinite(numeric) && numeric > 0) {
      values.push(/ms/i.test(key) ? numeric : numeric * 1000);
    }

    if (typeof candidate === 'string') {
      const match = candidate.match(/retry.?after\D{0,20}(\d+)/i);
      if (match) values.push(Number(match[1]) * 1000);
    }
  };

  visit(value);
  return values.length ? Math.max(...values) : null;
}

async function invokeWithRetry(
  body: CostQueryBody,
  url?: string,
  attempt = 0,
): Promise<CostQueryResponse> {
  await queryThrottle.schedule(body);
  const result = await HttpService.InvokeHttp({
    method: 'POST',
    url: url ?? queryUrl(SUBSCRIPTION_ID),
    headers: {
      'Content-Type': 'application/json',
      ClientType: 'AxiansCostDashboard',
    },
    body: JSON.stringify(body),
  });

  const retryable = attempt < MAX_RETRIES;

  // Transport-level failure (connector reported an error).
  if (!result.success) {
    if (retryable && isThrottled(result.error)) {
      await sleep((retryAfterMs(result.error) ?? DEFAULT_RETRY_AFTER_MS) + Math.random() * 1000);
      return invokeWithRetry(body, url, attempt + 1);
    }
    throw new Error(result.error?.message ?? 'Errore durante la query a Cost Management.');
  }

  const raw = result.data as unknown;
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

  // Some throttled responses come back as a 200 body with an error object.
  const cmErr = costMgmtError(data);
  if (cmErr) {
    if (retryable && (cmErr.code === '429' || isThrottled(cmErr))) {
      await sleep((retryAfterMs(raw) ?? DEFAULT_RETRY_AFTER_MS) + Math.random() * 1000);
      return invokeWithRetry(body, url, attempt + 1);
    }
    throw new Error(cmErr.message ?? `Cost Management: errore ${cmErr.code ?? ''}`.trim());
  }

  return data as CostQueryResponse;
}

const liveQueryFn: CostQueryFn = (body, url) => invokeWithRetry(body, url);

let provider: CostDataProvider | null = null;

export function getCostProvider(): CostDataProvider {
  if (!provider) {
    const source = USE_LIVE_DATA
      ? createAzureCostProvider(liveQueryFn, SUBSCRIPTION_ID)
      : new MockCostProvider();
    provider = createCachedCostProvider(source);
  }
  return provider;
}
