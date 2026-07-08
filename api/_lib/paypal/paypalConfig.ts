import { serverEnv } from '../env.js';
import type { PlanId } from '../../../shared/plans.js';

export interface PaypalPlanConfig {
  planId: PlanId;
  priceTwd: number;
  link: string;
}

export function getPaypalConfig() {
  return {
    clientId: serverEnv.paypal.clientId,
    clientSecret: serverEnv.paypal.clientSecret,
    webhookId: serverEnv.paypal.webhookId,
    env: serverEnv.paypal.env,
    apiBase:
      serverEnv.paypal.env === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com',
    plans: {
      pro_monthly: {
        planId: 'pro_monthly' as PlanId,
        priceTwd: serverEnv.paypal.plan99.priceTwd,
        link: serverEnv.paypal.plan99.link,
      },
      master_monthly: {
        planId: 'master_monthly' as PlanId,
        priceTwd: serverEnv.paypal.plan299.priceTwd,
        link: serverEnv.paypal.plan299.link,
      },
    } satisfies Record<Exclude<PlanId, 'free'>, PaypalPlanConfig>,
  };
}
