import { describe, it, expect } from 'vitest';
import { PRODUCT_NAMES, USER_MESSAGES } from './productCopy';
import { PLAN_DISPLAY } from './plans';

const BANNED = [
  'Claude',
  'Gemini',
  'Anthropic',
  'Google AI',
  'FreeAstroAPI',
  'model_name',
  'provider',
  'token',
  'webhook',
];

function assertClean(value: string) {
  for (const term of BANNED) {
    expect(value.toLowerCase()).not.toContain(term.toLowerCase());
  }
}

describe('front-facing copy never leaks model/provider names', () => {
  it('product names are clean', () => {
    Object.values(PRODUCT_NAMES).forEach(assertClean);
  });
  it('user messages are clean', () => {
    Object.values(USER_MESSAGES).forEach(assertClean);
  });
  it('plan display copy is clean', () => {
    for (const p of PLAN_DISPLAY) {
      assertClean(p.title);
      assertClean(p.price);
      p.features.forEach(assertClean);
      assertClean(p.buttonText);
    }
  });
});
