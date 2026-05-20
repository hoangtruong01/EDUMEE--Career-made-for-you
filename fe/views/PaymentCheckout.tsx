'use client';

import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { paymentService, type PaymentCheckoutSession } from '@/lib/payment.service';
import { AlertCircle, ArrowLeft, CalendarClock, CreditCard, Loader2, ReceiptText, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

function formatMoney(amount?: number, currency = 'VND') {
  if (!amount) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatSessionType(value?: string) {
  if (!value) return 'Mentor booking';
  return value.replace(/_/g, ' ');
}

function formatDateTime(value?: string) {
  if (!value) return 'Chưa có lịch';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có lịch';
  return date.toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getExpiryLabel(expiresAt?: string) {
  if (!expiresAt) return '15 phút';
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - Date.now();
  if (Number.isNaN(expiry) || diff <= 0) return 'Đã hết hạn';
  const minutes = Math.max(1, Math.ceil(diff / 60_000));
  return `${minutes} phút`;
}

export default function PaymentCheckout({ token }: { token: string }) {
  const [session, setSession] = useState<PaymentCheckoutSession | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    paymentService
      .getCheckoutSession(token)
      .then((data) => {
        if (!active) return;
        setSession(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Không thể tải phiên thanh toán.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const expiresAt = session?.expiresAt;
  const isExpired = useMemo(() => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt).getTime();
    return Number.isFinite(expiry) && expiry <= now;
  }, [expiresAt, now]);

  const hiddenFields = useMemo(
    () => (session ? Object.entries(session.fields).filter(([, value]) => value !== undefined && value !== null) : []),
    [session],
  );

  const isMentorBooking = session?.purpose === 'mentor_booking';
  const backHref = isMentorBooking ? '/mentor-matching' : '/dashboard';
  const backLabel = isMentorBooking ? 'Quay lại mentor' : 'Quay lại dashboard';
  const pageTitle = isMentorBooking ? 'Xác nhận thanh toán mentor' : 'Xác nhận thanh toán gói AI';
  const pageDescription = isMentorBooking
    ? 'Kiểm tra lại thông tin phiên tư vấn trước khi chuyển sang cổng thanh toán.'
    : 'Kiểm tra lại hóa đơn gói AI trước khi chuyển sang cổng thanh toán.';
  const sidebarDescription = isMentorBooking
    ? 'Sau khi cổng thanh toán xác nhận, booking sẽ chuyển sang trạng thái chờ mentor xác nhận.'
    : 'Sau khi cổng thanh toán xác nhận, gói AI sẽ được kích hoạt hoặc gia hạn tự động.';
  const expiredMessage = isMentorBooking
    ? 'Phiên thanh toán đã hết hạn. Vui lòng quay lại trang mentor để tạo lại thanh toán.'
    : 'Phiên thanh toán đã hết hạn. Vui lòng quay lại dashboard để tạo lại thanh toán.';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="bg-gradient-card">
        <div className="container py-10 md:py-14">
          <div className="mx-auto max-w-5xl">
            <Link href={backHref} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>

            {isLoading ? (
              <div className="glass-card flex min-h-[360px] items-center justify-center rounded-2xl">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error || !session ? (
              <div className="glass-card rounded-2xl p-6 md:p-8">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold">Không mở được phiên thanh toán</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {error || 'Liên kết thanh toán đã hết hạn hoặc không còn khả dụng.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card overflow-hidden rounded-2xl">
                <div className="border-b border-border bg-background/70 p-6 md:p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        Thanh toán bảo mật qua SePay
                      </span>
                      <h1 className="font-display text-3xl font-bold md:text-4xl">{pageTitle}</h1>
                      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        {pageDescription}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 px-4 py-3 text-primary">
                      <p className="text-xs font-semibold uppercase">Còn hiệu lực</p>
                      <p className="mt-1 text-2xl font-bold">{getExpiryLabel(session.expiresAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 p-6 md:grid-cols-[1fr_360px] md:p-8">
                  <section className="space-y-4">
                    {isMentorBooking ? (
                      <div>
                        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                          <CalendarClock className="h-4 w-4" />
                          Phiên tư vấn
                        </p>
                        <div className="rounded-2xl border border-border bg-background/70 p-5">
                          <h2 className="font-display text-xl font-bold">
                            {formatSessionType(session.booking?.sessionType)}
                          </h2>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {formatDateTime(session.booking?.requestedDateTime)} · {session.booking?.duration || 90} phút
                          </p>
                          {session.booking?.topicsToDiscuss?.length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {session.booking.topicsToDiscuss.map((topic) => (
                                <span key={topic} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                          <ReceiptText className="h-4 w-4" />
                          Gói AI
                        </p>
                        <div className="rounded-2xl border border-border bg-background/70 p-5">
                          <h2 className="font-display text-xl font-bold">Đơn hàng gói AI EDUMEE</h2>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Mã hóa đơn {session.checkoutReference}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-border bg-background/70 p-5">
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <ReceiptText className="h-4 w-4 text-primary" />
                        Chi tiết hóa đơn
                      </p>
                      <div className="grid gap-3 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Mã hóa đơn</span>
                          <span className="font-semibold">{session.checkoutReference}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Phương thức</span>
                          <span className="font-semibold">SePay bank transfer</span>
                        </div>
                        {Number(session.creditAppliedAmount || 0) > 0 ? (
                          <>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Tổng đơn</span>
                              <span className="font-semibold">
                                {formatMoney(session.subtotalAmount || session.amount, session.currency)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Đã dùng Số dư Edumee</span>
                              <span className="font-semibold text-emerald-600">
                                -{formatMoney(session.creditAppliedAmount, session.currency)}
                              </span>
                            </div>
                          </>
                        ) : null}
                        <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                          <span className="font-semibold">Tổng thanh toán</span>
                          <span className="text-lg font-bold text-primary">
                            {formatMoney(session.amount, session.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <aside className="rounded-2xl border border-border bg-background/80 p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-elevated">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 font-display text-xl font-bold">Hoàn tất qua SePay</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {sidebarDescription}
                    </p>

                    <form method={session.method} action={session.actionUrl} className="mt-5 space-y-4">
                      {hiddenFields.map(([name, value]) => (
                        <input key={name} type="hidden" name={name} value={String(value)} />
                      ))}
                      <Button type="submit" variant="hero" className="h-12 w-full" disabled={isExpired}>
                        <CreditCard className="h-4 w-4" />
                        Thanh toán ngay
                      </Button>
                    </form>

                    {isExpired ? (
                      <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        {expiredMessage}
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Bạn sẽ được chuyển sang SePay để hoàn tất giao dịch.
                      </p>
                    )}
                  </aside>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
