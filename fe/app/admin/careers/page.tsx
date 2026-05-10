'use client';

import { AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth-context';
import { AdminCareer, adminService } from '@/lib/admin.service';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Briefcase,
  Edit3,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type CategoryOption = { label: string; value: string };

const categoryOptions: CategoryOption[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Technology', value: 'technology' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Finance', value: 'finance' },
  { label: 'Education', value: 'education' },
  { label: 'Creative', value: 'creative' },
  { label: 'Business', value: 'business' },
  { label: 'Engineering', value: 'engineering' },
  { label: 'Science', value: 'science' },
  { label: 'Legal', value: 'legal' },
  { label: 'Sales_Marketing', value: 'sales_marketing' },
  { label: 'Social_Services', value: 'social_services' },
  { label: 'Other', value: 'other' },
];

const categoryLabelMap = categoryOptions
  .filter((item) => item.value !== 'all')
  .reduce(
    (acc, item) => {
      acc[item.value] = item.label;
      return acc;
    },
    {} as Record<string, string>,
  );

const normalizeCategoryValue = (value?: string) => {
  if (!value) return 'other';
  return value.trim().toLowerCase().replace(/\s+/g, '_');
};

export default function AdminCareersPage() {
  const { accessToken } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [careers, setCareers] = useState<AdminCareer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCareer, setEditingCareer] = useState<AdminCareer | null>(null);
  const [formData, setFormData] = useState<Partial<AdminCareer>>({
    title: '',
    category: 'technology',
    description: '',
    skillRequirements: { technical: [], soft: [] },
    marketInfo: { demandLevel: 'medium', growthProjection: '' },
    discoveryData: {
      pros: [],
      cons: [],
      topCompanies: [],
      trends: [],
      salarySummary: '',
    },
  });

  const updateDiscoveryArray = (
    field: 'pros' | 'cons' | 'topCompanies',
    index: number,
    value: string,
  ) => {
    const discoveryData = formData.discoveryData || {
      pros: [],
      cons: [],
      topCompanies: [],
      trends: [],
      salarySummary: '',
    };
    const arr = [...(discoveryData[field] || [])];
    arr[index] = value;
    setFormData({
      ...formData,
      discoveryData: {
        ...discoveryData,
        [field]: arr,
      },
    });
  };

  const addDiscoveryItem = (field: 'pros' | 'cons' | 'topCompanies') => {
    const discoveryData = formData.discoveryData || {
      pros: [],
      cons: [],
      topCompanies: [],
      trends: [],
      salarySummary: '',
    };
    const arr = [...(discoveryData[field] || []), ''];
    setFormData({
      ...formData,
      discoveryData: {
        ...discoveryData,
        [field]: arr,
      },
    });
  };

  const removeDiscoveryItem = (field: 'pros' | 'cons' | 'topCompanies', index: number) => {
    const discoveryData = formData.discoveryData || {
      pros: [],
      cons: [],
      topCompanies: [],
      trends: [],
      salarySummary: '',
    };
    const arr = [...(discoveryData[field] || [])];
    arr.splice(index, 1);
    setFormData({
      ...formData,
      discoveryData: {
        ...discoveryData,
        [field]: arr,
      },
    });
  };

  const fetchCareers = useCallback(async () => {
    if (!accessToken) return;
    try {
      setIsLoading(true);
      const res = await adminService.getAllCareers(
        accessToken,
        page,
        12,
        searchTerm,
        activeCategory === 'all' ? undefined : activeCategory,
      );
      setCareers(res.careers);
    } catch {
      toast.error('Không thể tải danh sách nghề nghiệp');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page, searchTerm, activeCategory]);

  useEffect(() => {
    fetchCareers();
  }, [fetchCareers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCareers();
  };

  const openAddModal = () => {
    setEditingCareer(null);
    setFormData({
      title: '',
      category: 'technology',
      description: '',
      skillRequirements: { technical: [], soft: [] },
      marketInfo: { demandLevel: 'medium', growthProjection: '' },
      discoveryData: {
        pros: [],
        cons: [],
        topCompanies: [],
        trends: [],
        salarySummary: '',
      },
    });
    setIsModalOpen(true);
  };

  const openEditModal = (career: AdminCareer) => {
    setEditingCareer(career);
    setFormData({
      ...career,
      category: normalizeCategoryValue(career.category),
      discoveryData: career.discoveryData || {
        pros: [],
        cons: [],
        topCompanies: [],
        trends: [],
        salarySummary: '',
      },
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!accessToken || !confirm('Bạn có chắc chắn muốn xóa nghề nghiệp này?')) return;
    try {
      await adminService.deleteCareer(accessToken, id);
      toast.success('Đã xóa thành công');
      fetchCareers();
    } catch {
      toast.error('Xóa thất bại');
    }
  };

  const handleGenerateWithAI = async () => {
    if (!formData.title?.trim()) {
      toast.error('Vui lòng nhập tên nghề nghiệp trước');
      return;
    }
    if (!accessToken) return;

    try {
      setIsGenerating(true);
      // First check duplicate
      const check = await adminService.checkCareerDuplicate(accessToken, formData.title);
      if (check.exists && !editingCareer) {
        toast.warning('Nghề nghiệp này đã tồn tại trong hệ thống');
        setIsGenerating(false);
        return;
      }

      const res = await adminService.generateCareerWithAI(accessToken, formData.title);
      if ((res as { error?: string }).error) {
        toast.error((res as { error?: string }).error || 'AI không thể tạo dữ liệu lúc này');
        return;
      }
      setFormData({
        ...res,
        category: normalizeCategoryValue(res.category),
      });
      toast.success('AI đã tạo dữ liệu thành công');
    } catch {
      toast.error('AI không thể tạo dữ liệu lúc này');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!accessToken) return;
    const title = formData.title?.trim() || '';
    if (!title) {
      toast.error('Vui lòng nhập tên nghề nghiệp');
      return;
    }
    if (!formData.description?.trim()) {
      toast.error('Vui lòng nhập mô tả nghề nghiệp');
      return;
    }

    const payload: Record<string, unknown> = {
      ...formData,
      title,
      category: normalizeCategoryValue(formData.category),
    };

    // Remove IDs from payload to avoid Mongoose immutable field errors or ID conflicts
    delete payload.id;
    delete payload._id;

    const hasSkillRequirements =
      (payload.skillRequirements?.technical?.length || 0) > 0 ||
      (payload.skillRequirements?.soft?.length || 0) > 0;
    const hasCareerLevels = Array.isArray(payload.careerLevels) && payload.careerLevels.length > 0;

    if (!hasSkillRequirements || !hasCareerLevels) {
      toast.warning('Nghề nghiệp thiếu dữ liệu kỹ năng hoặc lộ trình. AI có thể tư vấn kém chính xác hơn.');
    }

    const isDraft = Boolean(editingCareer?.isDraft);
    const careerId = editingCareer?.id || editingCareer?._id;

    try {
      setIsSaving(true);
      if (!editingCareer || isDraft) {
        // If it's a draft or new, check for duplicate title in formal careers
        const check = await adminService.checkCareerDuplicate(accessToken, title);
        if (check.exists && !isDraft) {
          toast.error('Nghề nghiệp này đã tồn tại trong hệ thống');
          return;
        }
        await adminService.createCareer(accessToken, payload);
        toast.success(isDraft ? 'Đã chính thức hóa nghề nghiệp thành công' : 'Thêm mới thành công');
      } else if (careerId) {
        await adminService.updateCareer(accessToken, careerId, payload);
        toast.success('Cập nhật thành công');
      }
      setIsModalOpen(false);
      fetchCareers();
    } catch (error: unknown) {
      console.error('Save error:', error);
      let errorMessage = 'Lưu thất bại';
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response: { data: { message?: string } } }).response;
        errorMessage = response.data.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const showAIGenerate = !editingCareer || editingCareer.isDraft;

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Quản lý Danh mục Nghề nghiệp"
        subtitle="Cập nhật thông tin chi tiết về các nghề nghiệp để cung cấp dữ liệu chính xác cho AI tư vấn."
        right={
          <button
            onClick={openAddModal}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-600"
          >
            <Plus className="h-4 w-4" /> Thêm nghề nghiệp mới
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setActiveCategory(cat.value);
                setPage(1);
              }}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-bold transition',
                activeCategory === cat.value
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="relative min-w-64">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 text-sm transition-all outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            placeholder="Tìm tên nghề nghiệp..."
          />
        </form>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {careers.map((career) => (
            <CareerCard
              key={career.id || career._id}
              career={career}
              onEdit={() => openEditModal(career)}
              onDelete={() => {
                const id = career.id || career._id;
                if (id) handleDelete(id);
              }}
            />
          ))}
          {careers.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <Briefcase className="mb-2 h-12 w-12 opacity-20" />
              <p>Không tìm thấy nghề nghiệp nào</p>
            </div>
          )}
        </div>
      )}

      {/* Career Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingCareer ? 'Chỉnh sửa nghề nghiệp' : 'Thêm nghề nghiệp mới'}
              {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-violet-500" />}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="mb-6 grid w-full grid-cols-4">
                <TabsTrigger value="general">Cơ bản</TabsTrigger>
                <TabsTrigger value="market">Thị trường</TabsTrigger>
                <TabsTrigger value="analysis">Phân tích</TabsTrigger>
                <TabsTrigger value="roadmap">Lộ trình</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-2">
                      <Label>Tên nghề nghiệp</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="VD: Senior Frontend Developer"
                      />
                    </div>
                    {showAIGenerate && (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2 border-violet-200 text-violet-600 hover:bg-violet-50"
                        onClick={handleGenerateWithAI}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        AI Khởi tạo
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Danh mục</Label>
                    <Select
                      value={normalizeCategoryValue(formData.category)}
                      onValueChange={(val) => setFormData({ ...formData, category: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions
                          .filter((c) => c.value !== 'all')
                          .map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mô tả nghề nghiệp</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Nhập mô tả chi tiết về nghề nghiệp..."
                      rows={5}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="market" className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nhu cầu thị trường</Label>
                      <Select
                        value={formData.marketInfo?.demandLevel}
                        onValueChange={(val) =>
                          setFormData({
                            ...formData,
                            marketInfo: {
                              ...formData.marketInfo!,
                              demandLevel: val as 'low' | 'medium' | 'high' | 'very_high',
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn mức nhu cầu" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Thấp</SelectItem>
                          <SelectItem value="medium">Trung bình</SelectItem>
                          <SelectItem value="high">Cao</SelectItem>
                          <SelectItem value="very_high">Rất cao</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Dự báo tăng trưởng</Label>
                      <Textarea
                        value={formData.marketInfo?.growthProjection}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            marketInfo: {
                              ...formData.marketInfo!,
                              growthProjection: e.target.value,
                            },
                          })
                        }
                        placeholder="VD: +25% trong 5 năm tới. Mô tả chi tiết về xu hướng thị trường..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mức lương tóm tắt (Discovery)</Label>
                    <Input
                      value={formData.discoveryData?.salarySummary}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discoveryData: {
                            ...formData.discoveryData!,
                            salarySummary: e.target.value,
                          },
                        })
                      }
                      placeholder="VD: 15 - 35 triệu VNĐ"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Các công ty hàng đầu</Label>
                    <div className="space-y-2">
                      {formData.discoveryData?.topCompanies?.map((company, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            value={company}
                            onChange={(e) =>
                              updateDiscoveryArray('topCompanies', idx, e.target.value)
                            }
                            placeholder="Tên công ty"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDiscoveryItem('topCompanies', idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => addDiscoveryItem('topCompanies')}
                      >
                        <Plus className="mr-2 h-3 w-3" /> Thêm công ty
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 font-bold text-emerald-600">
                      <TrendingUp className="h-4 w-4" /> Ưu điểm (Pros)
                    </Label>
                    <div className="space-y-2">
                      {formData.discoveryData?.pros?.map((pro, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            value={pro}
                            onChange={(e) => updateDiscoveryArray('pros', idx, e.target.value)}
                            placeholder="VD: Thu nhập ổn định"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDiscoveryItem('pros', idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                        onClick={() => addDiscoveryItem('pros')}
                      >
                        <Plus className="mr-2 h-3 w-3" /> Thêm ưu điểm
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 font-bold text-rose-600">
                      <AlertCircle className="h-4 w-4" /> Nhược điểm (Cons)
                    </Label>
                    <div className="space-y-2">
                      {formData.discoveryData?.cons?.map((con, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            value={con}
                            onChange={(e) => updateDiscoveryArray('cons', idx, e.target.value)}
                            placeholder="VD: Áp lực cao"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDiscoveryItem('cons', idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-rose-100 text-rose-600 hover:bg-rose-50"
                        onClick={() => addDiscoveryItem('cons')}
                      >
                        <Plus className="mr-2 h-3 w-3" /> Thêm nhược điểm
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="roadmap" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Kỹ năng cốt lõi
                      </span>
                      <Badge
                        variant="secondary"
                        className="border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      >
                        {formData.skillRequirements?.technical?.length || 0} kỹ năng
                      </Badge>
                    </Label>
                    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-slate-50/30 p-5 shadow-inner dark:border-slate-800 dark:bg-slate-900/40">
                      {formData.skillRequirements?.technical?.map((s, idx: number) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-white px-3 py-1.5 font-medium shadow-sm dark:border-violet-500/30 dark:bg-slate-800/80 dark:text-violet-300"
                        >
                          {s.skillName} (Lvl {s.minimumLevel})
                        </Badge>
                      ))}
                      {(!formData.skillRequirements?.technical ||
                        formData.skillRequirements.technical.length === 0) && (
                        <span className="py-2 text-xs text-slate-400 italic dark:text-slate-500">
                          Chưa có dữ liệu kỹ năng. Hãy dùng AI Khởi tạo ở Tab Cơ bản.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
                      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xs leading-relaxed font-medium text-blue-700 dark:text-blue-300">
                      Lộ trình chi tiết (Roadmap) và các bài học sẽ được hệ thống AI tự động tạo dựa
                      trên các kỹ năng và mô tả bạn cung cấp. Hãy đảm bảo Tab Cơ bản và Phân tích
                      đầy đủ thông tin nhất có thể.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button 
              className="bg-violet-600 hover:bg-violet-700" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {editingCareer ? 'Cập nhật' : 'Lưu nghề nghiệp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CareerCard({
  career,
  onEdit,
  onDelete,
}: {
  career: AdminCareer;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const demandMap: Record<string, string> = {
    low: 'Thấp',
    medium: 'Trung bình',
    high: 'Cao',
    very_high: 'Rất cao',
  };
  const categoryLabel =
    categoryLabelMap[normalizeCategoryValue(career.category)] || career.category || 'Other';

  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-500/30">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400">
          <Briefcase className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold tracking-tight text-emerald-600 uppercase dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
          <TrendingUp className="h-3.5 w-3.5" /> {career.marketInfo?.growthProjection || 'N/A'}
        </div>
      </div>

      <div className="mb-1 flex items-center gap-2">
        <h3 className="line-clamp-1 text-xl font-bold text-slate-900 transition-colors group-hover:text-violet-600 dark:text-slate-100 dark:group-hover:text-violet-400">
          {career.title}
        </h3>
        {career.isDraft && (
          <Badge
            variant="outline"
            className="h-5 border-amber-200 bg-amber-50 px-1.5 text-[10px] font-bold tracking-wider text-amber-600 uppercase dark:border-amber-900/30 dark:bg-amber-500/10 dark:text-amber-400"
          >
            AI Đề xuất
          </Badge>
        )}
      </div>
      <p className="mb-6 text-[10px] font-extrabold tracking-[0.2em] text-slate-400 uppercase dark:text-slate-500">
        {categoryLabel}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-5 dark:border-slate-800">
        <div>
          <p className="mb-1 text-[10px] font-bold tracking-widest text-slate-300 uppercase dark:text-slate-600">
            Nhu cầu thị trường
          </p>
          <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
            {career.marketInfo?.demandLevel
              ? demandMap[career.marketInfo.demandLevel] || career.marketInfo.demandLevel
              : 'Ổn định'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="rounded-xl border border-transparent p-2.5 text-slate-400 transition-all hover:border-violet-100 hover:bg-violet-50 hover:text-violet-600 dark:text-slate-500 dark:hover:border-violet-500/20 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
          >
            <Edit3 className="h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-xl border border-transparent p-2.5 text-slate-400 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-500 dark:text-slate-500 dark:hover:border-rose-500/20 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
