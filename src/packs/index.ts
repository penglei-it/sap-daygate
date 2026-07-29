import type { CurriculumPack, PersonTypeId } from '../types/curriculum';
import { examGaoxiangPack } from './examGaoxiangPack';
import { sapAbapPack } from './sapAbapPack';
import { skillTypescriptPack } from './skillTypescriptPack';
import { taskOkrPack } from './taskOkrPack';

/**
 * All built-in curriculum packs.
 */
export const BUILTIN_PACKS: CurriculumPack[] = [
  sapAbapPack,
  examGaoxiangPack,
  skillTypescriptPack,
  taskOkrPack,
];

/** @deprecated Use BUILTIN_PACKS or mergeWithCustomPacks. */
export const PACKS = BUILTIN_PACKS;

/**
 * Merges built-in packs with user-imported custom packs (custom overrides same id).
 * @param customPacks - Hot-loaded packs from user state.
 */
export function mergeWithCustomPacks(
  customPacks: CurriculumPack[] = [],
): CurriculumPack[] {
  const map = new Map<string, CurriculumPack>();
  for (const p of BUILTIN_PACKS) map.set(p.id, p);
  for (const p of customPacks) map.set(p.id, p);
  return [...map.values()];
}

/**
 * Finds a pack by id among merged catalog.
 * @param id - Pack id.
 * @param customPacks - Optional custom packs.
 */
export function getPack(
  id: string,
  customPacks: CurriculumPack[] = [],
): CurriculumPack {
  const all = mergeWithCustomPacks(customPacks);
  return all.find((p) => p.id === id) ?? all[0];
}

/**
 * Lists packs compatible with a person type.
 * @param personTypeId - Selected person type.
 * @param customPacks - Optional custom packs.
 */
export function listPacksForPerson(
  personTypeId: PersonTypeId,
  customPacks: CurriculumPack[] = [],
): CurriculumPack[] {
  return mergeWithCustomPacks(customPacks).filter((p) =>
    p.supportedPersonTypes.includes(personTypeId),
  );
}
