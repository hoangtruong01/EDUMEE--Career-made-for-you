import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="bg-gradient-card flex min-h-screen items-center justify-center p-6">
      <div className="glass-card w-full max-w-md rounded-2xl p-8 text-center">
        <h1 className="font-display mb-2 text-2xl font-bold">Không có quyền truy cập</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Tài khoản của bạn không có quyền vào khu vực này. Vui lòng quay lại dashboard.
        </p>
        <Link
          href="/dashboard"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex rounded-lg px-4 py-2 text-sm font-medium"
        >
          Quay lại dashboard
        </Link>
      </div>
    </div>
  );
}
