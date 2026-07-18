// Manual one-shot trigger for pollAppRegisteredInventory() (#270 verification).
// Bypasses the CRON_SECRET-gated /api/cron/inventory-sync route (local secret
// mismatch with prod, see TASK_BRIDGE (107)) by calling the underlying function
// directly against the same DB the app uses.
import { pollAppRegisteredInventory } from '../src/lib/dome-inventory-poller';

pollAppRegisteredInventory()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error('POLL_FAILED', err);
    process.exit(1);
  });
