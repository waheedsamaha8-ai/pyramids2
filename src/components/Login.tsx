import React, { useState } from 'react';
import { googleSignIn, logoutUser } from '../services/firebaseConfig';
import { 
  loginWithEmail, 
  registerAdmin, 
  submitJoinRequest, 
  fetchAllJoinRequests 
} from '../services/authStore';
import { formatMobileNumber, normalizePhoneInput } from '../utils/phoneUtils';
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
  Copy,
  ExternalLink,
  Globe
} from 'lucide-react';

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
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const handleCopyDomain = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 3000);
    }).catch(() => {
      // Fallback
    });
  };

  // Sign In inputs (shared or dedicated)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // President Register inputs
  const [adminName, setAdminName] = useState('');
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
      const data = await registerAdmin({
        name: adminName.trim(),
        phone: formatMobileNumber(adminPhone),
        email: adminEmail.trim(),
        password: adminPassword.trim(),
        securityKey: adminSecurityKey.trim(),
      });

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
        if (email === 'waheedsamaha8@gmail.com') {
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
            setError('طلب الانضمام الخاص بك قيد المراجعة حالياً من قبل رئيس الاتحاد (وحيد سماحة). يرجى المحاولة لاحقاً بمجرد الموافقة.');
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
        const domain = window.location.hostname || 'waheedsamaha8-ai.github.io';
        setUnauthorizedDomain(domain);
        setError(`نطاق الموقع (${domain}) يحتاج إلى إضافة سريعة في قائمة النطاقات المصرح بها في إعدادات Firebase Console.`);
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
        ownerPhone: formatMobileNumber(ownerPhone),
        tenantName: residentType === 'TENANT' ? tenantName.trim() : '',
        tenantPhone: residentType === 'TENANT' ? formatMobileNumber(tenantPhone) : '',
        email: registerEmail.trim(),
        password: registerPassword,
      };

      const result = await submitJoinRequest(payload);

      setSuccessMessage(result.message || 'تم إرسال طلب الانضمام بنجاح! طلبك قيد المراجعة والاعتماد حالياً من قبل رئيس الاتحاد (وحيد سماحة).');
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
          <h1 className="text-xl sm:text-2xl font-black text-blue-950 dark:text-white text-center">اتحاد ملاك بيراميدز فيو ١</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs text-center mt-1 font-bold">النظام الذكي والموحد لإدارة شؤون وماليات وخدمات العمارة</p>
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

        {/* Dedicated Authorized Domain Helper Alert */}
        {unauthorizedDomain && (
          <div className="bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 p-4 rounded-2xl mb-5 space-y-3 text-right shadow-sm animate-fade-in" dir="rtl">
            <div className="flex items-start gap-2.5">
              <Globe className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-black text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                  تفعيل النطاق في إعدادات Google Firebase المصرح بها (Authorized Domains)
                </h4>
                <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300 font-bold leading-relaxed">
                  لحماية بيانات الموقع، تشترط Google إضافة نطاق موقعك الحالي (<span className="underline font-black text-amber-950 dark:text-white font-mono dir-ltr inline-block">{unauthorizedDomain}</span>) إلى قائمة النطاقات المسموح لها لمرة واحدة فقط ليعمل تسجيل الدخول بـ Google.
                </p>
              </div>
            </div>

            {/* Quick action bar */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">النطاق المطلوب:</span>
                <span className="font-mono text-xs font-black text-blue-900 dark:text-blue-300 truncate dir-ltr">
                  {unauthorizedDomain}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyDomain(unauthorizedDomain)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedDomain ? 'تم النسخ بنجاح ✓' : 'نسخ النطاق'}</span>
                </button>
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0491644540/authentication/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح إعدادات Firebase</span>
                </a>
              </div>
            </div>

            {/* Simple steps */}
            <div className="text-[11px] font-bold text-amber-900/90 dark:text-amber-200/90 space-y-1 bg-amber-100/60 dark:bg-amber-900/30 p-2.5 rounded-xl">
              <div className="font-black text-amber-950 dark:text-amber-100">الخطوات السريعة (تستغرق 20 ثانية):</div>
              <ol className="list-decimal list-inside space-y-0.5 pr-1">
                <li>اضغط على زر <strong>فتح إعدادات Firebase</strong> أعلاه للمشروع (<strong>gen-lang-client-0491644540</strong>).</li>
                <li>انزل إلى قسم <strong>النطاقات المصرح بها (Authorized domains)</strong> واضغط <strong>إضافة نطاق (Add domain)</strong>.</li>
                <li>الصق النطاق المنسوخ (<strong className="font-mono dir-ltr inline-block">{unauthorizedDomain}</strong>) ثم اضغط <strong>حفظ (Save)</strong>، ثم أعد المحاولة.</li>
              </ol>
            </div>

            {/* Instant Alternative: email/password */}
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">أو يمكنك الدخول فوراً بكلمة المرور الإدارية دون انتظار:</span>
              <button
                type="button"
                onClick={() => {
                  setUnauthorizedDomain(null);
                  setError(null);
                }}
                className="text-xs font-black text-blue-800 dark:text-blue-300 hover:underline cursor-pointer"
              >
                الدخول بكلمة المرور أدناه ↓
              </button>
            </div>
          </div>
        )}

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
        {/* MODE 1: UNION PRESIDENT PORTAL (دخول رئيس الاتحاد)                         */}
        {/* ========================================================================= */}
        {portalMode === 'PRESIDENT' && (
          <div className="space-y-4">
            {/* Official Google Workspace Login - Primary & Sole Option */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-2xl space-y-3">
              <div className="text-right">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-200 text-[10px] font-black rounded-full">
                    الربط السحابي المباشر
                  </span>
                  <span className="text-xs font-black text-blue-950 dark:text-blue-200">
                    بوابة رئيس الاتحاد
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-2 leading-relaxed">
                  سجل الدخول بحساب Google المعتمد للإدارة (<strong className="text-blue-900 dark:text-blue-300 font-black">waheedsamaha8@gmail.com</strong>) للمزامنة الحية مع Google Drive وجداول Google Sheets وحفظ البيانات والصور.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-black transition active:scale-[0.99] shadow-md shadow-blue-900/20 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 0, 0)">
                    <path fill="#EA4335" d="M20.64 12.2c0-.7-.06-1.36-.18-2H12v3.78h4.84c-.2.11-.2.22-.3.43-.54 1.45-1.8 2.5-3.32 2.5a5.18 5.18 0 0 1-4.85-3.6l-2.63 2.03A10.3 10.3 0 0 0 12 22.36c5.73 0 10.55-1.9 14.07-5.18l-5.43-4.98z" />
                    <path fill="#4285F4" d="M12 22.36c3.24 0 5.95-1.07 7.93-2.91l-5.43-4.98c-1.5.11-3.04-.15-4.21-.86a5.18 5.18 0 0 1-3.3-3.6L4.35 12.04a10.3 10.3 0 0 0 7.65 10.32z" />
                    <path fill="#FBBC05" d="M4.35 12.04c-.25-.75-.4-1.55-.4-2.38s.15-1.63.4-2.38L1.72 5.25A10.3 10.3 0 0 0 0 9.66c0 1.63.3 3.19.85 4.63l3.5-3.25z" />
                    <path fill="#34A853" d="M12 4.14c1.76 0 3.3.61 4.54 1.8l3.4-3.15C17.9 1.07 15.24 0 12 0 7.34 0 3.3 2.7 1.25 6.64l3.5 3.25A5.18 5.18 0 0 1 12 4.14z" />
                  </g>
                </svg>
                <span>الدخول وتفعيل مزامنة Google Drive & Sheets</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: TECHNICAL ASSISTANT PORTAL (دخول المساعد الفني)                   */}
        {/* ========================================================================= */}
        {portalMode === 'ASSISTANT' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs text-indigo-900 dark:text-indigo-300 font-bold leading-relaxed flex items-start gap-2">
              <Wrench className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                أدخل البريد الإلكتروني وكلمة المرور المحددة للمساعد الفني في إعدادات النظام للدخول المباشر بالصلاحيات المخصصة.
              </div>
            </div>

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
        {/* MODE 3: RESIDENTS & TENANTS PORTAL (دخول السكان والمستأجرين)                */}
        {/* ========================================================================= */}
        {portalMode === 'RESIDENT' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs text-blue-950 dark:text-blue-300 font-bold leading-relaxed flex items-start gap-2">
              <Mail className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                أدخل البريد الإلكتروني وكلمة المرور المخصصة لسيادتكم في دعوة الانضمام المرسلة عبر الواتساب من قبل رئيس الاتحاد والدخول المباشر.
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1 text-right">البريد الإلكتروني للساكن / المستأجر</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com أو flat101@pyramids.com"
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
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center flex flex-col items-center gap-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
            مع تحيات مجلس إدارة اتحاد ملاك بيراميدز فيو ١
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            رئيس الاتحاد: وحيد سماحة
          </span>
        </div>
      </div>
    </div>
  );
};
