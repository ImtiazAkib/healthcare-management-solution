import mongoose from 'mongoose';

import { ServiceItem } from '@/models';

import { SERVICE_CATEGORIES } from '@/constants/service.const';

import { connectToDatabase } from '@/lib/mongodb';
import { ServiceItemCreateSchema } from '@/lib/schemas';
import { ServiceItemService } from '@/lib/services';
import { formatMoney, toMinorUnits } from '@/lib/utils';

/*
  Exercises ServiceItemService and the money handling against a real database, then removes
  what it made.

  The substance is twofold: the catalogue's uniqueness and deactivate-not-delete rules, and the
  money round trip the plan is explicit about — a price entered as `500.50` is stored as the
  integer 50050 and renders back as `500.50`, with no floating-point drift.

  Fixtures carry a run-scoped suffix and are removed by it in a `finally`.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const NAME_TAG = `zz-svc-${SUFFIX}`;

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  ok    ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL  ${label}`, detail ?? '');
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await ServiceItem.createIndexes();

  const service = new ServiceItemService();

  try {
    console.log('Money — no floating-point drift');
    check('toMinorUnits("500.50") is 50050', toMinorUnits('500.50') === 50050);
    check('toMinorUnits("500") is 50000', toMinorUnits('500') === 50000);
    check('toMinorUnits("0.05") is 5', toMinorUnits('0.05') === 5);
    check('toMinorUnits tolerates the symbol ("৳500.50")', toMinorUnits('৳500.50') === 50050);
    check('toMinorUnits("5.5.5") is NaN', Number.isNaN(toMinorUnits('5.5.5')));
    check('formatMoney(50050) is "500.50"', formatMoney(50050) === '500.50');
    check('formatMoney(5) is "0.05"', formatMoney(5) === '0.05');

    console.log('\nSchema — parses major-unit text to minor units');
    const parsed = ServiceItemCreateSchema.safeParse({
      name: `X-Ray ${NAME_TAG}`,
      code: `XR${SUFFIX}`,
      category: SERVICE_CATEGORIES.LAB,
      description: '',
      price: '500.50',
    });
    check('the create schema turns "500.50" into 50050', parsed.success && parsed.data.price === 50050, parsed.success ? parsed.data : parsed.error);

    const badPrice = ServiceItemCreateSchema.safeParse({
      name: `Bad ${NAME_TAG}`,
      code: `BAD${SUFFIX}`,
      category: SERVICE_CATEGORIES.LAB,
      description: '',
      price: 'free',
    });
    check('a non-numeric price is refused by the schema', !badPrice.success);

    console.log('\nCreate — unique name and code, price stored as minor units');
    if (!parsed.success) {
      throw new Error('cannot continue without a parsed create input');
    }
    const created = await service.create(parsed.data);
    check('a service is created, active by default', created.success && created.result?.isActive === true, created.errors);
    check('the price is stored as 50050 minor units', created.result?.priceMinorUnits === 50050, created.result?.priceMinorUnits);
    check('and renders back as "500.50"', formatMoney(created.result?.priceMinorUnits ?? -1) === '500.50');

    const serviceItemId = created.result?.serviceItemId ?? '';

    const dupName = await service.create({
      name: `X-Ray ${NAME_TAG}`,
      code: `XR2${SUFFIX}`,
      category: SERVICE_CATEGORIES.LAB,
      description: undefined,
      price: 100,
    });
    check('a duplicate name is refused on the name field', !dupName.success && dupName.errors[0]?.field === 'name', dupName.errors);

    const dupCode = await service.create({
      name: `CT Scan ${NAME_TAG}`,
      code: `XR${SUFFIX}`,
      category: SERVICE_CATEGORIES.LAB,
      description: undefined,
      price: 100,
    });
    check('a duplicate code is refused on the code field', !dupCode.success && dupCode.errors[0]?.field === 'code', dupCode.errors);

    console.log('\nUpdate — re-price and rename');
    const updated = await service.update({
      serviceItemId,
      name: `X-Ray chest ${NAME_TAG}`,
      code: `XR${SUFFIX}`,
      category: SERVICE_CATEGORIES.PROCEDURE,
      description: undefined,
      price: 75000,
    });
    check(
      'a service can be re-priced and re-categorized',
      updated.success && updated.result?.priceMinorUnits === 75000 && updated.result?.category === SERVICE_CATEGORIES.PROCEDURE,
      updated.errors
    );

    console.log('\nActivation — deactivate then reactivate');
    const deactivated = await service.setActive({ serviceItemId, isActive: false });
    check('a service can be deactivated', deactivated.success && deactivated.result?.isActive === false);

    const reactivated = await service.setActive({ serviceItemId, isActive: true });
    check('and reactivated', reactivated.success && reactivated.result?.isActive === true);

    console.log('\nList — category, status and search filters');
    await service.create({
      name: `Consult ${NAME_TAG}`,
      code: `CON${SUFFIX}`,
      category: SERVICE_CATEGORIES.CONSULTATION,
      description: undefined,
      price: 30000,
    });

    const proceduresOnly = await service.list({ category: SERVICE_CATEGORIES.PROCEDURE, status: 'all', query: '' });
    check(
      'the category filter narrows to that category',
      proceduresOnly.result.every(item => item.category === SERVICE_CATEGORIES.PROCEDURE)
    );

    const searched = await service.list({ category: 'all', status: 'all', query: `CON${SUFFIX}` });
    check(
      'a search matches on code',
      searched.result.some(item => item.code === `CON${SUFFIX}`)
    );

    console.log('\nDelete — removes the row');
    const deleted = await service.delete(serviceItemId);
    check('a service can be deleted', deleted.success, deleted.errors);
    check('and is gone afterwards', (await service.getById(serviceItemId)).success === false);
  } finally {
    console.log('\nCleaning up');
    const removed = await ServiceItem.deleteMany({ $or: [{ name: new RegExp(NAME_TAG) }, { code: new RegExp(SUFFIX) }] });
    console.log(`  removed ${removed.deletedCount} service(s)`);
    check('nothing this run created is left behind', (await ServiceItem.countDocuments({ code: new RegExp(SUFFIX) })) === 0);

    await mongoose.disconnect();
  }

  console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

verify().catch(async error => {
  console.error('Verification failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
