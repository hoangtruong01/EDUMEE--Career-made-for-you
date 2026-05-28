'use client';

import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import {
  paymentService,
  type PaymentCheckoutSession,
  type PaymentCheckoutStatus,
  type PaymentStatus,
} from '@/lib/payment.service';
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Đang chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán thất bại',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
  refund_pending: 'Đang chờ hoàn tiền',
};

function formatMoney(amount?: number, currency = 'VND') {
  if (amount === undefined || amount === null) return 'Miễn phí';
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

function getStatusClassName(status: PaymentStatus) {
  if (status === 'paid') return 'bg-emerald-100 text-emerald-700';
  if (status === 'pending') return 'bg-amber-100 text-amber-700';
  if (status === 'refunded' || status === 'refund_pending') return 'bg-violet-100 text-violet-700';
  return 'bg-rose-100 text-rose-700';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function PaymentCheckout({ token }: { token: string }) {
  const [session, setSession] = useState<PaymentCheckoutSession | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<PaymentCheckoutStatus | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy mã');
  const [now, setNow] = useState(() => Date.now());

  const refreshCheckoutStatus = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setIsRefreshingStatus(true);
      try {
        const nextStatus = await paymentService.getCheckoutStatus(token);
        setCheckoutStatus(nextStatus);
        setError('');
        return nextStatus;
      } catch (err) {
        if (!options?.silent) {
          setError(getErrorMessage(err, 'Không thể kiểm tra trạng thái thanh toán.'));
        }
        return null;
      } finally {
        if (!options?.silent) setIsRefreshingStatus(false);
      }
    },
    [token],
  );

  useEffect(() => {
    let active = true;

    async function loadCheckout() {
      setIsLoading(true);
      setError('');

      try {
        const data = await paymentService.getCheckoutSession(token);
        if (!active) return;
        setSession(data);
        setCheckoutStatus({
          paymentId: data.paymentId,
          status: data.status,
          checkoutReference: data.checkoutReference,
          amount: data.amount,
          subtotalAmount: data.subtotalAmount,
          creditAppliedAmount: data.creditAppliedAmount,
          currency: data.currency,
          purpose: data.purpose,
          expiresAt: data.expiresAt,
          sepayCheckout: data.sepayCheckout,
          paidAt: data.paidAt,
        });
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err, 'Không thể tải phiên thanh toán.'));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadCheckout();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const currentStatus = checkoutStatus?.status || session?.status || 'pending';
  const expiresAt = checkoutStatus?.expiresAt || session?.expiresAt;
  const sepayCheckout = checkoutStatus?.sepayCheckout ?? session?.sepayCheckout;
  const sepayFieldEntries = useMemo(
    () => Object.entries(sepayCheckout?.fields ?? {}),
    [sepayCheckout],
  );
  const isSepaySandbox = sepayCheckout?.environment === 'sandbox';
  const isExpired = useMemo(() => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt).getTime();
    return Number.isFinite(expiry) && expiry <= now;
  }, [expiresAt, now]);

  useEffect(() => {
    if (isExpired || currentStatus !== 'pending') return;
    const timer = window.setInterval(() => {
      refreshCheckoutStatus({ silent: true });
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [currentStatus, isExpired, refreshCheckoutStatus]);

  const purpose = checkoutStatus?.purpose || session?.purpose;
  const isMentorBooking = purpose === 'mentor_booking';
  const checkoutReference = checkoutStatus?.checkoutReference || session?.checkoutReference || 'N/A';
  const amount = checkoutStatus?.amount ?? session?.amount;
  const subtotalAmount = checkoutStatus?.subtotalAmount ?? session?.subtotalAmount;
  const creditAppliedAmount = checkoutStatus?.creditAppliedAmount ?? session?.creditAppliedAmount;
  const currency = checkoutStatus?.currency || session?.currency || 'VND';
  const backHref = isMentorBooking ? '/mentor-matching' : '/dashboard';
  const backLabel = isMentorBooking ? 'Quay lại mentor' : 'Quay lại dashboard';
  const pageTitle = isMentorBooking ? 'Thanh toán mentor' : 'Thanh toán gói AI';
  const modeLabel = isSepaySandbox ? 'SePay Sandbox' : 'SePay Checkout';
  const sepayButtonLabel = isSepaySandbox ? 'Thanh toán qua SePay Sandbox' : 'Thanh toán qua SePay';
  const expiredMessage = isMentorBooking
    ? 'Phiên thanh toán đã hết hạn. Vui lòng quay lại trang mentor để tạo lại thanh toán.'
    : 'Phiên thanh toán đã hết hạn. Vui lòng quay lại dashboard để tạo lại thanh toán.';

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(checkoutReference);
      setCopyLabel('Đã copy');
      window.setTimeout(() => setCopyLabel('Copy mã'), 1800);
    } catch {
      setCopyLabel('Không copy được');
      window.setTimeout(() => setCopyLabel('Copy mã'), 1800);
    }
  };

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
                        {modeLabel}
                      </span>
                      <h1 className="font-display text-3xl font-bold md:text-4xl">{pageTitle}</h1>
                      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        {currentStatus === 'pending'
                          ? 'Bấm nút thanh toán để chuyển sang cổng SePay chính thức, sau đó quay lại kiểm tra trạng thái tại đây.'
                          : 'Phiên thanh toán này đã có trạng thái cuối cùng trong hệ thống.'}
                      </p>
                    </div>
                    <div className={`rounded-2xl px-4 py-3 ${getStatusClassName(currentStatus)}`}>
                      <p className="text-xs font-semibold uppercase">Trạng thái</p>
                      <p className="mt-1 text-lg font-bold">{PAYMENT_STATUS_LABELS[currentStatus]}</p>
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
                          <p className="mt-2 text-sm text-muted-foreground">Mã thanh toán {checkoutReference}</p>
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-border bg-background/70 p-5">
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <ReceiptText className="h-4 w-4 text-primary" />
                        Chi tiết thanh toán
                      </p>
                      <div className="grid gap-3 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Mã thanh toán</span>
                          <span className="font-semibold">{checkoutReference}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Phương thức</span>
                          <span className="font-semibold">{isSepaySandbox ? 'SePay Sandbox' : 'SePay'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Hiệu lực</span>
                          <span className="font-semibold">{getExpiryLabel(expiresAt)}</span>
                        </div>
                        {Number(creditAppliedAmount || 0) > 0 ? (
                          <>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Tổng đơn</span>
                              <span className="font-semibold">{formatMoney(subtotalAmount || amount, currency)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Đã dùng Số dư Edumee</span>
                              <span className="font-semibold text-emerald-600">
                                -{formatMoney(creditAppliedAmount, currency)}
                              </span>
                            </div>
                          </>
                        ) : null}
                        <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                          <span className="font-semibold">Tổng thanh toán</span>
                          <span className="text-lg font-bold text-primary">{formatMoney(amount, currency)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background/70 p-5">
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <Landmark className="h-4 w-4 text-primary" />
                        Mã đơn hàng SePay
                      </p>
                      <div className="rounded-xl bg-muted/70 p-4 font-mono text-sm font-semibold text-foreground">
                        {checkoutReference}
                      </div>
                    </div>

                  </section>

                  <aside className="rounded-2xl border border-border bg-background/80 p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-elevated">
                      {currentStatus === 'paid' ? <CheckCircle2 className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <h2 className="mt-4 font-display text-xl font-bold">
                      {currentStatus === 'paid'
                        ? 'Đã ghi nhận thanh toán'
                        : sepayCheckout
                          ? sepayButtonLabel
                          : 'Chờ thanh toán SePay'}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {currentStatus === 'paid'
                        ? 'Giao dịch đã được xử lý thành công.'
                        : sepayCheckout
                          ? 'Bạn sẽ được chuyển sang cổng SePay để hoàn tất thanh toán. EDUMEE chỉ cập nhật khi SePay xác nhận giao dịch.'
                          : 'Sau khi thanh toán được xử lý, trạng thái sẽ tự cập nhật tại đây.'}
                    </p>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-2xl border border-border bg-muted/40 p-4">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Mã thanh toán</p>
                        <p className="mt-2 break-all font-mono text-2xl font-bold text-primary">{checkoutReference}</p>
                      </div>

                      <div className="grid gap-3">
                        {currentStatus === 'pending' && sepayCheckout && !isExpired ? (
                          <form action={sepayCheckout.actionUrl} method={sepayCheckout.method} className="grid gap-3">
                            {sepayFieldEntries.map(([name, value]) => (
                              <input key={name} type="hidden" name={name} value={String(value)} />
                            ))}
                            <Button type="submit" variant="hero" className="h-11 w-full">
                              <CreditCard className="h-4 w-4" />
                              {sepayButtonLabel}
                            </Button>
                          </form>
                        ) : null}
                        <Button type="button" variant="outline" className="h-11 w-full" onClick={handleCopyCode}>
                          <Copy className="h-4 w-4" />
                          {copyLabel}
                        </Button>
                        <Button
                          type="button"
                          variant={currentStatus === 'paid' ? 'outline' : 'hero'}
                          className="h-11 w-full"
                          disabled={isRefreshingStatus}
                          onClick={() => refreshCheckoutStatus()}
                        >
                          {isRefreshingStatus ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          Kiểm tra trạng thái
                        </Button>
                      </div>

                      {currentStatus === 'paid' ? (
                        <Link href={backHref}>
                          <Button type="button" variant="hero" className="h-11 w-full">
                            <CheckCircle2 className="h-4 w-4" />
                            {backLabel}
                          </Button>
                        </Link>
                      ) : isExpired ? (
                        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{expiredMessage}</p>
                      ) : sepayCheckout ? (
                        <p className="text-xs text-muted-foreground">
                          {isSepaySandbox
                            ? 'Đây là cổng SePay sandbox chính thức; trạng thái chỉ đổi khi SePay hoặc webhook xác nhận.'
                            : 'Hệ thống tự kiểm tra mỗi 5 giây khi phiên còn đang chờ thanh toán.'}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Không còn form thanh toán khả dụng cho phiên này.
                        </p>
                      )}
                    </div>
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
