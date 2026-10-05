import { resetLocalDatabase } from '../reset-local.mjs';

export default async function setup() {
  await resetLocalDatabase();
}
