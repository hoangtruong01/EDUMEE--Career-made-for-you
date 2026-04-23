/**
 * Script tạo tài khoản Admin cho EDUMEE
 * Chạy: npx ts-node -r tsconfig-paths/register scripts/seed-admin.ts
 */

import * as bcrypt from 'bcrypt';
import mongoose from 'mongoose';

// ============================================================
// CẤU HÌNH TÀI KHOẢN ADMIN - SỬA TẠI ĐÂY NẾU CẦN
// ============================================================
const ADMIN_CONFIG = {
  name: 'Admin EDUMEE',
  email: 'admin@edumee.com',
  password: 'Admin@123456',
  gender: 'Other',
};
// ============================================================

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.DATABASE_URI ||
  'mongodb://localhost:27017/edumee';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    gender: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    date_of_birth: { type: Date, required: true },
    password: { type: String, required: true },
    phone_number: { type: String, default: '' },
    email_verify_token: { type: String, default: '' },
    forgot_password_token: { type: String, default: '' },
    verify: { type: Number, default: 1 }, // 1 = Verified
    role: { type: String, default: 'admin' },
    location: { type: String, default: '' },
    username: { type: String, default: '' },
    avatar: { type: String, default: '' },
  },
  {
    collection: 'users',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

async function seedAdmin() {
  console.log('\n🚀 EDUMEE - Script tạo tài khoản Admin');
  console.log('======================================');
  console.log(`📡 Kết nối MongoDB: ${MONGODB_URI}`);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB thành công!\n');

    const UserModel = mongoose.model('User', UserSchema);

    // Kiểm tra admin đã tồn tại chưa
    const existingAdmin = await UserModel.findOne({ email: ADMIN_CONFIG.email });

    if (existingAdmin) {
      console.log(`⚠️  Tài khoản admin đã tồn tại!`);
      console.log(`   Email: ${ADMIN_CONFIG.email}`);
      console.log(`   Role: ${existingAdmin.role}`);

      // Hỏi có muốn reset password không
      console.log('\n🔄 Đang reset password cho admin hiện tại...');
      const hashedPassword = await bcrypt.hash(ADMIN_CONFIG.password, 12);
      await UserModel.updateOne(
        { email: ADMIN_CONFIG.email },
        {
          $set: {
            password: hashedPassword,
            role: 'admin',
            verify: 1,
          },
        },
      );
      console.log('✅ Đã reset password thành công!');
    } else {
      // Tạo tài khoản admin mới
      const hashedPassword = await bcrypt.hash(ADMIN_CONFIG.password, 12);
      const adminId = new mongoose.Types.ObjectId();

      await UserModel.create({
        _id: adminId,
        name: ADMIN_CONFIG.name,
        email: ADMIN_CONFIG.email,
        password: hashedPassword,
        gender: ADMIN_CONFIG.gender,
        date_of_birth: new Date('1990-01-01'),
        role: 'admin',
        verify: 1, // Verified
        username: `admin${adminId.toString()}`,
        email_verify_token: '',
        forgot_password_token: '',
      });

      console.log('✅ Tạo tài khoản Admin thành công!');
    }

    console.log('\n========================================');
    console.log('📋 THÔNG TIN TÀI KHOẢN ADMIN:');
    console.log('========================================');
    console.log(`   📧 Email   : ${ADMIN_CONFIG.email}`);
    console.log(`   🔑 Mật khẩu: ${ADMIN_CONFIG.password}`);
    console.log(`   👤 Role    : admin`);
    console.log('========================================');
    console.log('🌐 Đăng nhập tại: http://localhost:3000/admin-login');
    console.log('   (Ấn logo 5 lần ở trang /login để vào trang admin)');
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB.');
  }
}

void seedAdmin();
