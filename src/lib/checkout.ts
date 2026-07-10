import type { PlanId } from '@shared/plans';
import { api } from './api';

export async function beginPaypalCheckout(plan: Exclude<PlanId, 'free'>): Promise<string | null> {
  try {
    const response = await api.createCheckout(plan);
    if (!response?.ok || !response.checkout_url) {
      return response?.message ?? '目前無法建立付款連結，請稍後再試。';
    }

    window.location.assign(response.checkout_url);
    return null;
  } catch {
    return '目前無法建立付款連結，請檢查網路後再試。';
  }
}
