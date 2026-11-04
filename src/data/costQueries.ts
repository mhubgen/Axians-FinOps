// Builders for Azure Cost Management "Query" API request bodies.
// API: POST https://management.azure.com/subscriptions/{subId}
//        /providers/Microsoft.CostManagement/query?api-version=2023-11-01
// These are pure helpers; the actual HTTP call is performed by the connector
// adapter (see azureCostProvider.ts).

export const COST_MGMT_API_VERSION = '2023-11-01';

export function scopeForSubscription(subscriptionId: string): string {
  return `/subscriptions/${subscriptionId}`;
}

export function queryUrl(subscriptionId: string): string {
  return (
    `https://management.azure.com${scopeForSubscription(subscriptionId)}` +
    `/providers/Microsoft.CostManagement/query?api-version=${COST_MGMT_API_VERSION}`
  );
}

export interface CostQueryBody {
  type: 'ActualCost';
  timeframe: 'MonthToDate' | 'Custom';
  timePeriod?: { from: string; to: string };
  dataset: {
    granularity: 'None' | 'Daily' | 'Monthly';
    aggregation: Record<string, { name: string; function: 'Sum' }>;
    grouping?: Array<{ type: 'Dimension'; name: string }>;
  };
}

const totalCostAggregation = {
  totalCost: { name: 'Cost', function: 'Sum' as const },
};

// The Query API accepts at most 2 aggregation clauses.
const costAndQuantityAggregation = {
  ...totalCostAggregation,
  totalQuantity: { name: 'UsageQuantity', function: 'Sum' as const },
};

/** First and last day (ISO) of a 'YYYY-MM' month. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const to = new Date(Date.UTC(y, m, 0, 23, 59, 59)).toISOString();
  return { from, to };
}

function buildDetailedRangeQuery(
  from: string,
  to: string,
  granularity: 'None' | 'Daily' | 'Monthly',
): CostQueryBody {
  return {
    type: 'ActualCost',
    timeframe: 'Custom',
    timePeriod: { from, to },
    dataset: {
      granularity,
      aggregation: costAndQuantityAggregation,
      grouping: [
        { type: 'Dimension', name: 'ResourceGroupName' },
        { type: 'Dimension', name: 'ServiceName' },
        { type: 'Dimension', name: 'MeterCategory' },
        { type: 'Dimension', name: 'MeterSubCategory' },
        { type: 'Dimension', name: 'Meter' },
      ],
    },
  };
}

/** Monthly totals grouped by service and meter for a single month. */
export function buildBreakdownQuery(month: string): CostQueryBody {
  const { from, to } = monthRange(month);
  return buildDetailedRangeQuery(from, to, 'None');
}

/** Detailed daily rows; one response feeds totals, line items and weekly data. */
export function buildDailyQuery(month: string): CostQueryBody {
  const { from, to } = monthRange(month);
  return buildDetailedRangeQuery(from, to, 'Daily');
}

/** Detailed monthly rows; one response feeds annual totals, line items and trend. */
export function buildAnnualQuery(from: string, to: string): CostQueryBody {
  return buildDetailedRangeQuery(from, to, 'Monthly');
}

