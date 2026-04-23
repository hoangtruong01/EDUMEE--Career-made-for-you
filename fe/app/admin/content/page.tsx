'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { useAuth } from '@/context/auth-context';
import {
  adminQuestionService,
  type AssessmentQuestionItem,
  type QuestionPayload,
} from '@/lib/admin-question.service';
import { Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const dimensionOptions = [
  { value: 'realistic', label: 'Realistic' },
  { value: 'investigative', label: 'Investigative' },
  { value: 'artistic', label: 'Artistic' },
  { value: 'social', label: 'Social' },
  { value: 'enterprising', label: 'Enterprising' },
  { value: 'conventional', label: 'Conventional' },
  { value: 'openness', label: 'Openness' },
  { value: 'conscientiousness', label: 'Conscientiousness' },
  { value: 'extraversion', label: 'Extraversion' },
  { value: 'agreeableness', label: 'Agreeableness' },
  { value: 'neuroticism', label: 'Neuroticism' },
];

type FormState = {
  questionText: string;
  dimension: string;
  orderIndex: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

const emptyForm: FormState = {
  questionText: '',
  dimension: 'realistic',
  orderIndex: '0',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
};

const toPayload = (form: FormState): QuestionPayload => ({
  questionText: form.questionText.trim(),
  questionType: 'multiple_choice',
  dimension: form.dimension,
  orderIndex: Number(form.orderIndex) || 0,
  options: [
    { value: 'A', label: form.optionA.trim() },
    { value: 'B', label: form.optionB.trim() },
    { value: 'C', label: form.optionC.trim() },
    { value: 'D', label: form.optionD.trim() },
  ],
});

const toFormState = (question: AssessmentQuestionItem): FormState => {
  const optionA = question.options.find((opt) => opt.value === 'A')?.label || '';
  const optionB = question.options.find((opt) => opt.value === 'B')?.label || '';
  const optionC = question.options.find((opt) => opt.value === 'C')?.label || '';
  const optionD = question.options.find((opt) => opt.value === 'D')?.label || '';

  return {
    questionText: question.questionText || '',
    dimension: question.dimension || 'realistic',
    orderIndex: String(question.orderIndex ?? 0),
    optionA,
    optionB,
    optionC,
    optionD,
  };
};

export default function AdminContentPage() {
  const { accessToken, role, isHydrated } = useAuth();
  const [questions, setQuestions] = useState<AssessmentQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('Sẵn sàng quản lý ngân hàng câu hỏi');

  const loadQuestions = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await adminQuestionService.list(accessToken);
      setQuestions(data);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Không tải được danh sách câu hỏi';
      setMessage(text);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuestions();
  }, [accessToken]);

  const visibleItems = useMemo(() => {
    return questions.filter((item) => {
      const byText = item.questionText.toLowerCase().includes(search.toLowerCase());
      const byDimension = item.dimension.toLowerCase().includes(search.toLowerCase());
      return byText || byDimension;
    });
  }, [questions, search]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const validateForm = () => {
    if (!form.questionText.trim()) {
      setMessage('Vui lòng nhập nội dung câu hỏi');
      return false;
    }

    if (
      !form.optionA.trim() ||
      !form.optionB.trim() ||
      !form.optionC.trim() ||
      !form.optionD.trim()
    ) {
      setMessage('Vui lòng nhập đầy đủ 4 lựa chọn A, B, C, D');
      return false;
    }

    return true;
  };

  const onSubmit = async () => {
    if (!accessToken || !validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const payload = toPayload(form);

      if (editingId) {
        await adminQuestionService.update(accessToken, editingId, payload);
        setMessage('Đã cập nhật câu hỏi');
      } else {
        await adminQuestionService.create(accessToken, payload);
        setMessage('Đã thêm câu hỏi mới');
      }

      resetForm();
      await loadQuestions();
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Lưu câu hỏi thất bại';
      setMessage(text);
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = (question: AssessmentQuestionItem) => {
    const id = question.id || question._id;
    if (!id) {
      return;
    }

    setEditingId(id);
    setForm(toFormState(question));
    setMessage('Đang chỉnh sửa câu hỏi');
  };

  const onDelete = async (question: AssessmentQuestionItem) => {
    const id = question.id || question._id;
    if (!accessToken || !id) {
      return;
    }

    const shouldDelete = window.confirm('Bạn có chắc muốn xóa câu hỏi này?');
    if (!shouldDelete) {
      return;
    }

    try {
      await adminQuestionService.remove(accessToken, id);
      setMessage('Đã xóa câu hỏi');
      await loadQuestions();
      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Xóa câu hỏi thất bại';
      setMessage(text);
    }
  };

  if (!isHydrated) {
    return <p className="text-sm text-slate-600">Đang tải phiên đăng nhập...</p>;
  }

  if (role !== 'admin') {
    return (
      <AdminPanel className="max-w-3xl">
        <p className="text-sm font-medium text-rose-600">
          Bạn không có quyền truy cập khu vực quản lý ngân hàng câu hỏi.
        </p>
      </AdminPanel>
    );
  }

  return (
    <div className="max-w-7xl">
      <AdminSectionHeader
        title="Ngân hàng câu hỏi"
        subtitle="Thêm, sửa, xóa câu hỏi bài test trực tiếp trong trang admin"
        right={
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-600"
          >
            <Plus className="h-4 w-4" />
            Tạo form mới
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <AdminPanel>
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            {editingId ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}
          </h3>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Nội dung câu hỏi
              <textarea
                value={form.questionText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, questionText: event.target.value }))
                }
                rows={4}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
                placeholder="Nhập nội dung câu hỏi"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Nhóm dimension
                <select
                  value={form.dimension}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, dimension: event.target.value }))
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
                >
                  {dimensionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Thứ tự
                <input
                  type="number"
                  value={form.orderIndex}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, orderIndex: event.target.value }))
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400"
                  placeholder="0"
                />
              </label>
            </div>

            <label className="block text-sm font-semibold text-slate-700">
              Lựa chọn A
              <input
                value={form.optionA}
                onChange={(event) => setForm((prev) => ({ ...prev, optionA: event.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400"
                placeholder="Nội dung đáp án A"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Lựa chọn B
              <input
                value={form.optionB}
                onChange={(event) => setForm((prev) => ({ ...prev, optionB: event.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400"
                placeholder="Nội dung đáp án B"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Lựa chọn C
              <input
                value={form.optionC}
                onChange={(event) => setForm((prev) => ({ ...prev, optionC: event.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400"
                placeholder="Nội dung đáp án C"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Lựa chọn D
              <input
                value={form.optionD}
                onChange={(event) => setForm((prev) => ({ ...prev, optionD: event.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400"
                placeholder="Nội dung đáp án D"
              />
            </label>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {editingId ? 'Lưu cập nhật' : 'Thêm câu hỏi'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Hủy chỉnh sửa
                </button>
              )}
            </div>
          </div>
        </AdminPanel>

        <div>
          <AdminPanel className="p-3">
            <div className="relative min-w-72">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 pr-3 pl-10 text-sm outline-none focus:border-violet-400"
                placeholder="Tìm theo nội dung hoặc dimension"
              />
            </div>
          </AdminPanel>

          <AdminPanel className="mt-4 p-0">
            <div className="overflow-x-auto rounded-2xl">
              <table className="min-w-full bg-white text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Thứ tự</th>
                    <th className="px-4 py-3">Câu hỏi</th>
                    <th className="px-4 py-3">Dimension</th>
                    <th className="px-4 py-3">Lựa chọn</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && visibleItems.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                        Không có câu hỏi phù hợp.
                      </td>
                    </tr>
                  )}

                  {visibleItems.map((question) => {
                    const id = question.id || question._id || '';
                    return (
                      <tr key={id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-4 text-slate-700">{question.orderIndex ?? 0}</td>
                        <td className="max-w-xl px-4 py-4 font-semibold text-slate-800">
                          {question.questionText}
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
                            {question.dimension}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">
                          {question.options.map((option) => (
                            <p key={option.value} className="leading-5">
                              <strong>{option.value}.</strong> {option.label}
                            </p>
                          ))}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2 text-slate-500">
                            <button
                              type="button"
                              onClick={() => onEdit(question)}
                              className="rounded-lg p-2 hover:bg-slate-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(question)}
                              className="rounded-lg p-2 hover:bg-slate-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AdminPanel>
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">
        {message}
      </p>
    </div>
  );
}
