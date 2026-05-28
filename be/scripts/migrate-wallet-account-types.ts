import 'dotenv/config';
import mongoose from 'mongoose';

const COLLECTION_NAME = 'wallet_accounts';
const NEW_INDEX_NAME = 'wallet_account_user_currency_type_unique';
const DEFAULT_ACCOUNT_TYPE = 'edumee_credit';
const WALLET_ACCOUNT_TYPE_INDEX_KEY = { userId: 1, currency: 1, accountType: 1 } as const;

function getDatabaseUri(): string {
  const uri = process.env.DATABASE_URI?.trim() || process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('Missing MongoDB connection string. Set DATABASE_URI or MONGODB_URI.');
  }
  return uri;
}

function getIndexKey(index: mongoose.mongo.IndexDescription): Record<string, unknown> {
  const key = (index.key instanceof Map
    ? Object.fromEntries(index.key.entries())
    : index.key || {}) as Record<string, unknown>;
  return key;
}

function hasExactIndexKey(
  index: mongoose.mongo.IndexDescription,
  expected: Record<string, 1 | -1>,
): boolean {
  const key = getIndexKey(index);
  const keyNames = Object.keys(key);
  const expectedNames = Object.keys(expected);
  return (
    keyNames.length === expectedNames.length &&
    expectedNames.every((field) => key[field] === expected[field])
  );
}

function isLegacyWalletIndex(index: mongoose.mongo.IndexDescription): boolean {
  const key = getIndexKey(index);
  return Boolean(
    index.unique &&
      key.userId === 1 &&
      key.currency === 1 &&
      key.accountType === undefined &&
      Object.keys(key).length === 2,
  );
}

function isWalletAccountTypeIndex(index: mongoose.mongo.IndexDescription): boolean {
  return hasExactIndexKey(index, WALLET_ACCOUNT_TYPE_INDEX_KEY);
}

async function migrateWalletAccountTypes(): Promise<void> {
  await mongoose.connect(getDatabaseUri());
  const collection = mongoose.connection.collection(COLLECTION_NAME);

  const backfillResult = await collection.updateMany(
    { accountType: { $exists: false } },
    { $set: { accountType: DEFAULT_ACCOUNT_TYPE } },
  );
  console.log(`Backfilled accountType on ${backfillResult.modifiedCount} wallet account(s).`);

  const indexes = await collection.indexes();
  const legacyIndexes = indexes.filter(isLegacyWalletIndex);
  for (const index of legacyIndexes) {
    if (!index.name) continue;
    await collection.dropIndex(index.name);
    console.log(`Dropped legacy wallet index ${index.name}.`);
  }

  const refreshedIndexes = await collection.indexes();
  const namedIndex = refreshedIndexes.find((index) => index.name === NEW_INDEX_NAME);
  if (namedIndex) {
    console.log(`Index ${NEW_INDEX_NAME} already exists.`);
    return;
  }

  const equivalentIndexes = refreshedIndexes.filter(isWalletAccountTypeIndex);
  for (const index of equivalentIndexes) {
    if (!index.name) continue;
    await collection.dropIndex(index.name);
    console.log(`Dropped wallet account type index ${index.name} so it can be recreated with the expected name.`);
  }

  await collection.createIndex(
    { userId: 1, currency: 1, accountType: 1 },
    { unique: true, name: NEW_INDEX_NAME },
  );
  console.log(`Created unique index ${NEW_INDEX_NAME}.`);
}

migrateWalletAccountTypes()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
