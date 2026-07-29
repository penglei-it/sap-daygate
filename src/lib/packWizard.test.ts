import { describe, expect, it } from 'vitest';
import { validatePack } from '../core/acceptance';
import { generatePackSkeleton, slugifyPackId } from './packWizard';

describe('packWizard', () => {
  it('slugifies titles', () => {
    expect(slugifyPackId('我的课表 ABC')).toMatch(/^wizard-/);
  });

  it('generates a 14-day pack that passes validatePack', () => {
    const result = generatePackSkeleton({
      title: '向导测试课表',
      dayCount: 14,
      titleTemplate: '第{n}天：练习',
      includeTwoGates: true,
      id: 'wizard-test-14',
    });
    expect(result.pack).toBeTruthy();
    expect(result.pack!.days).toHaveLength(14);
    expect(result.validation.ok).toBe(true);
    expect(validatePack(result.pack!).ok).toBe(true);
    const gates = result.pack!.days.filter((d) => d.gateId);
    expect(gates.length).toBe(2);
  });

  it('supports 21 days and single gate when includeTwoGates is false', () => {
    const result = generatePackSkeleton({
      title: '长骨架',
      dayCount: 21,
      titleTemplate: 'Day {n}',
      includeTwoGates: false,
      id: 'wizard-test-21',
    });
    expect(result.validation.ok).toBe(true);
    expect(result.pack!.days.filter((d) => d.gateId).length).toBe(1);
  });

  it('rejects invalid dayCount', () => {
    const result = generatePackSkeleton({
      title: '太短',
      dayCount: 7,
      titleTemplate: '第{n}天',
      includeTwoGates: true,
    });
    expect(result.pack).toBeNull();
    expect(result.validation.ok).toBe(false);
  });
});
