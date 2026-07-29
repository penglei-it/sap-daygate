import { PACKS } from '../src/packs';
import { validatePack } from '../src/core/acceptance';

let failed = 0;
for (const pack of PACKS) {
  const result = validatePack(pack);
  const errors = result.issues.filter((i) => i.level === 'error');
  if (errors.length) {
    failed += 1;
    console.error(`FAIL ${pack.id}`);
    for (const e of errors) {
      console.error(`  day=${e.dayIndex ?? '-'} ${e.message}`);
    }
  } else {
    console.log(
      `OK ${pack.id} days=${pack.days.length} warnings=${result.issues.length}`,
    );
  }
}

if (failed) {
  console.error(`Pack validation failed: ${failed} pack(s)`);
  process.exit(1);
}

console.log(`All ${PACKS.length} packs passed acceptance quality gate.`);
