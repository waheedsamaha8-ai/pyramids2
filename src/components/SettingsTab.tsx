import React, { useState, useEffect } from 'react';
import { AppConfig, UserRole, AdminResidentProfile } from '../types';
import { 
  Settings, 
  Shield, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Users, 
  CreditCard, 
  DollarSign, 
  Briefcase, 
  Pencil, 
  BookOpen, 
  Edit3, 
  Calendar, 
  Calculator, 
  CheckCircle2, 
  Moon, 
  Sun, 
  Palette, 
  Sparkles, 
  Home, 
  UserCheck, 
  Phone, 
  BadgeCheck,
  Building,
  Key,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { setStoredAdminSecurityCode, getAdminSecurityCode } from '../services/authStore';

interface SettingsTabProps {
  config: AppConfig;
  role: UserRole;
  onSaveConfig: (updatedConfig: AppConfig) => void;
  rules?: string[];
  onAddRule?: (ruleText: string) => void;
  onDeleteRule?: (index: number) => void;
  onOpenEditRulesModal?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: (isDark: boolean) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  config,
  role,
  onSaveConfig,
  rules = [],
  onAddRule,
  onDeleteRule,
  onOpenEditRulesModal,
  isDarkMode = false,
  onToggleTheme,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'permissions' | 'types'>('settings');
  const [newRuleInput, setNewRuleInput] = useState('');

  // Building & Security Code state
  const [buildingName, setBuildingName] = useState(config.buildingName || 'اتحاد الملاك');
  const [adminSecurityCode, setAdminSecurityCode] = useState(config.adminSecurityCode || getAdminSecurityCode() || 'admin123');
  const [showSecurityCode, setShowSecurityCode] = useState(false);

  // Accounting Settings state
  const defaultFeesMap: Record<string, number> = {
    'سكني': 400,
    'سكني مغلق': 200,
    'مفروش': 600,
    'إداري': 800,
    'تجاري': 500,
    'بدون تشطيب': 0,
  };

  const [accountingStartDate, setAccountingStartDate] = useState(config.accountingStartDate || '2026-01-01');
  const [defaultMonthlyFee, setDefaultMonthlyFee] = useState<number>(config.defaultMonthlyFee || 400);
  const [activityFees, setActivityFees] = useState<Record<string, number>>(() => ({
    ...defaultFeesMap,
    ...(config.activityDefaultFees || {})
  }));
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Admin Resident Profile state
  const [adminFlatNumber, setAdminFlatNumber] = useState<number | string>(config.adminResidentProfile?.flatNumber || 207);
  const [adminResidentName, setAdminResidentName] = useState<string>(config.adminResidentProfile?.name || 'محمد احمد (رئيس الاتحاد)');
  const [adminResidentPhone, setAdminResidentPhone] = useState<string>(config.adminResidentProfile?.phone || '');
  const [adminActivityType, setAdminActivityType] = useState<string>(config.adminResidentProfile?.activityType || 'سكني');
  const [adminOwnershipType, setAdminOwnershipType] = useState<string>(config.adminResidentProfile?.ownershipType || 'تمليك');
  const [adminMonthlyFee, setAdminMonthlyFee] = useState<number>(config.adminResidentProfile?.monthlyFee || 400);
  const [adminInitialBalance, setAdminInitialBalance] = useState<number>(config.adminResidentProfile?.initialBalance || 0);
  const [adminNotes, setAdminNotes] = useState<string>(config.adminResidentProfile?.notes || 'رئيس اتحاد الملاك');
  const [adminProfileSaved, setAdminProfileSaved] = useState(false);

  useEffect(() => {
    if (config.buildingName) setBuildingName(config.buildingName);
    if (config.adminSecurityCode) {
      setAdminSecurityCode(config.adminSecurityCode);
    } else {
      setAdminSecurityCode(getAdminSecurityCode());
    }
    if (config.accountingStartDate) setAccountingStartDate(config.accountingStartDate);
    if (config.defaultMonthlyFee) setDefaultMonthlyFee(config.defaultMonthlyFee);
    if (config.activityDefaultFees) {
      setActivityFees({ ...defaultFeesMap, ...config.activityDefaultFees });
    }
    if (config.adminResidentProfile) {
      setAdminFlatNumber(config.adminResidentProfile.flatNumber || 207);
      setAdminResidentName(config.adminResidentProfile.name || 'محمد احمد (رئيس الاتحاد)');
      setAdminResidentPhone(config.adminResidentProfile.phone || '');
      setAdminActivityType(config.adminResidentProfile.activityType || 'سكني');
      setAdminOwnershipType(config.adminResidentProfile.ownershipType || 'تمليك');
      setAdminMonthlyFee(config.adminResidentProfile.monthlyFee !== undefined ? config.adminResidentProfile.monthlyFee : 400);
      setAdminInitialBalance(config.adminResidentProfile.initialBalance || 0);
      setAdminNotes(config.adminResidentProfile.notes || 'رئيس اتحاد الملاك');
    }
  }, [config]);

  // Input states for categories
  const [newActivityType, setNewActivityType] = useState('');
  const [newPaymentType, setNewPaymentType] = useState('');
  const [newExpenseType, setNewExpenseType] = useState('');

  const [editingItem, setEditingItem] = useState<{ key: 'activityTypes' | 'paymentTypes' | 'expenseTypes'; originalValue: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Helper to start inline editing
  const startEditing = (key: 'activityTypes' | 'paymentTypes' | 'expenseTypes', value: string) => {
    setEditingItem({ key, originalValue: value });
    setEditValue(value);
  };

  // Helper to save inline editing
  const handleSaveEdit = (key: 'activityTypes' | 'paymentTypes' | 'expenseTypes') => {
    if (!editingItem || !editValue.trim()) return;
    const trimmedVal = editValue.trim();
    
    const exists = config[key].some(item => item === trimmedVal && item !== editingItem.originalValue);
    if (exists) return;

    const updatedList = config[key].map(item => item === editingItem.originalValue ? trimmedVal : item);
    
    let updatedActivityFees = { ...config.activityDefaultFees };
    if (key === 'activityTypes') {
      const currentFee = updatedActivityFees[editingItem.originalValue] ?? 0;
      delete updatedActivityFees[editingItem.originalValue];
      updatedActivityFees[trimmedVal] = currentFee;
      setActivityFees(updatedActivityFees);
    }

    const updated = {
      ...config,
      [key]: updatedList,
      ...(key === 'activityTypes' ? { activityDefaultFees: updatedActivityFees } : {})
    };
    onSaveConfig(updated);
    setEditingItem(null);
    setEditValue('');
  };

  // Input states for admins and assistant
  const [newAdminEmail, setNewAdminEmail] = useState('');
  
  // Technical Assistant state
  const [assistantEmail, setAssistantEmail] = useState(config.assistantConfig?.email || '');
  const [assistantPassword, setAssistantPassword] = useState(config.assistantConfig?.password || '');
  const [assistantName, setAssistantName] = useState(config.assistantConfig?.name || 'المساعد الفني');
  const [assistantSavedSuccess, setAssistantSavedSuccess] = useState(false);

  useEffect(() => {
    if (config.assistantConfig) {
      setAssistantEmail(config.assistantConfig.email || '');
      setAssistantPassword(config.assistantConfig.password || '');
      setAssistantName(config.assistantConfig.name || 'المساعد الفني');
    }
  }, [config.assistantConfig]);

  const handleSaveAssistantConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!assistantEmail.trim() || !assistantPassword.trim()) return;

    const updated: AppConfig = {
      ...config,
      assistantConfig: {
        email: assistantEmail.trim().toLowerCase(),
        password: assistantPassword.trim(),
        name: assistantName.trim() || 'المساعد الفني',
      },
    };
    onSaveConfig(updated);
    setAssistantSavedSuccess(true);
    setTimeout(() => setAssistantSavedSuccess(false), 3000);
  };

  const handleRemoveAssistantConfig = () => {
    if (!isAdmin) return;
    const updated: AppConfig = {
      ...config,
    };
    delete updated.assistantConfig;
    onSaveConfig(updated);
    setAssistantEmail('');
    setAssistantPassword('');
    setAssistantName('المساعد الفني');
  };

  const isAdmin = role === 'ADMIN';

  // Core update helper
  const updateConfig = (key: keyof AppConfig, updatedList: string[]) => {
    if (!isAdmin) return;
    const updated = {
      ...config,
      [key]: updatedList,
    };
    onSaveConfig(updated);
  };

  const handleSaveAccountingSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) return;

    const updated: AppConfig = {
      ...config,
      accountingStartDate: accountingStartDate || '2026-01-01',
      defaultMonthlyFee: defaultMonthlyFee > 0 ? defaultMonthlyFee : 400,
      activityDefaultFees: activityFees,
    };
    onSaveConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveAdminProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) return;

    const profile: AdminResidentProfile = {
      flatNumber: Number(adminFlatNumber) || 207,
      name: adminResidentName.trim() || 'محمد احمد (رئيس الاتحاد)',
      phone: adminResidentPhone.trim(),
      activityType: adminActivityType || 'سكني',
      ownershipType: adminOwnershipType || 'تمليك',
      monthlyFee: Number(adminMonthlyFee) >= 0 ? Number(adminMonthlyFee) : 400,
      initialBalance: Number(adminInitialBalance) || 0,
      notes: adminNotes.trim() || 'رئيس اتحاد الملاك',
    };

    const updatedBuildingName = buildingName.trim() || 'اتحاد الملاك';
    const updatedSecurityCode = adminSecurityCode.trim() || 'admin123';

    // Persist security code to authStore and storage
    setStoredAdminSecurityCode(updatedSecurityCode);

    const updated: AppConfig = {
      ...config,
      buildingName: updatedBuildingName,
      adminSecurityCode: updatedSecurityCode,
      adminResidentProfile: profile,
    };

    try {
      localStorage.setItem('custom_app_config', JSON.stringify(updated));
    } catch {
      // ignore
    }

    onSaveConfig(updated);
    setAdminProfileSaved(true);
    setTimeout(() => setAdminProfileSaved(false), 3500);
  };

  const handleResetDefaultActivityFees = () => {
    setActivityFees(defaultFeesMap);
    setDefaultMonthlyFee(400);
  };

  const handleAddActivityType = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newActivityType.trim();
    if (!trimmed || config.activityTypes.includes(trimmed)) return;
    
    const updatedActivityFees = {
      ...config.activityDefaultFees,
      [trimmed]: 0
    };
    setActivityFees(updatedActivityFees);
    
    const updated = {
      ...config,
      activityTypes: [...config.activityTypes, trimmed],
      activityDefaultFees: updatedActivityFees
    };
    onSaveConfig(updated);
    setNewActivityType('');
  };

  const handleAddPaymentType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentType.trim() || config.paymentTypes.includes(newPaymentType.trim())) return;
    updateConfig('paymentTypes', [...config.paymentTypes, newPaymentType.trim()]);
    setNewPaymentType('');
  };

  const handleAddExpenseType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseType.trim() || config.expenseTypes.includes(newExpenseType.trim())) return;
    updateConfig('expenseTypes', [...config.expenseTypes, newExpenseType.trim()]);
    setNewExpenseType('');
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newAdminEmail.trim().toLowerCase();
    if (!email || config.admins.includes(email)) return;
    updateConfig('admins', [...config.admins, email]);
    setNewAdminEmail('');
  };

  const handleDeleteItem = (key: keyof AppConfig, item: string) => {
    if (!isAdmin) return;
    const currentVal = config[key];
    if (!Array.isArray(currentVal)) return;
    const filtered = currentVal.filter((x) => x !== item);
    
    let updatedActivityFees = { ...config.activityDefaultFees };
    if (key === 'activityTypes') {
      delete updatedActivityFees[item];
      setActivityFees(updatedActivityFees);
    }
    
    const updated = {
      ...config,
      [key]: filtered as string[],
      ...(key === 'activityTypes' ? { activityDefaultFees: updatedActivityFees } : {})
    };
    onSaveConfig(updated);
  };

  const handleAddNewRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleInput.trim()) return;
    if (onAddRule) {
      onAddRule(newRuleInput.trim());
      setNewRuleInput('');
    }
  };

  // Calculate elapsed months for summary
  const getElapsedMonths = () => {
    try {
      const start = new Date(accountingStartDate || '2026-01-01');
      const now = new Date();
      const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
      return Math.max(1, months);
    } catch {
      return 1;
    }
  };

  return (
    <div className="w-full space-y-3.5" dir="rtl">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="text-right">
          <h2 className="text-lg font-black text-slate-900">إعدادات النظام والتحكم</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-bold">تحديد تاريخ بدء المحاسبة وحساب المديونيات، تهيئة المصنفات، وإدارة الصلاحيات واللوائح.</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Toggle sub-tabs */}
          <div className="flex flex-wrap bg-slate-100 p-0.5 rounded-xl w-fit gap-0.5">
            <button
              onClick={() => setActiveSubTab('settings')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'settings' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-800" />
              <span>إعدادات</span>
            </button>
            <button
              onClick={() => setActiveSubTab('permissions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'permissions' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>الاختصاصات والصلاحيات</span>
            </button>
            <button
              onClick={() => setActiveSubTab('types')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'types' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>تهيئة المصنفات والأنواع</span>
            </button>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-yellow-50/60 border border-yellow-200/60 rounded-xl p-2.5 text-yellow-900 text-xs font-bold text-right leading-relaxed">
          💡 تنبيه: هذه الصفحة مخصصة لعرض القوانين والاختصاصات. وبصفتك ساكنًا، يمكنك الاطلاع عليها لمعرفة حقوقك وواجباتك، بينما ينفرد رئيس اتحاد الملاك بصلاحية التعديل والإضافة.
        </div>
      )}

      {/* SUBTAB 0: GENERAL ACCOUNTING SETTINGS (تاريخ بدء المحاسبة والاشتراكات) */}
      {activeSubTab === 'settings' && (
        <div className="space-y-3.5 text-right">

          {/* Card 1: Union President & Building Details */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-black text-slate-900">بيانات رئيس الاتحاد وهوية العقار</h3>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] font-black">
                    رئيس اتحاد الملاك
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">
                  تعديل اسم العمارة المعروض في التطبيق، ورمز الأمان الإداري للرئاسة، وبيانات رئيس الاتحاد كساكن في المبنى.
                </p>
              </div>

              {adminProfileSaved && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black animate-fade-in self-start sm:self-auto">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ وتحديث بيانات العقار ورئيس الاتحاد!</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveAdminProfile} className="space-y-4">
              {/* Row 1: Building Name & Admin Security Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                {/* 1. Building Name */}
                <div className="space-y-1.5 bg-blue-50/60 p-3 rounded-xl border border-blue-200/70">
                  <label className="block text-xs font-black text-blue-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-900" />
                      <span>اسم العمارة / العقار:</span>
                    </span>
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-100/70 px-2 py-0.5 rounded-full">يظهر في كامل التطبيق</span>
                  </label>
                  <input
                    type="text"
                    value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 bg-white border border-blue-200 focus:border-blue-600 rounded-xl text-xs font-black text-slate-900 outline-none transition disabled:bg-slate-100 text-right"
                    placeholder="مثال: عمارة التقوى"
                    required
                  />
                  <p className="text-[10px] text-slate-500 font-bold">اسم العقار المعروض في الترويسات والتقارير وسندات القبض.</p>
                </div>

                {/* 2. Admin Security Code */}
                <div className="space-y-1.5 bg-amber-50/60 p-3 rounded-xl border border-amber-200/70">
                  <label className="block text-xs font-black text-amber-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-600" />
                      <span>رمز الأمان الإداري الخاص برئيس الاتحاد:</span>
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-100/70 px-2 py-0.5 rounded-full">سري للرئاسة</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showSecurityCode ? 'text' : 'password'}
                      value={adminSecurityCode}
                      onChange={(e) => setAdminSecurityCode(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full pl-10 pr-3 py-2 bg-white border border-amber-200 focus:border-amber-600 rounded-xl text-xs font-mono font-black text-slate-900 outline-none transition disabled:bg-slate-100 text-left"
                      placeholder="admin123"
                      dir="ltr"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecurityCode(!showSecurityCode)}
                      className="absolute left-2 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
                      title={showSecurityCode ? 'إخفاء الرمز' : 'إظهار الرمز'}
                    >
                      {showSecurityCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold">الرمز السري المعتمد لتوثيق وتفعيل حساب رئيس الاتحاد في شاشة التسجيل.</p>
                </div>
              </div>

              {/* Row 2: Resident Profile Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-900" />
                  <span>بيانات رئيس الاتحاد كساكن في المبنى (تظهر في كشوف السكان والوحدات):</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 1. Flat Number */}
                  <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-blue-900" />
                      <span>رقم وحدة / شقة رئيس الاتحاد:</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={adminFlatNumber}
                      onChange={(e) => setAdminFlatNumber(Number(e.target.value) || 207)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-black text-slate-900 outline-none transition disabled:bg-slate-100 text-right"
                      placeholder="مثال: 207"
                      required
                    />
                    <p className="text-[10px] text-slate-400 font-bold">رقم الشقة الخاصة برئيس الاتحاد</p>
                  </div>

                  {/* 2. Resident Name */}
                  <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-900" />
                      <span>اسم رئيس الاتحاد (الساكن):</span>
                    </label>
                    <input
                      type="text"
                      value={adminResidentName}
                      onChange={(e) => setAdminResidentName(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-black text-slate-900 outline-none transition disabled:bg-slate-100 text-right"
                      placeholder="مثال: محمد احمد"
                      required
                    />
                    <p className="text-[10px] text-slate-400 font-bold">الاسم الذي يظهر في كشوف السكان</p>
                  </div>

                  {/* 3. Phone */}
                  <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-900" />
                      <span>رقم الهاتف / التواصل:</span>
                    </label>
                    <input
                      type="tel"
                      value={adminResidentPhone}
                      onChange={(e) => setAdminResidentPhone(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-black text-slate-900 outline-none transition disabled:bg-slate-100 text-right"
                      placeholder="مثال: 01012345678"
                    />
                    <p className="text-[10px] text-slate-400 font-bold">للتواصل وسندات القبض</p>
                  </div>

                  {/* 4. Activity Type */}
                  <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-900" />
                      <span>نوع نشاط الوحدة:</span>
                    </label>
                    <select
                      value={adminActivityType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setAdminActivityType(newType);
                        const defaultFee = activityFees[newType] ?? defaultFeesMap[newType] ?? 400;
                        setAdminMonthlyFee(defaultFee);
                      }}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-black text-slate-900 outline-none transition disabled:bg-slate-100 text-right cursor-pointer"
                    >
                      {config.activityTypes.map(act => (
                        <option key={act} value={act}>{act}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 font-bold">تصنيف نشاط شقة رئيس الاتحاد</p>
                  </div>

                  {/* 5. Ownership Type */}
                  <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-900" />
                      <span>نوع الملكية:</span>
                    </label>
                    <select
                      value={adminOwnershipType}
                      onChange={(e) => setAdminOwnershipType(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-black text-slate-900 outline-none transition disabled:bg-slate-100 text-right cursor-pointer"
                    >
                      <option value="تمليك">تمليك (مالك)</option>
                      <option value="إيجار">إيجار (مستأجر)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 font-bold">صفة ملكية الوحدة</p>
                  </div>

                  {/* 6. Monthly Fee */}
                  <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>الاشتراك الشهري للشقة:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={adminMonthlyFee}
                        onChange={(e) => setAdminMonthlyFee(Number(e.target.value) || 0)}
                        disabled={!isAdmin}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-black text-slate-900 outline-none transition disabled:bg-slate-100 text-right"
                        placeholder="400"
                      />
                      <span className="text-xs font-bold text-slate-500 shrink-0">ج.م/شهر</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold">قيمة الاشتراك المحسوبة شهرياً</p>
                  </div>

                  {/* 7. Initial Balance */}
                  <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-900" />
                      <span>الرصيد الافتتاحي (السابق):</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={adminInitialBalance}
                        onChange={(e) => setAdminInitialBalance(Number(e.target.value) || 0)}
                        disabled={!isAdmin}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-black text-slate-900 outline-none transition disabled:bg-slate-100 text-right"
                        placeholder="0"
                      />
                      <span className="text-xs font-bold text-slate-500 shrink-0">ج.م</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold">موجب = دائن | سالب = مديونية</p>
                  </div>

                  {/* 8. Notes */}
                  <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <BadgeCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>الصفة / الملاحظات:</span>
                    </label>
                    <input
                      type="text"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-black text-slate-900 outline-none transition disabled:bg-slate-100 text-right"
                      placeholder="رئيس اتحاد الملاك"
                    />
                    <p className="text-[10px] text-slate-400 font-bold">الملاحظات المسجلة في الكشف</p>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-xs hover:shadow transition flex items-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ وتثبيت اسم العمارة ورمز الأمان وبيانات رئيس الاتحاد</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Card 2: Accounting start date and fee defaults */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
              <div className="text-right">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <span>تاريخ بدء المحاسبة واحتساب المديونيات والسداد</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">
                  حدد التاريخ الذي يبدأ منه التطبيق احتساب الشهور المستحقة والمديونيات على الوحدات السكنية ومقارنتها بما تم سداده.
                </p>
              </div>

              {savedSuccess && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black animate-fade-in self-start sm:self-auto">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ الإعدادات بنجاح!</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveAccountingSettings} className="space-y-4">
              {/* 1. Start Date Picker */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5">
                <label className="block text-xs font-black text-slate-800">
                  تاريخ بدء المحاسبة (سنة - شهر - يوم):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={accountingStartDate}
                    onChange={(e) => setAccountingStartDate(e.target.value)}
                    disabled={!isAdmin}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs font-black text-slate-800 outline-none transition disabled:bg-slate-100 cursor-pointer"
                    required
                  />
                </div>
                
                {/* Quick Preset Buttons */}
                {isAdmin && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setAccountingStartDate('2026-01-01')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition border cursor-pointer ${accountingStartDate === '2026-01-01' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                    >
                      بداية عام 2026 (2026-01-01)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const y = now.getFullYear();
                        const m = String(now.getMonth() + 1).padStart(2, '0');
                        setAccountingStartDate(`${y}-${m}-01`);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                    >
                      أول الشهر الحالي
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                  * تاريخ البدء الحالي المعتمد: <span className="text-blue-900 font-black">{accountingStartDate}</span> (يتم احتساب <span className="text-slate-900 font-black">{getElapsedMonths()}</span> شهر حتى تاريخ اليوم).
                </p>
              </div>

              {/* 3. Default Fees Per Activity Type */}
              <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">
                      قيمة الاشتراك الافتراضي حسب نوع النشاط
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                      يتم تعيين هذه المبالغ تلقائياً عند إضافة أو تعديل الشقق وفقاً لنوع النشاط المحدد لكل وحدة
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleResetDefaultActivityFees}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-900 border border-slate-200 rounded-xl text-[11px] font-bold transition cursor-pointer self-start sm:self-auto"
                    >
                      استعادة القيم الافتراضية المحددة
                    </button>
                  )}
                </div>

                 {/* Grid of Activity Default Fees */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {config.activityTypes.map((act) => {
                    const currentVal = activityFees[act] !== undefined 
                      ? activityFees[act] 
                      : (defaultFeesMap[act] || 0);

                    return (
                      <div
                        key={act}
                        className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-900"></span>
                            <span>{act}</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {act === 'سكني' ? '(الافتراضي 400)' : act === 'سكني مغلق' ? '(الافتراضي 200)' : act === 'مفروش' ? '(الافتراضي 600)' : act === 'إداري' ? '(الافتراضي 800)' : act === 'تجاري' ? '(الافتراضي 500)' : act === 'بدون تشطيب' ? '(الافتراضي 0)' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={currentVal}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setActivityFees(prev => ({ ...prev, [act]: val }));
                            }}
                            disabled={!isAdmin}
                            className="flex-1 px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-xs font-black text-slate-900 outline-none text-right transition disabled:bg-slate-100"
                            placeholder="المبلغ"
                          />
                          <span className="text-[11px] font-bold text-slate-500 shrink-0">ج.م / شهر</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              {isAdmin && (
                <div className="flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-black rounded-xl shadow-sm hover:shadow transition flex items-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ وتطبيق تاريخ بدء المحاسبة والاشتراكات</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Educational Calculation Box */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 space-y-2">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-blue-900" />
              <span>كيف يعمل احتساب رصيد ومديونية كل شقة؟</span>
            </h4>
            <ul className="text-xs text-slate-600 font-bold space-y-1.5 list-disc list-inside leading-relaxed">
              <li>يقوم النظام بعدّ الأشهر المنقضية من <span className="text-blue-900 font-black">تاريخ بدء المحاسبة</span> المحدد أعلاه حتى الشهر الحالي.</li>
              <li>يتم ضرب عدد الأشهر في <span className="text-slate-800 font-black">الرسوم الشهرية</span> المقررة للشقة لمعرفة إجمالي المبالغ المستحقة.</li>
              <li>يقوم النظام بجمع كل المبالغ المسددة في كشف التحصيلات لنفس الوحدة ومقارنتها بإجمالي المستحقات.</li>
              <li>إذا كان هناك عجز في السداد، يظهر الرصيد <span className="text-red-600 font-black">بالسالب وباللون الأحمر</span> (مديونية مستحقة). وإذا سدد الساكن مقدماً، يظهر الرصيد <span className="text-emerald-700 font-black">بالموجب وباللون الأخضر</span>.</li>
            </ul>
          </div>
        </div>
      )}

      {/* SUBTAB 1: MANAGING TYPES AND CATEGORIES */}
      {activeSubTab === 'types' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-right">
          {/* 1. Apartment Types */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-xs font-black text-slate-900">إدارة أنواع الوحدات</h3>
            </div>
            
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">تعريف الأنشطة المخصصة للشقق والمنشآت وتصنيفها.</p>

            {isAdmin && (
              <form onSubmit={handleAddActivityType} className="flex gap-1">
                <button
                  type="submit"
                  className="px-2.5 bg-blue-900 text-white rounded-lg font-bold text-xs hover:bg-blue-950 transition flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  placeholder="نوع جديد (مثال: عيادة)"
                  value={newActivityType}
                  onChange={(e) => setNewActivityType(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-100 focus:bg-white rounded-lg text-xs outline-none text-right font-bold transition"
                  required
                />
              </form>
            )}

            <div className="flex-1 overflow-y-auto max-h-52 space-y-1.5 pr-1">
              {config.activityTypes.map((type) => {
                const isEditing = editingItem?.key === 'activityTypes' && editingItem.originalValue === type;
                return (
                  <div key={type} className="flex items-center justify-between p-1.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition">
                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full" dir="rtl">
                        <button
                          onClick={() => handleSaveEdit('activityTypes')}
                          className="p-1 text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100 transition cursor-pointer shrink-0"
                          title="حفظ"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingItem(null)}
                          className="p-1 text-slate-400 bg-slate-50 rounded-md hover:bg-slate-100 transition cursor-pointer shrink-0"
                          title="إلغاء"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-0.5 text-xs font-bold bg-white border border-slate-200 rounded-md text-right outline-none min-w-0"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit('activityTypes');
                            else if (e.key === 'Escape') setEditingItem(null);
                          }}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        {isAdmin ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleDeleteItem('activityTypes', type)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-md transition cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => startEditing('activityTypes', type)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                              title="تعديل"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="w-4" />
                        )}
                        <span className="text-xs font-extrabold text-indigo-900 truncate">{type}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Payment Types */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-xs font-black text-slate-900">إدارة أنواع التحصيلات</h3>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">تحديد فئات الإيرادات والاشتراكات المقررة على سكان العمارة بانتظام.</p>

            {isAdmin && (
              <form onSubmit={handleAddPaymentType} className="flex gap-1">
                <button
                  type="submit"
                  className="px-2.5 bg-blue-900 text-white rounded-lg font-bold text-xs hover:bg-blue-950 transition flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  placeholder="نوع تحصيل (مثال: صيانة غاز)"
                  value={newPaymentType}
                  onChange={(e) => setNewPaymentType(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-100 focus:bg-white rounded-lg text-xs outline-none text-right font-bold transition"
                  required
                />
              </form>
            )}

            <div className="flex-1 overflow-y-auto max-h-52 space-y-1.5 pr-1">
              {config.paymentTypes.map((type) => {
                const isEditing = editingItem?.key === 'paymentTypes' && editingItem.originalValue === type;
                return (
                  <div key={type} className="flex items-center justify-between p-1.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition">
                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full" dir="rtl">
                        <button
                          onClick={() => handleSaveEdit('paymentTypes')}
                          className="p-1 text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100 transition cursor-pointer shrink-0"
                          title="حفظ"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingItem(null)}
                          className="p-1 text-slate-400 bg-slate-50 rounded-md hover:bg-slate-100 transition cursor-pointer shrink-0"
                          title="إلغاء"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-0.5 text-xs font-bold bg-white border border-slate-200 rounded-md text-right outline-none min-w-0"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit('paymentTypes');
                            else if (e.key === 'Escape') setEditingItem(null);
                          }}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        {isAdmin ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleDeleteItem('paymentTypes', type)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-md transition cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => startEditing('paymentTypes', type)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                              title="تعديل"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="w-4" />
                        )}
                        <span className="text-xs font-extrabold text-emerald-900 truncate">{type}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Expense Types */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-xs font-black text-slate-900">إدارة أنواع المصروفات</h3>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">تعريف بنود الصرف وأوجه النفقات المسموح بها من قبل اتحاد الملاك.</p>

            {isAdmin && (
              <form onSubmit={handleAddExpenseType} className="flex gap-1">
                <button
                  type="submit"
                  className="px-2.5 bg-blue-900 text-white rounded-lg font-bold text-xs hover:bg-blue-950 transition flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  placeholder="بند مصروف (مثال: صيانة جراج)"
                  value={newExpenseType}
                  onChange={(e) => setNewExpenseType(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-100 focus:bg-white rounded-lg text-xs outline-none text-right font-bold transition"
                  required
                />
              </form>
            )}

            <div className="flex-1 overflow-y-auto max-h-52 space-y-1.5 pr-1">
              {config.expenseTypes.map((type) => {
                const isEditing = editingItem?.key === 'expenseTypes' && editingItem.originalValue === type;
                return (
                  <div key={type} className="flex items-center justify-between p-1.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition">
                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full" dir="rtl">
                        <button
                          onClick={() => handleSaveEdit('expenseTypes')}
                          className="p-1 text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100 transition cursor-pointer shrink-0"
                          title="حفظ"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingItem(null)}
                          className="p-1 text-slate-400 bg-slate-50 rounded-md hover:bg-slate-100 transition cursor-pointer shrink-0"
                          title="إلغاء"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-0.5 text-xs font-bold bg-white border border-slate-200 rounded-md text-right outline-none min-w-0"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit('expenseTypes');
                            else if (e.key === 'Escape') setEditingItem(null);
                          }}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        {isAdmin ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleDeleteItem('expenseTypes', type)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-md transition cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => startEditing('expenseTypes', type)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                              title="تعديل"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="w-4" />
                        )}
                        <span className="text-xs font-extrabold text-amber-900 truncate">{type}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: RESPONSIBILITIES AND PERMISSIONS */}
      {activeSubTab === 'permissions' && (
        <div className="space-y-3 text-right">
          {/* Rules Management Card inside Permissions */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3 text-right">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2.5 gap-2">
              <div className="text-right">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-yellow-700" />
                  <span>تعديل وصياغة لائحة وتعليمات إدارة العمارة ({rules.length})</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  يمكن لرئيس الاتحاد إضافة وتعديل وحذف بنود وقواعد حسن الجوار المنظمة للعقار ليطلع عليها جميع السكان.
                </p>
              </div>
              {onOpenEditRulesModal && isAdmin && (
                <button
                  onClick={onOpenEditRulesModal}
                  className="px-3 py-1.5 bg-blue-50 text-blue-900 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>فتح نافذة التعديل المنفصلة</span>
                </button>
              )}
            </div>

            {isAdmin && (
              <form onSubmit={handleAddNewRule} className="flex gap-1.5">
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-blue-900 text-white rounded-xl font-bold text-xs hover:bg-blue-950 active:scale-[0.98] transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مادة للائحة</span>
                </button>
                <input
                  type="text"
                  placeholder="اكتب نص المادة أو التعليمات الجديدة (مثال: يمنع استخدام المصعد لنقل مواد البناء الثقيلة)..."
                  value={newRuleInput}
                  onChange={(e) => setNewRuleInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs outline-none text-right font-bold transition"
                  required
                />
              </form>
            )}

            {/* List of rules */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {rules.length === 0 ? (
                <p className="text-center text-xs text-slate-400 font-bold py-4">لا توجد مواد تعليمات مسجلة حالياً.</p>
              ) : (
                rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2.5 p-2.5 bg-slate-50/60 hover:bg-slate-50 border border-slate-100 rounded-xl transition">
                    {isAdmin && onDeleteRule && (
                      <button
                        onClick={() => onDeleteRule(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0"
                        title="حذف البند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="flex-1 text-right">
                      <span className="inline-block px-1.5 py-0.5 bg-yellow-50 text-yellow-900 border border-yellow-200/50 text-[10px] font-black rounded-md ml-2">
                        مادة {idx + 1}
                      </span>
                      <span className="text-xs text-slate-800 font-bold leading-relaxed">{rule}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Split roles comparison grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* 1. Admin/President Capabilities */}
            <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2 mb-1">
                <span className="px-2.5 py-0.5 bg-blue-900 text-white text-[10px] font-black rounded-md">رئيس الاتحاد (المدير الإداري)</span>
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>صلاحيات رئيس الاتحاد</span>
                  <Shield className="w-3.5 h-3.5 text-blue-950 fill-blue-50" />
                </h3>
              </div>

              <p className="text-xs text-slate-500 font-bold leading-relaxed">يتمتع رئيس الاتحاد بكامل الصلاحيات الإدارية والرقابية والمالية لضمان سلامة تشغيل العقار ومصالح الملاك العليا.</p>

              <div className="space-y-2">
                {[
                  'إدارة وإضافة وحذف وحساب شؤون السكان',
                  'تسجيل، تعديل، وحذف كشوفات التحصيلات والاشتراكات المعتمدة',
                  'تسجيل وتحديث وفلترة وحذف فواتير المصروفات والنفقات',
                  'صياغة وإدارة اللائحة الداخلية وجدول العقوبات للعمارة',
                  'صياغة ونشر القرارات والاستبيانات التفاعلية وتصفية الأصوات',
                  'تنسيق وإقرار الأجندة والأحداث في تقويم العمارة التفاعلي',
                  'إرسال التنبيهات والإشعارات العامة لكافة السكان دفعة واحدة',
                  'تعديل وإعادة تهيئة إعدادات النظام ومصنفات الوحدات والتحصيلات',
                ].map((cap, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span className="text-xs text-slate-700 font-bold leading-normal">{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Resident Capabilities */}
            <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2 mb-1">
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-md">ساكن / مالك وحدة</span>
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>صلاحيات الساكن والشفافية المتاحة</span>
                  <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                </h3>
              </div>

              <p className="text-xs text-slate-500 font-bold leading-relaxed">يستمتع الساكن بنظام كامل من الشفافية لتبادل الآراء والمشاركة المجتمعية مع حماية الخصوصية الشخصية.</p>

              <div className="space-y-2 border-b pb-3 mb-2">
                {/* Granted permissions */}
                {[
                  'الاطلاع الشامل على كشوف المبالغ المحصلة والتحققات المالية (للقراءة فقط)',
                  'الاطلاع التفصيلي على فواتير ومستندات المصروفات (للقراءة فقط)',
                  'المشاركة والتصويت الفعال في استبيانات القرارات العامة والجمعية العمومية',
                  'كتابة ونشر الشكاوى والتعليقات والتحذيرات على لوحة النقاشات المفتوحة',
                  'المحادثة والتفاعل الفوري مع الجيران في صفحة الدردشة الفورية',
                  'الاطلاع على لوائح وتعليمات العمارة للقراءة فقط',
                  'تقديم ومتابعة طلبات الصيانة الخاصة بالوحدة وتلقي الإشعار فور إصلاحها',
                ].map((cap, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span className="text-xs text-slate-700 font-bold leading-normal">{cap}</span>
                  </div>
                ))}
              </div>

              {/* Explicit Restrictions */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-extrabold text-red-600 mb-1">🚫 يمنع تماماً على الساكن:</h4>
                {[
                  'إضافة أو حذف أو تعديل بيانات وحسابات شقق الجيران الآخرين',
                  'إضافة أو تعديل أو إلغاء قيود التحصيل أو إيصالات الدفع الرسمية',
                  'تسجيل أو تعديل أو إلغاء فواتير ومصروفات العقار الموحدة',
                  'تعديل أو حذف أو تلاعب بلوائح وتعليمات اتحاد الملاك الأساسية',
                ].map((cap, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                      <X className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span className="text-xs text-slate-500 font-semibold leading-normal">{cap}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Executive users configuration (admins and managers list) */}
          {isAdmin && (
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* Admins Emails config */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-slate-800 border-b pb-1.5">تفويض بريد إلكتروني لرئاسة الاتحاد (الأدمن)</h4>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">أدخل بريد جوجل الإلكتروني الخاص برئيس اتحاد الملاك لمنحه كل الصلاحيات.</p>
                
                <form onSubmit={handleAddAdmin} className="flex gap-1.5">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-900 text-white text-xs font-bold rounded-lg hover:bg-blue-950 transition cursor-pointer"
                  >
                    تفعيل تفويض أدمن
                  </button>
                  <input
                    type="email"
                    placeholder="email@gmail.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-100 focus:bg-white rounded-lg text-xs outline-none text-left font-bold transition"
                    required
                  />
                </form>

                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {config.admins.map((email) => (
                    <div key={email} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                      <button
                        onClick={() => handleDeleteItem('admins', email)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-md transition cursor-pointer"
                        title="إلغاء التفويض"
                        disabled={config.admins.length <= 1} // Protect at least one admin
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] font-bold text-slate-700">{email}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Assistant Config */}
              <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 col-span-1 md:col-span-1">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-2">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      <span>تفويض مساعد فني</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mt-0.5">
                      تحديد إيميل وباسورد المساعد الفني لتسجيل التحصيل والمصروفات ومتابعة الصيانة والدليل والتقويم دون صلاحيات التعديل أو الحذف.
                    </p>
                  </div>
                  {config.assistantConfig?.email && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md border border-emerald-200 shrink-0">
                      تفويض مفعل
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveAssistantConfig} className="space-y-2.5 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">البريد الإلكتروني (Email)</label>
                      <input
                        type="email"
                        placeholder="assistant@pyramids.com"
                        value={assistantEmail}
                        onChange={(e) => setAssistantEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none text-left"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">كلمة المرور (Password)</label>
                      <input
                        type="text"
                        placeholder="كلمة المرور"
                        value={assistantPassword}
                        onChange={(e) => setAssistantPassword(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none text-left"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">اسم المساعد الفني (اختياري)</label>
                    <input
                      type="text"
                      placeholder="مثال: المساعد الفني"
                      value={assistantName}
                      onChange={(e) => setAssistantName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none text-right"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    {config.assistantConfig?.email ? (
                      <button
                        type="button"
                        onClick={handleRemoveAssistantConfig}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إلغاء التفويض</span>
                      </button>
                    ) : <div />}

                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-black rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>حفظ تفويض المساعد</span>
                    </button>
                  </div>

                  {assistantSavedSuccess && (
                    <div className="bg-emerald-50 text-emerald-800 text-[10px] font-bold p-2 rounded-lg border border-emerald-200 text-center">
                      تم تفعيل وحفظ تفويض المساعد الفني بنجاح!
                    </div>
                  )}
                </form>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};

