// Classification + normalization of Azure Cost Management query responses
// into the dashboard domain model.

import type { CostBucket } from '../types/cost';

// Shape returned by the Cost Management Query API.
export interface CostQueryResponse {
  properties: {
    columns: Array<{ name: string; type: string }>;
    rows: Array<Array<string | number>>;
    /** Present when the result is truncated; points at the next page of rows. */
    nextLink?: string | null;
  };
}

const PP_SERVICES = ['power platform', 'power apps', 'power automate', 'power virtual agents'];
const PP_CATEGORIES = ['ai builder', 'copilot studio', 'power virtual agents', 'copilot'];
const FOUNDRY_SERVICES = ['cognitive services', 'azure openai', 'azure ai services', 'machine learning'];
const FOUNDRY_CATEGORIES = ['azure openai', 'azure ai foundry', 'cognitive services', 'ai foundry'];
/** Resource groups whose costs are attributed to AI Foundry models. */
const FOUNDRY_RESOURCE_GROUPS = ['ai-operations', 'ai operations', 'aioperations'];

/**
 * Map a Cost Management row to a dashboard bucket, or null if it belongs to
 * neither Power Platform PAYG nor AI Foundry.
 */
export function classifyBucket(
  serviceName: string | undefined,
  meterCategory: string | undefined,
  resourceGroup?: string | undefined,
): CostBucket | null {
  const svc = (serviceName ?? '').toLowerCase();
  const cat = (meterCategory ?? '').toLowerCase();
  const rg = (resourceGroup ?? '').toLowerCase();

  // AI Foundry model costs live in a dedicated resource group.
  if (FOUNDRY_RESOURCE_GROUPS.some((r) => rg.includes(r))) {
    return 'aiFoundry';
  }

  // Power Platform PAYG: AI Builder / Copilot credits.
  if (
    cat.includes('ai builder') ||
    cat.includes('copilot') ||
    PP_CATEGORIES.some((c) => cat.includes(c)) ||
    PP_SERVICES.some((s) => svc.includes(s))
  ) {
    return 'powerPlatform';
  }

  // AI Foundry / Azure OpenAI by service or meter category.
  if (
    FOUNDRY_CATEGORIES.some((c) => cat.includes(c)) ||
    FOUNDRY_SERVICES.some((s) => svc.includes(s))
  ) {
    return 'aiFoundry';
  }

  return null;
}

/** Case-insensitive column index lookup. */
export function columnIndex(
  columns: Array<{ name: string }>,
  name: string,
): number {
  return columns.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
}
