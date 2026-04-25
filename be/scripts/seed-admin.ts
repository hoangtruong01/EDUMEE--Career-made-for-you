import * as fs from 'node:fs';
import * as path from 'node:path';

import * as bcrypt from 'bcrypt';
import mongoose, { Model } from 'mongoose';

import { User, UserSchema } from '../src/modules/users/schemas/user.schema';
import { UserRole, UserVerifyStatus } from '../src/common/enums/user-role.enum';

const REQUIRED_ENV_KEYS = [
  'ADMIN_SEED_EMAIL',
  'ADMIN_SEED_PASSWORD',
  'ADMIN_SEED_NAME',
  'ADMIN_SEED_GENDER',
  'ADMIN_SEED_DATE_OF_BIRTH',
  'ADMIN_SEED_USERNAME',
] as const;

type RequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number];

interface SeedAdminConfig {
  email: string;
  password: string;
  name: string;
  gender: string;
  dateOfBirth: Date;
  username: string;
}

interface SeedResult {
  action: 'created' | 'updated';
  email: string;
  role: UserRole;
  userId: string;
}

function loadEnvFiles(): void {
  const cwd = process.cwd();
  const envFiles = ['.env', '.env.local'];
  const externallyProvidedKeys = new Set(Object.keys(process.env));

  for (const fileName of envFiles) {
    const filePath = path.join(cwd, fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const parsed = parseEnvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      if (externallyProvidedKeys.has(key)) {
        continue;
      }
      process.env[key] = value;
    }
  }
}

function parseEnvFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf8');
  const entries: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key) {
      continue;
    }

    const rawValue = line.slice(separatorIndex + 1).trim();
    entries[key] = stripWrappingQuotes(rawValue);
  }

  return entries;
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function getRequiredEnv(key: RequiredEnvKey): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getDatabaseUri(): string {
  const uri = process.env.DATABASE_URI?.trim() || process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('Missing MongoDB connection string. Set DATABASE_URI or MONGODB_URI.');
  }

  return uri;
}

function buildSeedConfig(): SeedAdminConfig {
  const dateOfBirthRaw = getRequiredEnv('ADMIN_SEED_DATE_OF_BIRTH');
  const dateOfBirth = new Date(dateOfBirthRaw);

  if (Number.isNaN(dateOfBirth.getTime())) {
    throw new Error('ADMIN_SEED_DATE_OF_BIRTH must be a valid date string, for example 1990-01-01.');
  }

  return {
    email: getRequiredEnv('ADMIN_SEED_EMAIL').toLowerCase(),
    password: getRequiredEnv('ADMIN_SEED_PASSWORD'),
    name: getRequiredEnv('ADMIN_SEED_NAME'),
    gender: getRequiredEnv('ADMIN_SEED_GENDER'),
    dateOfBirth,
    username: getRequiredEnv('ADMIN_SEED_USERNAME'),
  };
}

function getUserModel(): Model<User> {
  const existingModel = mongoose.models[User.name] as Model<User> | undefined;
  return existingModel ?? mongoose.model<User>(User.name, UserSchema);
}

async function upsertAdmin(model: Model<User>, config: SeedAdminConfig): Promise<SeedResult> {
  const hashedPassword = await bcrypt.hash(config.password, 12);

  const updatePayload = {
    name: config.name,
    gender: config.gender,
    date_of_birth: config.dateOfBirth,
    password: hashedPassword,
    role: UserRole.ADMIN,
    verify: UserVerifyStatus.Verified,
    username: config.username,
    email_verify_token: '',
    forgot_password_token: '',
  };

  const existing = await model.findOne({ email: config.email }).exec();

  if (existing) {
    const updated = await model
      .findByIdAndUpdate(existing._id, { $set: updatePayload }, { new: true, runValidators: true })
      .exec();

    if (!updated) {
      throw new Error('Failed to update existing admin account.');
    }

    return {
      action: 'updated',
      email: updated.email,
      role: updated.role,
      userId: updated._id.toString(),
    };
  }

  const created = await model.create({
    ...updatePayload,
    email: config.email,
    phone_number: '',
    Address: {},
    location: '',
    avatar: '',
  });

  return {
    action: 'created',
    email: created.email,
    role: created.role,
    userId: created._id.toString(),
  };
}

async function main(): Promise<void> {
  loadEnvFiles();

  const dbUri = getDatabaseUri();
  const config = buildSeedConfig();

  await mongoose.connect(dbUri);

  const userModel = getUserModel();
  const result = await upsertAdmin(userModel, config);

  console.log(`[seed:admin] Admin account ${result.action}.`);
  console.log(`[seed:admin] Email: ${result.email}`);
  console.log(`[seed:admin] Role: ${result.role}`);
  console.log(`[seed:admin] User ID: ${result.userId}`);
}

void main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[seed:admin] Failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
