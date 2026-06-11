import mongoose from 'mongoose';

const COLLECTION_NAME = 'booking_sessions';
const AVAILABILITY_COLLECTION_NAME = 'mentor_availability_slots';
const LEGACY_INDEX_NAME = 'availabilitySlotId_1';
const ACTIVE_SLOT_INDEX_NAME = 'booking_session_active_slot_unique';

const ACTIVE_SLOT_BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'rescheduled',
];

type AwaitingBookingSlot = {
  _id: mongoose.Types.ObjectId;
  availabilitySlotId?: mongoose.Types.ObjectId | null;
};

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

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
  const availabilityCollection = mongoose.connection.collection(AVAILABILITY_COLLECTION_NAME);

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
    await collection.dropIndex(ACTIVE_SLOT_INDEX_NAME);
    console.log(`Dropped existing index ${ACTIVE_SLOT_INDEX_NAME}.`);
  }

  await collection.createIndex(
    { availabilitySlotId: 1 },
    {
      unique: true,
      name: ACTIVE_SLOT_INDEX_NAME,
      partialFilterExpression: {
        availabilitySlotId: { $exists: true },
        status: { $in: ACTIVE_SLOT_BOOKING_STATUSES },
      },
    },
  );
  console.log(`Created partial unique index ${ACTIVE_SLOT_INDEX_NAME}.`);

  const awaitingBookings = await collection
    .find<AwaitingBookingSlot>(
      {
        status: 'awaiting_payment',
        availabilitySlotId: { $exists: true, $ne: null },
      },
      { projection: { _id: 1, availabilitySlotId: 1 } },
    )
    .toArray();

  const bookingIdCandidates = awaitingBookings.flatMap((booking) => [
    booking._id,
    booking._id?.toString?.(),
  ]).filter(isPresent);
  const slotIds = awaitingBookings
    .map((booking) => booking.availabilitySlotId)
    .filter(isPresent);

  if (bookingIdCandidates.length && slotIds.length) {
    const releaseResult = await availabilityCollection.updateMany(
      {
        _id: { $in: slotIds },
        status: 'held',
        bookingSessionId: { $in: bookingIdCandidates },
      },
      {
        $set: { status: 'available' },
        $unset: { bookingSessionId: 1, heldBy: 1, heldUntil: 1 },
      },
    );
    console.log(`Released ${releaseResult.modifiedCount} held availability slots from awaiting-payment bookings.`);
  } else {
    console.log('No awaiting-payment held slots needed release.');
  }
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
