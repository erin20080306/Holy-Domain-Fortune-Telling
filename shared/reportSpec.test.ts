import { describe, expect, it } from 'vitest';
import { PLAN_DISPLAY } from './plans';
import { DEEP_REPORT_LENGTH_LABEL, DEEP_REPORT_SECTIONS } from './reportSpec';

describe('deep report product specification', () => {
  it('keeps paid plan copy aligned with the report prompt length', () => {
    const paidPlans = PLAN_DISPLAY.filter((plan) => plan.id !== 'free');
    expect(paidPlans).toHaveLength(2);
    for (const plan of paidPlans) {
      expect(plan.features.join('\n')).toContain(DEEP_REPORT_LENGTH_LABEL);
    }
    expect(DEEP_REPORT_SECTIONS).toHaveLength(8);
  });
});
