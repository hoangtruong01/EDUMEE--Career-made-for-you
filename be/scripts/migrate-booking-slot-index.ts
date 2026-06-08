import mongoose from 'mongoose';

const COLLECTION_NAME = 'booking_sessions';
const LEGACY_INDEX_NAME = 'availabilitySlotId_1';
const ACTIVE_SLOT_INDEX_NAME = 'booking_session_active_slot_unique';

const ACTIVE_SLOT_BOOKING_STATUSES = ['awaiting_payment', 'pending', 'confirmed', 'rescheduled'];

function getDatabaseUri(): string {
  const uri = process.env.DATABASE_URI?.trim() || process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('Missing MongoDB connection string. Set DATABASE_URI or MONGODB_URI.');
  }
  return uri;
}

async function migrateBookingSlotIndex(): Promise<void> {
  await mongoose.connect(getDatabaseUri());
  const collection = mongoose.connection.collection(COLLECTION_NAME);

  const indexes = (await collection.indexes()) as Array<{ name?: string }>;
  const hasLegacyIndex = indexes.some((index) => index.name === LEGACY_INDEX_NAME);

  if (hasLegacyIndex) {
    await collection.dropIndex(LEGACY_INDEX_NAME);
    console.log(`Dropped legacy index ${LEGACY_INDEX_NAME}.`);
  } else {
    console.log(`Legacy index ${LEGACY_INDEX_NAME} was not present.`);
  }

  const refreshedIndexes = (await collection.indexes()) as Array<{ name?: string }>;
  const hasActiveSlotIndex = refreshedIndexes.some(
    (index) => index.name === ACTIVE_SLOT_INDEX_NAME,
  );

  if (hasActiveSlotIndex) {
    console.log(`Index ${ACTIVE_SLOT_INDEX_NAME} already exists.`);
    return;
  }

  await collection.createIndex(
    { availabilitySlotId: 1 },
    {
      unique: true,
      name: ACTIVE_SLOT_INDEX_NAME,
      partialFilterExpression: {
        status: { $in: ACTIVE_SLOT_BOOKING_STATUSES },
      },
    },
  );
  console.log(`Created partial unique index ${ACTIVE_SLOT_INDEX_NAME}.`);
}

migrateBookingSlotIndex()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if ((mongoose.connection.readyState as number) !== 0) {
      await mongoose.disconnect();
    }
  });
