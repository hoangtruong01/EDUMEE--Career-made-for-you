import { createHash } from 'crypto';

/**
 * Hàm nhận vào chuỗi và mã hoá theo chuẩn sha256
 */
function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Hàm nhận vào password và trả về password đã mã hoá kèm Secret Key
 * @param password Mật khẩu thuần
 * @param secret Secret key lấy từ file .env (PASSWORD_SECRET)
 */
export function hashPassword(password: string): string {
  // Lưu ý: Đảm bảo biến môi trường PASSWORD_SECRET đã được định nghĩa trong .env
  const secret = process.env.PASSWORD_SECRET || '123@#';
  return sha256(password + secret);
}
