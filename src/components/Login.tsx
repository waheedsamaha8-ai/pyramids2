import React, { useState } from 'react';
import { googleSignIn, logoutUser } from '../services/firebaseConfig';
import { 
  loginWithEmail, 
  registerAdmin, 
  submitJoinRequest, 
  fetchAllJoinRequests,
  getLocalAdmins,
  getAdminSecurityCode,
  setStoredAdminSecurityCode
} from '../services/authStore';
import { 
  Mail, 
  Lock, 
  Building, 
  User, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  LogIn, 
  UserPlus, 
  ShieldCheck, 
  Users, 
  Key, 
  Sparkles,
  ArrowRight,
  Home,
  Wrench,
  Smartphone,
  Download,
  Database,
  RefreshCw
} from 'lucide-react';
import { clearTemporaryCache } from '../utils/cacheManager';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  // Main Portal Selector: Union President vs Technical Assistant vs Residents/Tenants
  const [portalMode, setPortalMode] = useState<'PRESIDENT' | 'ASSISTANT' | 'RESIDENT'>('PRESIDENT');

  // Sub-tabs for each portal
  const [presidentTab, setPresidentTab] = useState<'login' | 'register'>('login');
  const [residentTab, setResidentTab] = useState<'login' | 'register'>('login');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sign In inputs (shared or dedicated)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // President Register inputs
  const [adminName, setAdminName] = useState('محمد احمد');
  const [buildingNameInput, setBuildingNameInput] = useState(() => {
    try {
      const raw = localStorage.getItem('custom_app_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.buildingName) return parsed.buildingName;
      }
      const rawCached = localStorage.getItem('cache_config');
      if (rawCached) {
        const parsed = JSON.parse(rawCached);
        if (parsed.buildingName) return parsed.buildingName;
      }
    } catch {
      // ignore
    }
    return 'اتحاد الملاك';
  });
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminSecurityKey, setAdminSecurityKey] = useState('');

  // Resident Register (Join Request) inputs
  const [flatNumber, setFlatNumber] = useState('');
  const [residentType, setResidentType] = useState<'OWNER' | 'TENANT'>('OWNER');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [showIosPwaGuide, setShowIosPwaGuide] = useState(false);

  React.useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setPwaInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    setIsIosDevice(isIos);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleInstalled = () => {
      setPwaInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handlePwaInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setPwaInstalled(true);
      setDeferredPrompt(null);
    }
  };

  // Handle standard custom email/password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await loginWithEmail(loginEmail, loginPassword);

      if (data.success) {
        if (data.flatNumber) {
          localStorage.setItem('resident_flat_number', data.flatNumber.toString());
        }

        // Sync admin profile and building into application settings
        if (data.role === 'ADMIN') {
          try {
            const raw = localStorage.getItem('custom_app_config');
            const existingConfig = raw ? JSON.parse(raw) : {};
            if ((data as any).buildingName) {
              existingConfig.buildingName = (data as any).buildingName;
            }
            if (!existingConfig.adminResidentProfile) {
              existingConfig.adminResidentProfile = {
                flatNumber: 101,
                name: data.name || 'محمد احمد (رئيس الاتحاد)',
                phone: '',
                activityType: 'سكني',
                ownershipType: 'تمليك',
                monthlyFee: 400,
                initialBalance: 0,
                notes: 'رئيس اتحاد الملاك',
              };
            } else if (data.name) {
              existingConfig.adminResidentProfile.name = data.name;
            }
            if (!existingConfig.admins) existingConfig.admins = [];
            if (!existingConfig.admins.includes(data.email.toLowerCase().trim())) {
              existingConfig.admins.push(data.email.toLowerCase().trim());
            }
            localStorage.setItem('custom_app_config', JSON.stringify(existingConfig));
          } catch {
            // ignore
          }
        }

        const user = {
          email: data.email,
          displayName: data.name,
          uid: data.email,
          role: data.role || (portalMode === 'PRESIDENT' ? 'ADMIN' : 'RESIDENT'),
          flatNumber: data.flatNumber,
        };
        localStorage.setItem('custom_user_session', JSON.stringify(user));
        onLoginSuccess(user, 'local-token');
      }
    } catch (err: any) {
      setError(err.message || 'خطأ أثناء تسجيل الدخول بالبريد الإلكتروني.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register President / Admin
  const handleRegisterAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setError('الرجاء كتابة اسم رئيس الاتحاد والبريد الإلكتروني وكلمة المرور.');
      return;
    }
    if (!adminSecurityKey.trim()) {
      setError('الرجاء إدخال رمز الأمان الإداري الخاص برئاسة الاتحاد.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const selectedBuildingName = buildingNameInput.trim() || 'اتحاد الملاك';
      const selectedAdminName = adminName.trim() || 'محمد احمد';

      const data = await registerAdmin({
        name: selectedAdminName,
        phone: adminPhone.trim(),
        email: adminEmail.trim(),
        password: adminPassword.trim(),
        securityKey: adminSecurityKey.trim(),
        buildingName: selectedBuildingName,
      });

      // Save buildingName, security code, and admin profile directly to application settings config
      try {
        const raw = localStorage.getItem('custom_app_config');
        const existingConfig = raw ? JSON.parse(raw) : {};
        existingConfig.buildingName = selectedBuildingName;
        existingConfig.adminSecurityCode = adminSecurityKey.trim();
        if (!existingConfig.admins) existingConfig.admins = [];
        if (!existingConfig.admins.includes(adminEmail.toLowerCase().trim())) {
          existingConfig.admins.push(adminEmail.toLowerCase().trim());
        }
        if (!existingConfig.adminResidentProfile) {
          existingConfig.adminResidentProfile = {
            flatNumber: 101,
            name: selectedAdminName,
            phone: adminPhone.trim(),
            activityType: 'سكني',
            ownershipType: 'تمليك',
            monthlyFee: 400,
            initialBalance: 0,
            notes: 'رئيس اتحاد الملاك',
          };
        } else {
          existingConfig.adminResidentProfile.name = selectedAdminName;
          existingConfig.adminResidentProfile.phone = adminPhone.trim();
        }
        localStorage.setItem('custom_app_config', JSON.stringify(existingConfig));
        setStoredAdminSecurityCode(adminSecurityKey.trim());
      } catch {
        // ignore
      }

      setSuccessMessage('تم تفعيل وتسجيل حساب رئيس الاتحاد بنجاح! جاري الدخول للوحة التحكم...');
      
      const user = {
        email: data.email,
        displayName: data.name,
        uid: data.email,
        role: 'ADMIN',
      };
      localStorage.setItem('custom_user_session', JSON.stringify(user));
      
      setTimeout(() => {
        onLoginSuccess(user, 'local-token');
      }, 600);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل حساب رئيس الاتحاد.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        const { user, accessToken } = result;
        const email = user.email?.toLowerCase().trim() || '';

        // 1. Is President / Admin?
        const currentAdmins = getLocalAdmins();
        const isAdminMatch = currentAdmins.some((a: any) => a.email.toLowerCase().trim() === email);
        if (isAdminMatch || email === 'admin@altaqwa.com' || email === 'waheedsamaha8@gmail.com') {
          (user as any).role = 'ADMIN';
          localStorage.setItem('custom_user_session', JSON.stringify({ ...user, role: 'ADMIN' }));
          onLoginSuccess(user, accessToken);
          return;
        }

        // 2. Query join requests or approved list from store
        const requests = await fetchAllJoinRequests();
        const match = requests.find((r: any) => r.email.toLowerCase().trim() === email);
        
        if (match) {
          if (match.status === 'APPROVED') {
            localStorage.setItem('resident_flat_number', match.flatNumber.toString());
            (user as any).role = 'RESIDENT';
            (user as any).flatNumber = match.flatNumber;
            localStorage.setItem('custom_user_session', JSON.stringify({ ...user, role: 'RESIDENT', flatNumber: match.flatNumber }));
            onLoginSuccess(user, accessToken);
            return;
          } else if (match.status === 'PENDING') {
            await logoutUser();
            setError('طلب الانضمام الخاص بك قيد المراجعة حالياً من قبل رئيس الاتحاد. يرجى المحاولة لاحقاً بمجرد الموافقة.');
            return;
          } else if (match.status === 'DECLINED') {
            await logoutUser();
            setError('معذرةً، لقد تم رفض طلب الانضمام الخاص بك. يرجى التواصل مع إدارة الملاك.');
            return;
          }
        }

        // Block unauthorized google logins
        await logoutUser();
        setError('هذا البريد الإلكتروني غير مسجل بعد في كشوف الملاك أو لم تتم الموافقة عليه. يرجى إرسال طلب انضمام أولاً.');
      }
    } catch (err: any) {
      console.error(err);
      if (err && (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user'))) {
        setError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        setError('هذا النطاق (Netlify) يحتاج للإضافة إلى النطاقات المصرح بها في Google Firebase Console. يمكنك استخدام تسجيل الدخول السريع أو البريد الإلكتروني وكلمة المرور مباشرة.');
      } else {
        setError('فشل تسجيل الدخول بـ Google. يمكنك استخدام تسجيل الدخول السريع أو البريد وكلمة المرور.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Resident Join Request Submit
  const handleJoinRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flatNumber) {
      setError('الرجاء إدخال رقم الشقة.');
      return;
    }
    if (residentType === 'OWNER' && (!ownerName || !ownerPhone)) {
      setError('الرجاء كتابة اسم المالك ورقم تليفون الواتساب.');
      return;
    }
    if (residentType === 'TENANT' && (!tenantName || !tenantPhone || !ownerName)) {
      setError('الرجاء كتابة اسم المستأجر، رقم تليفون الواتساب، واسم المالك للوحدة.');
      return;
    }
    if (!registerEmail || !registerPassword) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور المطلوب التسجيل بهما.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        flatNumber: parseInt(flatNumber),
        residentType,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        tenantName: residentType === 'TENANT' ? tenantName.trim() : '',
        tenantPhone: residentType === 'TENANT' ? tenantPhone.trim() : '',
        email: registerEmail.trim(),
        password: registerPassword,
      };

      const result = await submitJoinRequest(payload);

      setSuccessMessage(result.message || 'تم إرسال طلب الانضمام بنجاح! طلبك قيد المراجعة والاعتماد حالياً من قبل رئيس الاتحاد.');
      // Clear fields
      setFlatNumber('');
      setOwnerName('');
      setOwnerPhone('');
      setTenantName('');
      setTenantPhone('');
      setRegisterEmail('');
      setRegisterPassword('');
      setResidentTab('login');
    } catch (err: any) {
      setError(err.message || 'خطأ أثناء إرسال طلب الانضمام.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 sm:py-12 bg-gradient-to-b from-slate-100 to-slate-200 dark:from-[#080d1a] dark:to-[#0f172a]" dir="rtl">
      <div className="w-full max-w-lg bg-white dark:bg-[#111a2e] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col transition-all">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-900 dark:bg-blue-800 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20 mb-3 border border-blue-700/40">
            <Building className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-blue-950 dark:text-white text-center">اتحاد ملاك {buildingNameInput || 'عمارة التقوى'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] text-center mt-1 font-bold">النظام الذكي والموحد لإدارة شؤون وماليات وخدمات العمارة</p>
        </div>

        {/* ========================================================================= */}
        {/* PRIMARY PORTAL SELECTOR: President Mode vs Resident Mode                 */}
        {/* ========================================================================= */}
        <div className="mb-6">
          <div className="text-center mb-2">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              اختر بوابة الدخول والتسجيل
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setPortalMode('PRESIDENT');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 px-1 rounded-xl font-black text-[11px] sm:text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                portalMode === 'PRESIDENT'
                  ? 'bg-blue-900 text-white shadow-md shadow-blue-900/30 ring-2 ring-blue-900/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>رئيس الاتحاد</span>
              </div>
              <span className={`text-[9px] font-bold ${portalMode === 'PRESIDENT' ? 'text-blue-200' : 'text-slate-400'}`}>
                مجلس الإدارة
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPortalMode('ASSISTANT');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 px-1 rounded-xl font-black text-[11px] sm:text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                portalMode === 'ASSISTANT'
                  ? 'bg-indigo-900 text-white shadow-md shadow-indigo-900/30 ring-2 ring-indigo-900/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                <span>المساعد الفني</span>
              </div>
              <span className={`text-[9px] font-bold ${portalMode === 'ASSISTANT' ? 'text-indigo-200' : 'text-slate-400'}`}>
                تحصيل ومصروفات
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPortalMode('RESIDENT');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 px-1 rounded-xl font-black text-[11px] sm:text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                portalMode === 'RESIDENT'
                  ? 'bg-blue-900 text-white shadow-md shadow-blue-900/30 ring-2 ring-blue-900/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>السكان</span>
              </div>
              <span className={`text-[9px] font-bold ${portalMode === 'RESIDENT' ? 'text-blue-200' : 'text-slate-400'}`}>
                كشوف الحساب
              </span>
            </button>
          </div>
        </div>

        {/* Messaging block */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs p-3.5 rounded-2xl mb-5 font-bold text-right">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div>{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs p-3.5 rounded-2xl mb-5 font-bold text-right animate-fade-in">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 1: UNION PRESIDENT PORTAL (دخول وتسجيل رئيس الاتحاد)                   */}
        {/* ========================================================================= */}
        {portalMode === 'PRESIDENT' && (
          <div className="space-y-4">
            {/* Sub-tabs: Login vs Register President */}
            <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 text-xs font-black">
              <button
                type="button"
                onClick={() => {
                  setPresidentTab('login');
                  setError(null);
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  presidentTab === 'login'
                    ? 'bg-white dark:bg-[#111a2e] text-blue-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول رئيس الاتحاد</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPresidentTab('register');
                  setError(null);
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  presidentTab === 'register'
                    ? 'bg-white dark:bg-[#111a2e] text-blue-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>تسجيل / تفعيل رئيس اتحاد</span>
              </button>
            </div>

            {presidentTab === 'login' ? (
              <form onSubmit={handleEmailLogin} className="space-y-3.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">البريد الإلكتروني لرئيس الاتحاد</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@altaqwa.com"
                      className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-medium dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">كلمة المرور الإدارية</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-medium dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-sm font-black transition active:scale-[0.99] shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>دخول لوحة تحكم رئيس الاتحاد</span>
                    </>
                  )}
                </button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                  </div>
                  <span className="relative px-3 bg-white dark:bg-[#111a2e] text-slate-400 text-[11px] font-bold">أو الدخول عبر Google</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-black text-xs text-slate-700 dark:text-slate-200 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 0, 0)">
                      <path fill="#EA4335" d="M20.64 12.2c0-.7-.06-1.36-.18-2H12v3.78h4.84c-.2.11-.2.22-.3.43-.54 1.45-1.8 2.5-3.32 2.5a5.18 5.18 0 0 1-4.85-3.6l-2.63 2.03A10.3 10.3 0 0 0 12 22.36c5.73 0 10.55-1.9 14.07-5.18l-5.43-4.98z" />
                      <path fill="#4285F4" d="M12 22.36c3.24 0 5.95-1.07 7.93-2.91l-5.43-4.98c-1.5.11-3.04-.15-4.21-.86a5.18 5.18 0 0 1-3.3-3.6L4.35 12.04a10.3 10.3 0 0 0 7.65 10.32z" />
                      <path fill="#FBBC05" d="M4.35 12.04c-.25-.75-.4-1.55-.4-2.38s.15-1.63.4-2.38L1.72 5.25A10.3 10.3 0 0 0 0 9.66c0 1.63.3 3.19.85 4.63l3.5-3.25z" />
                      <path fill="#34A853" d="M12 4.14c1.76 0 3.3.61 4.54 1.8l3.4-3.15C17.9 1.07 15.24 0 12 0 7.34 0 3.3 2.7 1.25 6.64l3.5 3.25A5.18 5.18 0 0 1 12 4.14z" />
                    </g>
                  </svg>
                  <span>الدخول بحساب Google المعتمد للإدارة</span>
                </button>
              </form>
            ) : (
              /* Register / Setup President Account */
              <form onSubmit={handleRegisterAdminSubmit} className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-[11px] text-blue-900 dark:text-blue-300 font-bold leading-relaxed">
                  هذا النموذج مخصص حصراً لرئيس مجلس إدارة اتحاد الملاك لمنح وتفعيل الصلاحيات الإدارية الكاملة للنظام.
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">الاسم الكامل لرئيس الاتحاد</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="محمد احمد"
                      className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-medium dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">اسم العمارة / اتحاد الملاك</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <Building className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      required
                      value={buildingNameInput}
                      onChange={(e) => setBuildingNameInput(e.target.value)}
                      placeholder="عمارة التقوى"
                      className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-medium dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">رقم الهاتف / الواتساب</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                      </span>
                      <input
                        type="tel"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        placeholder="010..."
                        className="w-full pl-2 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-left font-medium dark:text-white"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">البريد الإلكتروني المعتمد</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                      </span>
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="president@gmail.com"
                        className="w-full pl-2 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-left font-medium dark:text-white"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">كلمة المرور المطلوبة</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-medium dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-bold text-right">رمز الأمان الإداري الخاص برئيس الاتحاد</label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold">(الرمز المعتمد: {getAdminSecurityCode()})</span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <Key className="h-4 w-4 text-amber-500" />
                    </span>
                    <input
                      type="text"
                      required
                      value={adminSecurityKey}
                      onChange={(e) => setAdminSecurityKey(e.target.value)}
                      placeholder={getAdminSecurityCode()}
                      className="w-full pl-4 pr-10 py-2 text-sm bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl focus:border-amber-500 focus:outline-none text-left font-mono font-bold text-amber-900 dark:text-amber-200"
                      dir="ltr"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-sm font-black transition active:scale-[0.99] shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>تفعيل وتسجيل حساب رئيس الاتحاد فورياً</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: TECHNICAL ASSISTANT PORTAL (دخول المساعد الفني)                   */}
        {/* ========================================================================= */}
        {portalMode === 'ASSISTANT' && (
          <div className="space-y-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs text-indigo-900 dark:text-indigo-300 font-bold leading-relaxed flex items-start gap-2">
              <Wrench className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                قم بإدخال البريد الإلكتروني وكلمة المرور الخاصة بالمساعد الفني المحفوظة في إعدادات النظام للدخول المباشر بالمهام المخصصة (تسجيل التحصيل والمصروفات، الصيانة، دليل الفنيين والأجندة).
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setLoginEmail('assistant@pyramids.com');
                setLoginPassword('assistant123');
                setError(null);
              }}
              className="w-full py-2 px-3 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>تعبئة البيانات الافتراضية للمساعد الفني (assistant@pyramids.com / assistant123)</span>
            </button>

            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">
                  البريد الإلكتروني للمساعد الفني
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="assistant@pyramids.com"
                    className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-indigo-600 focus:outline-none text-right font-medium dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">
                  كلمة المرور الخاصة بالمساعد الفني
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-indigo-600 focus:outline-none text-right font-medium dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-sm font-black transition active:scale-[0.99] shadow-md shadow-indigo-900/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول بصلاحيات المساعد الفني</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: RESIDENTS & TENANTS PORTAL (دخول وتسجيل السكان والمستأجرين)         */}
        {/* ========================================================================= */}
        {portalMode === 'RESIDENT' && (
          <div className="space-y-4">
            {/* Sub-tabs: Login vs Register Resident */}
            <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 text-xs font-black">
              <button
                type="button"
                onClick={() => {
                  setResidentTab('login');
                  setError(null);
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  residentTab === 'login'
                    ? 'bg-white dark:bg-[#111a2e] text-blue-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول الساكن / المستأجر</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setResidentTab('register');
                  setError(null);
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  residentTab === 'register'
                    ? 'bg-white dark:bg-[#111a2e] text-blue-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>طلب انضمام وحدة جديدة</span>
              </button>
            </div>

            {residentTab === 'login' ? (
              <form onSubmit={handleEmailLogin} className="space-y-3.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">البريد الإلكتروني للساكن</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-medium dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">كلمة المرور</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-medium dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-sm font-black transition active:scale-[0.99] shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>تسجيل دخول الساكن</span>
                    </>
                  )}
                </button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                  </div>
                  <span className="relative px-3 bg-white dark:bg-[#111a2e] text-slate-400 text-[11px] font-bold">أو الدخول عبر Google</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-black text-xs text-slate-700 dark:text-slate-200 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 0, 0)">
                      <path fill="#EA4335" d="M20.64 12.2c0-.7-.06-1.36-.18-2H12v3.78h4.84c-.2.11-.2.22-.3.43-.54 1.45-1.8 2.5-3.32 2.5a5.18 5.18 0 0 1-4.85-3.6l-2.63 2.03A10.3 10.3 0 0 0 12 22.36c5.73 0 10.55-1.9 14.07-5.18l-5.43-4.98z" />
                      <path fill="#4285F4" d="M12 22.36c3.24 0 5.95-1.07 7.93-2.91l-5.43-4.98c-1.5.11-3.04-.15-4.21-.86a5.18 5.18 0 0 1-3.3-3.6L4.35 12.04a10.3 10.3 0 0 0 7.65 10.32z" />
                      <path fill="#FBBC05" d="M4.35 12.04c-.25-.75-.4-1.55-.4-2.38s.15-1.63.4-2.38L1.72 5.25A10.3 10.3 0 0 0 0 9.66c0 1.63.3 3.19.85 4.63l3.5-3.25z" />
                      <path fill="#34A853" d="M12 4.14c1.76 0 3.3.61 4.54 1.8l3.4-3.15C17.9 1.07 15.24 0 12 0 7.34 0 3.3 2.7 1.25 6.64l3.5 3.25A5.18 5.18 0 0 1 12 4.14z" />
                    </g>
                  </svg>
                  <span>الدخول بحساب Google المسجل بالاتحاد</span>
                </button>
              </form>
            ) : (
              /* Resident Join Request Form */
              <form onSubmit={handleJoinRequestSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">رقم الشقة / الوحدة</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Building className="h-4 w-4 text-slate-400" />
                      </span>
                      <input
                        type="number"
                        required
                        placeholder="مثال: 101"
                        value={flatNumber}
                        onChange={(e) => setFlatNumber(e.target.value)}
                        className="w-full pl-2 pr-9 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-bold dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">صفة الساكن</label>
                    <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                      <button
                        type="button"
                        onClick={() => setResidentType('OWNER')}
                        className={`py-2 text-xs font-black rounded-xl border-2 transition cursor-pointer ${
                          residentType === 'OWNER'
                            ? 'border-blue-900 bg-blue-50 text-blue-950 dark:bg-blue-900/40 dark:text-white'
                            : 'border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        مالك الوحدة
                      </button>
                      <button
                        type="button"
                        onClick={() => setResidentType('TENANT')}
                        className={`py-2 text-xs font-black rounded-xl border-2 transition cursor-pointer ${
                          residentType === 'TENANT'
                            ? 'border-blue-900 bg-blue-50 text-blue-950 dark:bg-blue-900/40 dark:text-white'
                            : 'border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        مستأجر
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dynamic Inputs based on Owner / Tenant */}
                {residentType === 'OWNER' ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">اسم المالك بالكامل</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-slate-400" />
                        </span>
                        <input
                          type="text"
                          required
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="الاسم كما بالهوية"
                          className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-medium dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">رقم الهاتف المرتبط بالواتساب</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-slate-400" />
                        </span>
                        <input
                          type="tel"
                          required
                          value={ownerPhone}
                          onChange={(e) => setOwnerPhone(e.target.value)}
                          placeholder="مثال: 01012345678"
                          className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-left font-medium dark:text-white"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">اسم المستأجر بالكامل</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-slate-400" />
                        </span>
                        <input
                          type="text"
                          required
                          value={tenantName}
                          onChange={(e) => setTenantName(e.target.value)}
                          placeholder="اسم الساكن المستأجر"
                          className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-medium dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">واتساب المستأجر</label>
                        <input
                          type="tel"
                          required
                          value={tenantPhone}
                          onChange={(e) => setTenantPhone(e.target.value)}
                          placeholder="010..."
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-left font-medium dark:text-white"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">اسم مالك الشقة</label>
                        <input
                          type="text"
                          required
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="اسم المالك"
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-medium dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">البريد الإلكتروني المطلوب للتسجيل</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="email"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-medium dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">كلمة المرور المطلوبة</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="password"
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:border-blue-900 focus:outline-none text-right font-medium dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-sm font-black transition active:scale-[0.99] shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>إرسال طلب الانضمام لاعتماده من رئيس الاتحاد</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Mobile PWA Install Banner */}
        {!pwaInstalled && (deferredPrompt || isIosDevice) && (
          <div className="mt-5 p-3 sm:p-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl flex items-center justify-between border border-blue-700/50 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
                <Smartphone className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-right">
                <h4 className="text-xs font-black">تثبيت التطبيق على هاتفك</h4>
                <p className="text-[10px] text-blue-200 font-medium">أيقونة مخصصة وسرعة تشغيل فورية</p>
              </div>
            </div>
            {deferredPrompt ? (
              <button
                type="button"
                onClick={handlePwaInstall}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-1 shadow-sm transition cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تثبيت</span>
              </button>
            ) : isIosDevice ? (
              <button
                type="button"
                onClick={() => setShowIosPwaGuide(true)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <span>طريقة التثبيت</span>
              </button>
            ) : null}
          </div>
        )}

        {/* iOS PWA Install Guide Modal */}
        {showIosPwaGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4" dir="rtl">
            <div className="bg-slate-800 border border-slate-700 text-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-center text-slate-100">تثبيت التطبيق على الآيفون / الآيباد</h3>
              <div className="space-y-3 text-xs text-slate-300 bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 bg-blue-600 text-white font-bold rounded-full flex items-center justify-center shrink-0 text-[10px]">١</span>
                  <p>اضغط على أيقونة <strong>المشاركة (Share)</strong> في شريط متصفح Safari.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 bg-blue-600 text-white font-bold rounded-full flex items-center justify-center shrink-0 text-[10px]">٢</span>
                  <p>اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosPwaGuide(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-xs cursor-pointer"
              >
                فهمت، إغلاق
              </button>
            </div>
          </div>
        )}

        {/* Footer & Cache helper */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center flex flex-col items-center gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
            مع تحيات مجلس إدارة {buildingNameInput || 'اتحاد الملاك'}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            رئيس الاتحاد: {adminName || 'محمد احمد'}
          </span>

          <button
            type="button"
            onClick={async () => {
              await clearTemporaryCache();
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const r of regs) {
                  await r.unregister();
                }
              }
              window.location.reload();
            }}
            className="mt-1 text-[10px] text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-bold flex items-center gap-1 transition cursor-pointer p-1 rounded-md"
            title="تفريغ الكاش وحل مشاكل العرض والتجميد"
          >
            <Database className="w-3 h-3" />
            <span>مسح البيانات المؤقتة والكاش وإعادة التحميل</span>
          </button>
        </div>
      </div>
    </div>
  );
};
