'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  ChevronRight,
  Edit3,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Loader2,
  Sparkles,
  Save,
  X,
  AlertCircle,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminService, AdminCareer } from '@/lib/admin.service';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const categories = [
  'Tất cả',
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Creative',
  'Business',
  'Engineering',
  'Science',
  'Legal',
  'Sales_Marketing',
  'Social_Services',
  'Other',
];

export default function AdminCareersPage() {
  const { accessToken } = useAuth();
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [searchTerm, setSearchTerm] = useState('');
  const [careers, setCareers] = useState<AdminCareer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
      salarySummary: ''
    }
  });

  const updateDiscoveryArray = (field: 'pros' | 'cons' | 'topCompanies', index: number, value: string) => {
    const newData = { ...formData.discoveryData };
    if (!newData[field]) newData[field] = [];
    const arr = [...newData[field]!];
    arr[index] = value;
    setFormData({ ...formData, discoveryData: { ...newData, [field]: arr } });
  };

  const addDiscoveryItem = (field: 'pros' | 'cons' | 'topCompanies') => {
    const newData = { ...formData.discoveryData };
    if (!newData[field]) newData[field] = [];
    setFormData({ ...formData, discoveryData: { ...newData, [field]: [...newData[field]!, ''] } });
  };

  const removeDiscoveryItem = (field: 'pros' | 'cons' | 'topCompanies', index: number) => {
    const newData = { ...formData.discoveryData };
    const arr = [...(newData[field] || [])];
    arr.splice(index, 1);
    setFormData({ ...formData, discoveryData: { ...newData, [field]: arr } });
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
        activeCategory === 'Tất cả' ? undefined : activeCategory
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
        salarySummary: ''
      }
    });
    setIsModalOpen(true);
  };

  const openEditModal = (career: AdminCareer) => {
    setEditingCareer(career);
    setFormData({
      ...career,
      discoveryData: career.discoveryData || {
        pros: [],
        cons: [],
        topCompanies: [],
        trends: [],
        salarySummary: ''
      }
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
      setFormData(res);
      toast.success('AI đã tạo dữ liệu thành công');
    } catch {
      toast.error('AI không thể tạo dữ liệu lúc này');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!accessToken) return;
    try {
      if (editingCareer) {
        await adminService.updateCareer(accessToken, editingCareer.id || editingCareer._id || '', formData);
        toast.success('Cập nhật thành công');
      } else {
        await adminService.createCareer(accessToken, formData);
        toast.success('Thêm mới thành công');
      }
      setIsModalOpen(false);
      fetchCareers();
    } catch {
      toast.error('Lưu thất bại');
    }
  };

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Quản lý Danh mục Nghề nghiệp"
        subtitle="Cập nhật thông tin chi tiết về các nghề nghiệp để cung cấp dữ liệu chính xác cho AI tư vấn."
        right={
          <button 
            onClick={openAddModal}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-600 transition"
          >
            <Plus className="h-4 w-4" /> Thêm nghề nghiệp mới
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setPage(1);
              }}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-bold transition',
                activeCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <form onSubmit={handleSearch} className="relative min-w-64">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 pl-10 text-sm outline-none focus:border-violet-400" 
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
              onDelete={() => handleDelete(career.id || career._id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingCareer ? 'Chỉnh sửa nghề nghiệp' : 'Thêm nghề nghiệp mới'}
              {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-violet-500" />}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="general">Cơ bản</TabsTrigger>
                <TabsTrigger value="market">Thị trường</TabsTrigger>
                <TabsTrigger value="analysis">Phân tích</TabsTrigger>
                <TabsTrigger value="roadmap">Lộ trình</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Tên nghề nghiệp</Label>
                      <Input 
                        value={formData.title} 
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="VD: Senior Frontend Developer" 
                      />
                    </div>
                    {!editingCareer && (
                      <Button 
                        type="button"
                        variant="outline"
                        className="flex gap-2 items-center border-violet-200 text-violet-600 hover:bg-violet-50"
                        onClick={handleGenerateWithAI}
                        disabled={isGenerating}
                      >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        AI Khởi tạo
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Danh mục</Label>
                    <Select 
                      value={formData.category?.toLowerCase()} 
                      onValueChange={(val) => setFormData({...formData, category: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.filter(c => c !== 'Tất cả').map(cat => (
                          <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mô tả nghề nghiệp</Label>
                    <Textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                        onValueChange={(val) => setFormData({...formData, marketInfo: {...formData.marketInfo!, demandLevel: val as 'low' | 'medium' | 'high' | 'very_high'}})}
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
                      <Input 
                        value={formData.marketInfo?.growthProjection}
                        onChange={(e) => setFormData({...formData, marketInfo: {...formData.marketInfo!, growthProjection: e.target.value}})}
                        placeholder="VD: +25% trong 5 năm tới" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Mức lương tóm tắt (Discovery)</Label>
                    <Input 
                      value={formData.discoveryData?.salarySummary}
                      onChange={(e) => setFormData({...formData, discoveryData: {...formData.discoveryData!, salarySummary: e.target.value}})}
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
                            onChange={(e) => updateDiscoveryArray('topCompanies', idx, e.target.value)}
                            placeholder="Tên công ty"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeDiscoveryItem('topCompanies', idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full" onClick={() => addDiscoveryItem('topCompanies')}>
                        <Plus className="h-3 w-3 mr-2" /> Thêm công ty
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-3">
                    <Label className="text-emerald-600 font-bold flex items-center gap-2">
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
                          <Button variant="ghost" size="icon" onClick={() => removeDiscoveryItem('pros', idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full border-emerald-100 text-emerald-600 hover:bg-emerald-50" onClick={() => addDiscoveryItem('pros')}>
                        <Plus className="h-3 w-3 mr-2" /> Thêm ưu điểm
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-rose-600 font-bold flex items-center gap-2">
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
                          <Button variant="ghost" size="icon" onClick={() => removeDiscoveryItem('cons', idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full border-rose-100 text-rose-600 hover:bg-rose-50" onClick={() => addDiscoveryItem('cons')}>
                        <Plus className="h-3 w-3 mr-2" /> Thêm nhược điểm
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="roadmap" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex justify-between items-center">
                      <span>Kỹ năng cốt lõi</span>
                      <Badge variant="secondary" className="bg-violet-50 text-violet-600">
                        {formData.skillRequirements?.technical?.length || 0} kỹ năng
                      </Badge>
                    </Label>
                    <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                      {formData.skillRequirements?.technical?.map((s, idx: number) => (
                        <Badge key={idx} variant="outline" className="bg-white">
                          {s.skillName} (Lvl {s.minimumLevel})
                        </Badge>
                      ))}
                      {(!formData.skillRequirements?.technical || formData.skillRequirements.technical.length === 0) && (
                        <span className="text-xs text-slate-400 italic">Chưa có dữ liệu kỹ năng. Hãy dùng AI Khởi tạo ở Tab Cơ bản.</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                    <p className="text-xs text-blue-700 font-medium leading-relaxed">
                      Lộ trình chi tiết (Roadmap) và các bài học sẽ được hệ thống AI tự động tạo dựa trên các kỹ năng và mô tả bạn cung cấp. Hãy đảm bảo Tab Cơ bản và Phân tích đầy đủ thông tin nhất có thể.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
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
    very_high: 'Rất cao'
  };

  return (
    <AdminPanel className="group relative overflow-hidden p-0">
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-lg">
            <TrendingUp className="h-3 w-3" /> {career.marketInfo?.growthProjection || 'N/A'}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-1">{career.title}</h3>
          {career.isDraft && (
            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] h-5 px-1.5 font-bold uppercase tracking-wider">
              AI Đề xuất
            </Badge>
          )}
        </div>
        <p className="mb-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{career.category}</p>

        <div className="flex items-center justify-between border-t border-slate-50 pt-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nhu cầu</p>
            <p className="text-sm font-bold text-slate-700">{demandMap[career.marketInfo?.demandLevel] || career.marketInfo?.demandLevel || 'Ổn định'}</p>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={onEdit}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-violet-600 transition"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button 
              onClick={onDelete}
              className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
    </AdminPanel>
  );
}
