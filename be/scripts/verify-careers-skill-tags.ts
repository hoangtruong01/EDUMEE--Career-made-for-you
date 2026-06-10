import * as fs from 'node:fs';
import * as path from 'node:path';

import mongoose from 'mongoose';

import { Career, CareerSchema } from '../src/modules/careers/schemas/career.schema';
import { SkillTag, SkillTagSchema } from '../src/modules/careers/schemas/skill-tag.schema';

function loadEnvFiles(): void {
  const cwd = process.cwd();
  const envFiles = ['.env', '.env.local'];
  const externallyProvidedKeys = new Set(Object.keys(process.env));

  for (const fileName of envFiles) {
    const filePath = path.join(cwd, fileName);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = line.slice(0, separatorIndex).trim();
      const value = line
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      if (key && !externallyProvidedKeys.has(key)) process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFiles();
  const uri =
    process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/edumee';
  await mongoose.connect(uri);

  const CareerModel = mongoose.model<Career>('Career', CareerSchema);
  const SkillTagModel = mongoose.model<SkillTag>('SkillTag', SkillTagSchema);

  const [careerCount, skillCount, sharedSkills] = await Promise.all([
    CareerModel.countDocuments({ isActive: true }).exec(),
    SkillTagModel.countDocuments({ isActive: true }).exec(),
    SkillTagModel.find({ isActive: true, usageCount: { $gte: 2 } })
      .sort({ usageCount: -1, name: 1 })
      .limit(8)
      .lean()
      .exec(),
  ]);

  console.log(`[verify:careers] Active careers: ${careerCount}`);
  console.log(`[verify:careers] Active skill tags: ${skillCount}`);
  console.log('[verify:careers] Shared skill tags:');
  sharedSkills.forEach((skill) => {
    console.log(`- ${skill.name}: ${skill.usageCount} careers`);
  });
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[verify:careers] Failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
