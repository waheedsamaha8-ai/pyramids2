import React, { useState, useMemo, useRef } from 'react';
import { Resident, Payment, FloorConfig, AppConfig } from '../types';
import { 
  Building2, 
  Check, 
  AlertCircle, 
  Calendar, 
  X, 
  Phone, 
  User, 
  Home, 
  CreditCard, 
  History, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Copy, 
  Printer, 
  Sparkles,
  AlertTriangle,
  Receipt,
  Image as ImageIcon,
  Loader2,
  Share2,
  CheckCircle2,
  Download
} from 'lucide-react';
import { deriveFloorConfigsFromResidents, getUnitNumbersForFloor, compareFlatNumbers, isSameFlatNumber } from '../utils/buildingStructure';
import { calculateResidentFinancials, getCarriedPreviousBalance } from '../utils/financialCalculations';
import { formatMobileNumber, toWhatsAppNumber } from '../utils/phoneUtils';
import { shareImageViaWhatsApp } from '../utils/shareImageViaWhatsApp';
import { generateElementImageBlob } from '../utils/imageExport';

interface BuildingMapProps {
  residents: Resident[];
  payments: Payment[];
  floorConfigs: FloorConfig[];
  currentYear: number;
  config?: AppConfig;
}

export const BuildingMap: React.FC<BuildingMapProps> = ({
  residents,
  payments,
  floorConfigs,
  currentYear,
  config,
}) => {
  const currentMonthNum = new Date().getMonth() + 1;
  const initialMonth = currentMonthNum < 10 ? `0${currentMonthNum}` : `${currentMonthNum}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [activeUnit, setActiveUnit] = useState<{ unitNum: number | string; floor: FloorConfig; resident?: Resident } | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [sharedReceiptModal, setSharedReceiptModal] = useState<{
    imageBlob: Blob;
    imageDataUrl: string;
    fileName: string;
    title: string;
    recipientName: string;
    recipientPhone: string;
    msgText: string;
    isPaid: boolean;
  } | null>(null);
  const [modalCopiedImage, setModalCopiedImage] = useState(false);

  const receiptCardRef = useRef<HTMLDivElement>(null);
  
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const monthNamesArabic = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const accountingStartDate = config?.accountingStartDate || '2026-01-01';
  const defaultMonthlyFee = config?.defaultMonthlyFee || 400;
  const activityDefaultFees = config?.activityDefaultFees;

  // Derive floor configs automatically from existing residents if no custom layout is saved
  const effectiveFloorConfigs = useMemo(() => {
    if (floorConfigs && floorConfigs.length > 0) {
      return floorConfigs;
    }
    if (floorConfigs && floorConfigs.length === 0) {
      return [];
    }
    return deriveFloorConfigsFromResidents(residents);
  }, [floorConfigs, residents]);

  const getPaymentStatus = (flatNumber: number | string) => {
    const resident = residents.find(r => isSameFlatNumber(r.flatNumber, flatNumber));
    if (!resident) return 'empty';

    const payment = payments.find(p => 
      p.residentId === resident.id && 
      p.year === currentYear && 
      p.month === selectedMonth &&
      p.paymentType === 'اشتراك شهري'
    );

    if (payment && (payment.amount > 0 || payment.isManuallyPaid)) return 'paid';
    return 'unpaid';
  };

  const getUnitFinancials = (flatNumber: number | string) => {
    const resident = residents.find(r => isSameFlatNumber(r.flatNumber, flatNumber));
    if (!resident) return null;

    const unitPayments = payments.filter(p => p.residentId === resident.id && p.year === currentYear);
    const totalPaid = unitPayments.reduce((sum, p) => sum + p.amount, 0);
    const currentMonthPayment = unitPayments.find(p => p.month === selectedMonth && p.paymentType === 'اشتراك شهري');
    
    // Overall financial calculations
    const residentFin = calculateResidentFinancials(
      resident,
      payments,
      accountingStartDate,
      defaultMonthlyFee,
      activityDefaultFees,
      currentYear
    );

    const carriedBal = getCarriedPreviousBalance(
      resident,
      currentYear,
      payments,
      accountingStartDate,
      defaultMonthlyFee,
      activityDefaultFees
    );

    const monthlyFee = residentFin.monthlyFee;
    const isPaid = Boolean(currentMonthPayment && (currentMonthPayment.amount > 0 || currentMonthPayment.isManuallyPaid));

    // Calculate old debt (carried balance or prior unpaid dues)
    let oldDebtVal = 0;
    if (carriedBal < 0) {
      oldDebtVal = Math.abs(carriedBal);
    } else if (residentFin.netBalance < 0) {
      if (isPaid) {
        oldDebtVal = Math.abs(residentFin.netBalance);
      } else {
        oldDebtVal = Math.max(0, Math.abs(residentFin.netBalance) - monthlyFee);
      }
    }

    return {
      resident,
      totalPaid,
      monthlyFee,
      currentMonthStatus: isPaid ? 'مسدد' : 'غير مسدد',
      currentMonthPayment,
      carriedBalance: carriedBal,
      netBalance: residentFin.netBalance,
      oldDebtVal: Math.round(oldDebtVal),
      allPayments: unitPayments.sort((a, b) => b.month.localeCompare(a.month))
    };
  };

  const financials = activeUnit ? getUnitFinancials(activeUnit.unitNum) : null;
  const monthName = monthNamesArabic[parseInt(selectedMonth) - 1] || 'الشهر المحدد';

  // Compute building-wide statistics for selected month
  const stats = useMemo(() => {
    let paidCount = 0;
    let unpaidCount = 0;
    let finishingUnpaidCount = 0;
    let rawNoFeeCount = 0;
    let emptyCount = 0;

    effectiveFloorConfigs.forEach(floor => {
      const units = getUnitNumbersForFloor(floor, residents);
      units.forEach(u => {
        const st = getPaymentStatus(u);
        const res = residents.find(r => isSameFlatNumber(r.flatNumber, u));
        if (!res || st === 'empty') {
          emptyCount++;
        } else {
          const isRaw = Boolean(res.activityType === 'بدون تشطيب' || res.activityType.includes('بدون تشطيب'));
          if (isRaw) {
            rawNoFeeCount++;
          } else if (st === 'paid') {
            paidCount++;
          } else {
            const isFinishing = Boolean(res.activityType === 'تحت التشطيب' || res.activityType.includes('تشطيب'));
            if (isFinishing) {
              finishingUnpaidCount++;
            } else {
              unpaidCount++;
            }
          }
        }
      });
    });

    return { paidCount, unpaidCount, finishingUnpaidCount, rawNoFeeCount, emptyCount };
  }, [effectiveFloorConfigs, residents, payments, currentYear, selectedMonth]);

  // WhatsApp Electronic Receipt Generator & Direct Trigger
  const sendWhatsAppReceipt = (target: 'owner' | 'tenant' | 'both') => {
    if (!financials) return;
    const { resident, monthlyFee, currentMonthStatus, oldDebtVal, currentMonthPayment } = financials;
    const isPaid = currentMonthStatus === 'مسدد';
    const paidAmt = currentMonthPayment?.amount || monthlyFee;
    const receiptNum = `REC-${resident.flatNumber}-${selectedMonth}${currentYear}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const generateText = (recipientName: string, recipientRole: string) => {
      if (isPaid) {
        let msg = `💐 *اتحاد ملاك عمارة بيراميدز فيو ١*\n`;
        msg += `-----------------------------------\n`;
        msg += `🧾 *إيصال سداد إلكتروني معتمد*\n`;
        msg += `🔢 *رقم الإيصال:* ${receiptNum}\n`;
        msg += `🗓 *التاريخ:* ${todayStr}\n\n`;
        msg += `👤 *الساكن/المالك (${recipientRole}):* ${recipientName}\n`;
        msg += `🚪 *الوحدة:* شقة ${resident.flatNumber} (${resident.activityType})\n`;
        msg += `📋 *البيان:* سداد اشتراك شهر ${monthName} ${currentYear}\n`;
        msg += `✅ *المبلغ المسدد:* *${paidAmt.toLocaleString()} ج.م* (تم الاستلام بنجاح ✓)\n\n`;

        if (oldDebtVal > 0) {
          msg += `📌 *تنبيه وتنويه:* يرجى العلم أنه ما زالت توجد مديونية قديمة متبقية قدرها: *${oldDebtVal.toLocaleString()} ج.م*.\n`;
        } else {
          msg += `✨ *حالة الحساب:* تم سداد اشتراك الشهر بالكامل، والحساب خالي تماماً من أي مديونيات متأخرة 👍\n`;
        }
        msg += `-----------------------------------\n`;
        msg += `شاكرين لكم حسن تعاونكم وحرصكم الدائم على خدمات وصيانة العمارة.\n`;
        msg += `إدارة اتحاد ملاك بيراميدز فيو ١`;
        return msg;
      } else {
        let msg = `🏢 *اتحاد ملاك عمارة بيراميدز فيو ١*\n`;
        msg += `-----------------------------------\n`;
        msg += `📄 *إشعار مطالبة إلكتروني*\n`;
        msg += `🗓 *عن شهر:* ${monthName} ${currentYear}\n\n`;
        msg += `👤 *المطلوب منه (${recipientRole}):* ${recipientName}\n`;
        msg += `🚪 *الوحدة:* شقة ${resident.flatNumber} (${resident.activityType})\n`;
        msg += `💵 *اشتراك الشهر الحالي:* ${monthlyFee.toLocaleString()} ج.م\n`;
        msg += `📌 *حالة السداد:* غير مسدد حتى الآن ⏳\n\n`;

        if (oldDebtVal > 0) {
          msg += `⚠️ *تنبيه هام:* توجد أيضاً مديونية قديمة مرحلة قدرها: *${oldDebtVal.toLocaleString()} ج.م*\n\n`;
          msg += `💰 *إجمالي المطالبة المستحقة:* *( ${(monthlyFee + oldDebtVal).toLocaleString()} ج.م )*\n`;
        } else {
          msg += `💰 *المبلغ المستحق للسداد:* *( ${monthlyFee.toLocaleString()} ج.م )*\n`;
        }
        msg += `-----------------------------------\n`;
        msg += `يرجى التكرم بالمبادرة بسداد المستحقات لدعم أداء ورعاية العمارة.\n`;
        msg += `مع جزيل الشكر والتقدير.\n`;
        msg += `إدارة اتحاد ملاك بيراميدز فيو ١`;
        return msg;
      }
    };

    const openWA = (phone: string, text: string) => {
      const fullPhone = toWhatsAppNumber(phone);
      if (!fullPhone) {
        alert('رقم الهاتف غير مسجل أو غير صالح للواتساب');
        return;
      }
      const url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(text)}`;
      try {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    };

    if (target === 'owner' || target === 'both') {
      const text = generateText(resident.name, 'المالك');
      const phone = resident.phone || resident.tenantPhone;
      if (phone) openWA(phone, text);
      else alert('رقم هاتف المالك غير مسجل');
    }

    if (target === 'tenant' || target === 'both') {
      const text = generateText(resident.tenantName || 'السيد المستأجر', 'المستأجر');
      const phone = resident.tenantPhone || resident.phone;
      if (target === 'both') {
        setTimeout(() => {
          if (phone) openWA(phone, text);
        }, 800);
      } else {
        if (phone) openWA(phone, text);
        else alert('رقم هاتف المستأجر غير مسجل');
      }
    }
  };

  // Optional canvas fallback
  const generateNativeReceiptCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    if (!financials) return canvas;

    const isPaid = financials.currentMonthStatus === 'مسدد';
    const paidAmt = financials.currentMonthPayment?.amount || financials.monthlyFee;
    const oldDebtVal = financials.oldDebtVal;
    const totalAmt = isPaid ? paidAmt : (financials.monthlyFee + oldDebtVal);
    const receiptNum = isPaid 
      ? `REC-${financials.resident.flatNumber}-${selectedMonth}${currentYear}`
      : `CLM-${financials.resident.flatNumber}-${selectedMonth}${currentYear}`;
    const todayStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    const dpr = 2; // High resolution 2x
    const width = 600;
    const height = oldDebtVal > 0 ? 730 : 660;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.scale(dpr, dpr);

    // Canvas Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Outer Container Double Border
    ctx.lineWidth = 2;
    ctx.strokeStyle = isPaid ? '#047857' : '#1e3a8a';
    ctx.strokeRect(12, 12, width - 24, height - 24);

    ctx.lineWidth = 1;
    ctx.strokeStyle = isPaid ? '#a7f3d0' : '#bfdbfe';
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // Header Banner
    ctx.fillStyle = isPaid ? '#047857' : '#1e3a8a';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(24, 24, width - 48, 80, 12);
    else ctx.rect(24, 24, width - 48, 80);
    ctx.fill();

    // Header Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';

    const titleText = isPaid ? '💐 إيصال سداد واستلام مالي معتمد' : '🏛️ إشعار مطالبة وبيان مستحقات شهرية';
    ctx.fillText(titleText, width - 44, 56);

    ctx.font = 'bold 12.5px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = isPaid ? '#a7f3d0' : '#bfdbfe';
    ctx.fillText('اتحاد ملاك عمارة بيراميدز فيو ١', width - 44, 82);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10.5px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`التاريخ: ${todayStr}`, 44, 56);
    ctx.fillText(`المرجع: ${receiptNum}`, 44, 80);

    // Status Badge Pill
    let y = 118;
    ctx.fillStyle = isPaid ? '#ecfdf5' : '#fffbe2';
    ctx.strokeStyle = isPaid ? '#10b981' : '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(24, y, width - 48, 38, 8);
    else ctx.rect(24, y, width - 48, 38);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isPaid ? '#047857' : '#b45309';
    ctx.font = 'bold 12.5px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const badgeText = isPaid
      ? '✓ تم استلام مبلغ الاشتراك بنجاح وتوثيقه في السجل المالي'
      : '⏳ نأمل المبادرة بالسداد لضمان استمرار خدمات العمارة والمصاعد';
    ctx.fillText(badgeText, width / 2, y + 24);

    // Data Fields Table
    y += 50;
    const drawRow = (label: string, value: string, isHighlight = false) => {
      ctx.fillStyle = isHighlight ? '#eff6ff' : '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(24, y, width - 48, 44, 8);
      else ctx.rect(24, y, width - 48, 44);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(label, width - 40, y + 27);

      ctx.fillStyle = isHighlight ? '#1e3a8a' : '#0f172a';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(value, 40, y + 27);

      y += 50;
    };

    drawRow('اسم الشاغل / الساكن:', financials.resident.name);
    drawRow('رقم الوحدة ونشاطها:', `شقة ${financials.resident.flatNumber} (${financials.resident.activityType})`);
    drawRow('عن شهر الاشتراكات:', `اشتراك ${monthName} ${currentYear} (${financials.monthlyFee} ج.م)`);

    // Old Debt / Balance Notice
    if (oldDebtVal > 0) {
      ctx.fillStyle = '#fef2f2';
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(24, y, width - 48, 68, 10);
      else ctx.rect(24, y, width - 48, 68);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('⚠️ تنبيه هام بوجود مديونية قديمة مرحلة:', width - 40, y + 26);

      ctx.fillStyle = '#7f1d1d';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`• توجد مديونية سابقة مرحلة بمبلغ: ${oldDebtVal.toLocaleString()} ج.م`, width - 40, y + 50);

      y += 76;
    } else {
      ctx.fillStyle = '#f0fdf4';
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(24, y, width - 48, 42, 8);
      else ctx.rect(24, y, width - 48, 42);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#166534';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('✨ تنويه: الحساب خالٍ تماماً من أي مديونيات سابقة أو متأخرات.', width - 40, y + 26);

      y += 50;
    }

    // Encouraging / Thanking Message Box
    ctx.fillStyle = isPaid ? '#f0fdf4' : '#eff6ff';
    ctx.strokeStyle = isPaid ? '#a7f3d0' : '#bfdbfe';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(24, y, width - 48, 60, 10);
    else ctx.rect(24, y, width - 48, 60);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11.5px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    if (isPaid) {
      ctx.fillStyle = '#166534';
      ctx.fillText('🌺 نشكركم جزيل الشكر والتقدير على حرصكم الدائم وسدادكم المنتظم،', width / 2, y + 25);
      ctx.fillText('مما يساهم مباشرةً في الحفاظ على العمارة وتطوير صيانتها وخدماتها لراحة الجميع.', width / 2, y + 44);
    } else {
      ctx.fillStyle = '#1e40af';
      ctx.fillText('🤝 نأمل من سيادتكم التكرم بالمبادرة بسداد المستحقات في أقرب وقت لضمان استمرار', width / 2, y + 25);
      ctx.fillText('خدمات النظافة، الحراسة، الصيانة، وتشغيل المصاعد بكفاءة عالية بعمارتنا الجميلة.', width / 2, y + 44);
    }
    y += 70;

    // Total Amount Highlight Box
    ctx.fillStyle = isPaid ? '#ecfdf5' : '#fff1f2';
    ctx.strokeStyle = isPaid ? '#10b981' : '#f43f5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(24, y, width - 48, 56, 12);
    else ctx.rect(24, y, width - 48, 56);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    const totalLabel = isPaid ? 'إجمالي المبلغ المسدد معتمداً:' : 'إجمالي المبلغ المستحق للسداد:';
    ctx.fillText(totalLabel, width - 40, y + 34);

    ctx.fillStyle = isPaid ? '#047857' : '#be123c';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${totalAmt.toLocaleString()} ج.م`, 40, y + 34);

    // Footer
    y += 75;
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('تم إصدار هذا التقرير إلكترونياً بواسطة نظام إدارة اتحاد ملاك عمارة بيراميدز فيو ١', width / 2, y);

    return canvas;
  };

  // High-Resolution Image Generator & Direct WhatsApp Sharing for Receipts & Claim Notices
  const handleCaptureAndShareImage = async (target: 'owner' | 'tenant' = 'owner') => {
    if (!financials) return;
    setIsGeneratingImage(true);

    try {
      const flatNum = financials.resident.flatNumber;
      const isPaid = financials.currentMonthStatus === 'مسدد';
      const fileName = isPaid 
        ? `إيصال_سداد_شقة_${flatNum}_شهر_${selectedMonth}_${currentYear}.png`
        : `إشعار_مطالبة_شقة_${flatNum}_شهر_${selectedMonth}_${currentYear}.png`;

      let targetPhone = target === 'owner' 
        ? (financials.resident.phone || financials.resident.tenantPhone)
        : (financials.resident.tenantPhone || financials.resident.phone);
      
      const targetName = target === 'owner'
        ? financials.resident.name
        : (financials.resident.tenantName || 'المستأجر');

      if (!targetPhone || !targetPhone.trim()) {
        const userEntered = window.prompt(
          `رقم هاتف الوحدة (${targetName}) غير مسجل بالنظام.\nيرجى إدخال رقم الواتساب لإرسال الصورة إليه مباشرة (مثال: 01007911777):`
        );
        if (userEntered && userEntered.trim()) {
          targetPhone = userEntered.trim();
        } else {
          alert('يرجى إدخال رقم هاتف صالح للوحدة لتتمكن من مشاركة الصورة عبر الواتساب مباشرة.');
          setIsGeneratingImage(false);
          return;
        }
      }

      const receiptNum = isPaid
        ? (financials.currentMonthPayment?.receiptNumber ? `#${financials.currentMonthPayment.receiptNumber}` : `REC-${financials.resident.flatNumber}-${selectedMonth}${currentYear}`)
        : `CLM-${financials.resident.flatNumber}-${selectedMonth}${currentYear}`;

      const paidAmt = financials.currentMonthPayment?.amount || financials.monthlyFee;
      const totalDue = financials.monthlyFee + financials.oldDebtVal;

      let msgText = isPaid
        ? `🧾 *اتحاد ملاك عمارة بيراميدز فيو ١*\n💐 *إيصال سداد إلكتروني معتمد*\nالوحدة: شقة ${financials.resident.flatNumber} (${financials.resident.activityType})\nالشاغل: ${targetName}\nالمبلغ المسدد: ${paidAmt.toLocaleString()} ج.م ✓\nعن شهر: ${monthName} ${currentYear}\nرقم الإيصال: ${receiptNum}\nشاكرين لكم حسن تعاونكم.`
        : `🏢 *اتحاد ملاك عمارة بيراميدز فيو ١*\n🏛️ *إشعار مطالبة إلكتروني*\nالوحدة: شقة ${financials.resident.flatNumber} (${financials.resident.activityType})\nالمطلوب منه: ${targetName}\nاشتراك شهر: ${monthName} ${currentYear} (${financials.monthlyFee.toLocaleString()} ج.م)\n` +
          (financials.oldDebtVal > 0 ? `مديونية سابقة: ${financials.oldDebtVal.toLocaleString()} ج.م\n💰 إجمالي المستحق: ${totalDue.toLocaleString()} ج.م\n` : `💰 المبلغ المستحق: ${financials.monthlyFee.toLocaleString()} ج.م\n`) +
          `يرجى التكرم بالمبادرة بالسداد مع جزيل الشكر.`;

      // Generate pristine, beautifully formatted image from dedicated receipt printable element
      const { blob, dataUrl } = await generateElementImageBlob('building-map-receipt-printable', fileName, 680);

      await shareImageViaWhatsApp({
        imageBlob: blob,
        fileName,
        phone: targetPhone,
        recipientName: targetName,
        title: isPaid ? `إيصال سداد شقة ${flatNum}` : `إشعار مطالبة شقة ${flatNum}`,
        text: msgText,
        onSuccessToast: (msg) => {
          setToastMsg(msg);
          setTimeout(() => setToastMsg(null), 8000);
        },
        onErrorToast: (err) => {
          alert(err);
        }
      });

      setSharedReceiptModal({
        imageBlob: blob,
        imageDataUrl: dataUrl,
        fileName,
        title: isPaid ? `إيصال سداد شقة ${flatNum}` : `إشعار مطالبة شقة ${flatNum}`,
        recipientName: targetName,
        recipientPhone: targetPhone,
        msgText,
        isPaid,
      });
    } catch (err) {
      console.error('Error generating and sharing receipt image:', err);
      alert('حدث خطأ أثناء توليد صورة الإيصال، يُرجى المحاولة مرة أخرى.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const copyReceiptText = () => {
    if (!financials) return;
    const { resident, monthlyFee, currentMonthStatus, oldDebtVal, currentMonthPayment } = financials;
    const isPaid = currentMonthStatus === 'مسدد';
    const paidAmt = currentMonthPayment?.amount || monthlyFee;
    const receiptNum = `REC-${resident.flatNumber}-${selectedMonth}${currentYear}`;

    let text = `اتحاد ملاك عمارة بيراميدز فيو ١\n`;
    text += isPaid ? `إيصال سداد إلكتروني معتمد (رقم ${receiptNum})\n` : `إشعار مطالبة إلكتروني عن شهر ${monthName} ${currentYear}\n`;
    text += `الوحدة: شقة ${resident.flatNumber} - ${resident.name}\n`;
    text += `قيمة الاشتراك: ${monthlyFee} ج.م - الحالة: ${currentMonthStatus}\n`;
    if (oldDebtVal > 0) {
      text += `تنبيه: توجد مديونية قديمة مرحلة بمبلغ: ${oldDebtVal.toLocaleString()} ج.م\n`;
    }
    text += isPaid ? `المبلغ المسدد: ${paidAmt} ج.م` : `إجمالي المستحق: ${(monthlyFee + oldDebtVal).toLocaleString()} ج.م`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2500);
    });
  };

  if (effectiveFloorConfigs.length === 0) {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xs text-right space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-800">خريطة سداد العمارة التفاعلية</h3>
            <p className="text-[10px] text-slate-400 font-bold">لا يوجد هيكل أو شقق مسجلة للعمارة حالياً</p>
          </div>
        </div>
        <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 text-center py-6">
          <p className="text-xs text-slate-500 font-bold">
            خريطة سداد العمارة فارغة لعدم تسجيل شقق أو هيكل للأدوار بعد. يتم بناء وتفعيل الخريطة تلقائياً فور ضبط هيكل العمارة أو إضافة بيانات شقق وسكان العمارة.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-right">
      {/* Month & Legend Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 text-blue-900 rounded-xl flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">خريطة سداد العمارة التفاعلية</h3>
              <p className="text-[10px] text-slate-400 font-bold">حالة سداد اشتراكات شواغل الوحدات</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-500">شهر:</span>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-black text-blue-950 outline-none cursor-pointer"
            >
              {months.map((m, idx) => (
                <option key={m} value={m}>{monthNamesArabic[idx]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-[10px] font-black bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 w-full md:w-auto justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-emerald-600 rounded-md shadow-2xs border border-emerald-700"></div>
            <span className="text-slate-800 font-bold">تم السداد ({stats.paidCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-rose-600 rounded-md shadow-2xs border border-rose-700"></div>
            <span className="text-slate-800 font-bold">متأخر ({stats.unpaidCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-amber-500 rounded-md shadow-2xs border border-amber-600"></div>
            <span className="text-slate-800 font-bold">تحت التشطيب غير مسدد ({stats.finishingUnpaidCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-slate-700 rounded-md shadow-2xs border border-slate-800"></div>
            <span className="text-slate-800 font-bold">بدون تشطيب (بدون تحصيل) ({stats.rawNoFeeCount})</span>
          </div>
        </div>
      </div>

      {/* Building Grid - Lighter Canvas Background */}
      <div className="flex flex-col gap-2.5 p-3.5 sm:p-5 bg-slate-200/80 rounded-3xl border-2 sm:border-4 border-slate-300 shadow-md overflow-hidden">
        {[...effectiveFloorConfigs].reverse().map((floor) => {
          const units = getUnitNumbersForFloor(floor, residents);

          return (
            <div key={floor.id} className="flex items-center gap-1.5 sm:gap-3 py-2 border-b border-slate-300/80 last:border-0">
              <div className="w-14 sm:w-22 flex-shrink-0 text-center px-1 py-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center min-h-[42px] shadow-2xs">
                <span className="text-[8.5px] sm:text-xs font-black text-white">{floor.floorLabel}</span>
                <span className="text-[7px] sm:text-[7.5px] font-bold text-slate-300 mt-0.5">{floor.activityType}</span>
              </div>
              
              <div className="grid grid-cols-6 gap-1 sm:gap-1.5 flex-1">
                {units.map(unitNum => {
                  const status = getPaymentStatus(unitNum);
                  const resident = residents.find(r => isSameFlatNumber(r.flatNumber, unitNum));
                  const isRaw = Boolean(resident && (resident.activityType === 'بدون تشطيب' || resident.activityType.includes('بدون تشطيب')));
                  const isFinishing = Boolean(resident && !isRaw && (resident.activityType === 'تحت التشطيب' || resident.activityType.includes('تشطيب')));
                  const isPaid = status === 'paid';
                  const isUnpaid = status === 'unpaid';

                  let btnBgClass = 'bg-slate-900 border-slate-950 text-white hover:bg-slate-950'; // vacant / unregistered
                  if (resident) {
                    if (isRaw) {
                      // بدون تشطيب -> رمادي و بدون تحصيل
                      btnBgClass = 'bg-slate-700 border-slate-800 text-slate-200 hover:bg-slate-800';
                    } else if (isPaid) {
                      // مسدد -> أخضر
                      btnBgClass = 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700';
                    } else if (isFinishing) {
                      // تحت التشطيب غير مسدد -> برتقالي
                      btnBgClass = 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600';
                    } else {
                      // أنشطة سكنية/تجارية غير مسددة -> أحمر
                      btnBgClass = 'bg-rose-600 border-rose-700 text-white hover:bg-rose-700';
                    }
                  }

                  const displayActivity = resident ? (resident.activityType || 'سكني') : 'شاغرة';
                  const unitStr = String(unitNum);
                  const isLongUnit = unitStr.length > 3;

                  return (
                    <button 
                      key={unitNum}
                      onClick={() => setActiveUnit({ unitNum, floor, resident })}
                      className={`
                        h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all relative group p-0.5
                        ${btnBgClass}
                        border-2 cursor-pointer active:scale-95 shadow-2xs
                      `}
                    >
                      <div className="flex items-center gap-0.5 max-w-full overflow-hidden px-0.5">
                        <span 
                          className={`${isLongUnit ? 'text-[7.5px] sm:text-[9.5px]' : 'text-[9.5px] sm:text-xs'} font-black text-white whitespace-nowrap tracking-tighter`}
                          dir="ltr"
                        >
                          {unitStr}
                        </span>
                        {isPaid && !isRaw && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white stroke-[3] shrink-0" />}
                        {!isPaid && !isFinishing && !isRaw && isUnpaid && <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white animate-pulse stroke-[3] shrink-0" />}
                        {!isPaid && isFinishing && isUnpaid && <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white stroke-[2.5] shrink-0" />}
                      </div>
                      <span className="text-[7.5px] sm:text-[8px] font-black text-white truncate max-w-full px-0.5 leading-none">
                        {displayActivity}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unit Detail & Electronic Receipt Modal */}
      {activeUnit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl animate-scale-up text-right overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-slate-50 px-5 py-3.5 flex items-center justify-between border-b border-slate-100 shrink-0">
              <button onClick={() => setActiveUnit(null)} className="p-1.5 hover:bg-slate-200 rounded-xl transition cursor-pointer">
                <X className="w-4 h-4 text-slate-500" />
              </button>
              <div className="flex items-center gap-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">بيانات وإيصال الوحدة {activeUnit.unitNum}</h3>
                  <p className="text-[9px] text-slate-500 font-bold">{activeUnit.floor.floorLabel} - {activeUnit.floor.activityType}</p>
                </div>
                <div className="w-8 h-8 bg-blue-900 text-white rounded-xl flex items-center justify-center shadow-md">
                  <Home className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              {financials ? (
                <>
                  {/* WhatsApp Direct Share Toast Feedback */}
                  {toastMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-start gap-2 animate-fade-in shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1 leading-relaxed">{toastMsg}</div>
                      <button 
                        type="button"
                        onClick={() => setToastMsg(null)} 
                        className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Resident Info Card */}
                  <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-900">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-500 font-bold">اسم الساكن / الشاغل</div>
                          <div className="text-xs font-black text-slate-900">{financials.resident.name}</div>
                        </div>
                      </div>
                      <span className="text-[9.5px] font-black px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200">
                        {financials.resident.activityType} - {financials.resident.ownershipType}
                      </span>
                    </div>
                    
                    {(financials.resident.phone || financials.resident.tenantPhone) && (
                      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-blue-100/60 text-xs">
                        {financials.resident.phone && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-blue-900" />
                              <span className="text-[10px] text-slate-500 font-bold">هاتف المالك:</span>
                              <span className="font-black text-slate-800 tracking-wider font-mono inline-block" dir="ltr">{formatMobileNumber(financials.resident.phone)}</span>
                            </div>
                          </div>
                        )}
                        {financials.resident.ownershipType === 'إيجار' && financials.resident.tenantName && (
                          <div className="flex items-center justify-between text-[10px] font-bold text-amber-900">
                            <div>المستأجر: <span className="font-black">{financials.resident.tenantName}</span></div>
                            {financials.resident.tenantPhone && (
                              <div className="font-black tracking-wider text-slate-800 font-mono inline-block" dir="ltr">{formatMobileNumber(financials.resident.tenantPhone)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Financial Status Summary */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                      <div className="text-[9px] text-slate-500 font-bold">حالة سداد شهر {monthName} ({currentYear})</div>
                      <div className={`text-xs sm:text-sm font-black flex items-center gap-1 ${financials.currentMonthStatus === 'مسدد' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {financials.currentMonthStatus === 'مسدد' ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span>مسدد ({financials.currentMonthPayment?.amount || financials.monthlyFee} ج.م)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>غير مسدد ({financials.monthlyFee} ج.م)</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                      <div className="text-[9px] text-slate-500 font-bold">المديونية القديمة / الأرصدة التراكمية</div>
                      {financials.oldDebtVal > 0 ? (
                        <div className="text-xs sm:text-sm font-black text-rose-700 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>توجد مديونية {financials.oldDebtVal.toLocaleString()} ج.م</span>
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm font-black text-emerald-700 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>خالي المديونيات</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Electronic Receipt / Notice Box */}
                  <div 
                    ref={receiptCardRef}
                    style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}
                    className="rounded-2xl border-2 p-4 space-y-3 relative text-right shadow-2xs"
                  >
                    {/* Badge */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs ${financials.currentMonthStatus === 'مسدد' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                          <Receipt className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">
                            {financials.currentMonthStatus === 'مسدد' ? 'إيصال سداد إلكتروني معتمد' : 'إشعار مطالبة إلكتروني'}
                          </h4>
                          <span className="text-[9px] text-slate-400 font-bold">اتحاد ملاك عمارة بيراميدز فيو ١</span>
                        </div>
                      </div>
                      
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${financials.currentMonthStatus === 'مسدد' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {financials.currentMonthStatus === 'مسدد' ? 'تم السداد ✓' : 'مطالبة بالسداد ⏳'}
                      </span>
                    </div>

                    {/* Receipt Fields */}
                    <div className="space-y-2 text-xs font-semibold text-slate-700 leading-relaxed">
                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-slate-500">اسم الشاغل:</span>
                        <span className="font-black text-slate-900">{financials.resident.name}</span>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-slate-500">عن شهر:</span>
                        <span className="font-black text-blue-950">اشتراك {monthName} {currentYear} ({financials.monthlyFee} ج.م)</span>
                      </div>

                      {/* OLD DEBT NOTICE HIGHLIGHT */}
                      {financials.oldDebtVal > 0 ? (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-black space-y-1">
                          <div className="flex items-center gap-1.5 text-rose-700">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>التنويه بوجود مديونية قديمة مرحلة:</span>
                          </div>
                          <p className="text-[11px] text-rose-800 pr-5">
                            • توجد مديونية قديمة مرحلة على الوحدة بمبلغ: <span className="underline font-black">{financials.oldDebtVal.toLocaleString()} ج.م</span>
                          </p>
                        </div>
                      ) : (
                        <div className="p-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-800 text-[10.5px] font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>تنويه: الحساب خالٍ تماماً من أي مديونيات سابقة أو متأخرات.</span>
                        </div>
                      )}

                      {/* Encouraging / Thanking Note */}
                      {financials.currentMonthStatus === 'مسدد' ? (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] font-bold text-center leading-relaxed shadow-2xs">
                          🌺 نشكركم جزيل الشكر والتقدير على حرصكم الدائم وسدادكم المنتظم، مما يساهم مباشرةً في الحفاظ على العمارة وتطوير خدماتها.
                        </div>
                      ) : (
                        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] font-bold text-center leading-relaxed shadow-2xs">
                          🤝 نأمل من سيادتكم التكرم بالمبادرة بسداد المستحقات في أقرب وقت لضمان استمرار خدمات النظافة، الحراسة، الصيانة، وتشغيل المصاعد بكفاءة لراحة جميع السكّان.
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs sm:text-sm font-black">
                        <span className="text-slate-900">
                          {financials.currentMonthStatus === 'مسدد' ? 'إجمالي المبلغ المسدد:' : 'إجمالي المبلغ المستحق للسداد:'}
                        </span>
                        <span className={financials.currentMonthStatus === 'مسدد' ? 'text-emerald-700' : 'text-rose-700'}>
                          {financials.currentMonthStatus === 'مسدد'
                            ? `${(financials.currentMonthPayment?.amount || financials.monthlyFee).toLocaleString()} ج.م`
                            : `${(financials.monthlyFee + financials.oldDebtVal).toLocaleString()} ج.م`}
                        </span>
                      </div>
                    </div>

                    {/* Receipt Actions */}
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <span className="text-[10px] font-black text-slate-500 block">إجراءات وإرسال الإيصال الإلكتروني:</span>
                      
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {/* Button 1: Send WhatsApp Notice */}
                        <button
                          type="button"
                          onClick={() => sendWhatsAppReceipt('owner')}
                          className="py-2 px-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] sm:text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs text-center active:scale-95"
                          title="إرسال إشعار نصي عبر الواتساب المسجل"
                        >
                          <Send className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">إرسال إشعار</span>
                        </button>

                        {/* Button 2: Generate & Share Image Directly via WhatsApp */}
                        <button
                          type="button"
                          disabled={isGeneratingImage}
                          onClick={() => handleCaptureAndShareImage('owner')}
                          className="py-2 px-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-[11px] sm:text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs disabled:opacity-50 text-center active:scale-95"
                          title={financials.currentMonthStatus === 'مسدد' ? 'توليد صورة الإيصال ومشاركتها مباشرة على واتساب الوحدة' : 'توليد صورة إشعار المطالبة ومشاركتها مباشرة على واتساب الوحدة'}
                        >
                          {isGeneratingImage ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-white" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5 shrink-0 text-emerald-200" />
                          )}
                          <span className="truncate">
                            {financials.currentMonthStatus === 'مسدد' ? 'توليد صورة الإيصال' : 'توليد صورة إشعار المطالبة'}
                          </span>
                        </button>

                        {/* Button 3: Copy Text */}
                        <button
                          type="button"
                          onClick={copyReceiptText}
                          className="py-2 px-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-black text-[11px] sm:text-xs transition cursor-pointer flex items-center justify-center gap-1 text-center active:scale-95"
                          title="نسخ نص الإيصال"
                        >
                          {copiedReceipt ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          <span className="truncate">{copiedReceipt ? 'تم النسخ ✓' : 'نسخ النص'}</span>
                        </button>
                      </div>

                      {financials.resident.ownershipType === 'إيجار' && (financials.resident.tenantName || financials.resident.tenantPhone) && (
                        <div className="pt-1 flex flex-col sm:flex-row gap-1.5">
                          <button
                            type="button"
                            onClick={() => sendWhatsAppReceipt('tenant')}
                            className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                            title="إرسال رسالة نصية للمستأجر عبر واتساب"
                          >
                            <MessageSquare className="w-3 h-3 text-amber-700" />
                            <span>رسالة نصية للمستأجر</span>
                          </button>
                          <button
                            type="button"
                            disabled={isGeneratingImage}
                            onClick={() => handleCaptureAndShareImage('tenant')}
                            className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                            title="توليد صورة الإيصال أو الإشعار ومشاركتها مباشرة لواتساب المستأجر"
                          >
                            <Share2 className="w-3 h-3 text-blue-700" />
                            <span>مشاركة صورة للمستأجر</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment History List */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-slate-900 font-black text-[11px] mb-1">
                      <History className="w-3.5 h-3.5 text-blue-900" />
                      <span>سجل المدفوعات المسجلة للوحدة ({currentYear})</span>
                    </div>
                    {financials.allPayments.length > 0 ? (
                      <div className="space-y-1.5">
                        {financials.allPayments.slice(0, 5).map(p => (
                          <div key={p.id} className="flex items-center justify-between p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-slate-500 border border-slate-100 shadow-2xs">
                                <CreditCard className="w-3 h-3 text-blue-900" />
                              </div>
                              <div>
                                <div className="text-[10px] font-black text-slate-900">{p.paymentType}</div>
                                <div className="text-[8px] text-slate-500 font-bold">{monthNamesArabic[parseInt(p.month) - 1]} {p.year}</div>
                              </div>
                            </div>
                            <div className="text-[10px] font-black text-emerald-600">+{p.amount} ج.م</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3 bg-slate-50 rounded-xl text-slate-400 text-[10px] font-bold">
                        لا توجد مدفوعات مسجلة لهذا العام حتى الآن.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-bold text-xs">هذه الوحدة غير مسجلة حالياً ببيانات ساكن محدد.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 shrink-0">
              <button 
                type="button"
                onClick={() => setActiveUnit(null)}
                className="w-full py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-black text-xs transition shadow-2xs cursor-pointer active:scale-95 flex items-center justify-center gap-1"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct WhatsApp Share & Receipt Image Preview Modal */}
      {sharedReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 text-right flex flex-col max-h-[92vh] my-auto">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${sharedReceiptModal.isPaid ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">{sharedReceiptModal.title}</h3>
                  <span className="text-[10px] text-slate-300 font-bold block">
                    المستلم: {sharedReceiptModal.recipientName} ({sharedReceiptModal.recipientPhone})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSharedReceiptModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success Toast / Instruction Banner */}
            <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex-1 leading-snug">
                تم تجهيز وفتح محادثة الواتساب مباشرة لرقم <span className="font-black underline">{sharedReceiptModal.recipientPhone}</span> كما تم نسخ الصورة للحافظة وتحميلها. اضغط <span className="underline font-black">لصق (Ctrl+V)</span> داخل الشات لإرسال الصورة فوراً!
              </div>
            </div>

            {/* High-Resolution Image Preview */}
            <div className="p-4 overflow-y-auto max-h-[60vh] bg-slate-100/70 flex justify-center items-center">
              <img
                src={sharedReceiptModal.imageDataUrl}
                alt={sharedReceiptModal.title}
                className="w-full max-w-md h-auto rounded-2xl border border-slate-200 shadow-md object-contain bg-white"
              />
            </div>

            {/* Modal Actions Footer */}
            <div className="p-3 bg-white border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const fullPhone = toWhatsAppNumber(sharedReceiptModal.recipientPhone);
                  const waUrl = fullPhone 
                    ? `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(sharedReceiptModal.msgText)}`
                    : `https://api.whatsapp.com/send?text=${encodeURIComponent(sharedReceiptModal.msgText)}`;
                  try {
                    const link = document.createElement('a');
                    link.href = waUrl;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } catch {
                    window.open(waUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs text-center active:scale-95"
                title="إعادة فتح محادثة الواتساب"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>فتح الواتساب</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    const blobUrl = URL.createObjectURL(sharedReceiptModal.imageBlob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = sharedReceiptModal.fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
                  } catch (err) {
                    console.error('Download error:', err);
                  }
                }}
                className="py-2.5 px-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs text-center active:scale-95"
                title="تحميل ملف الصورة لجهازك"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>تحميل الصورة</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    if (navigator.clipboard && window.ClipboardItem) {
                      await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': sharedReceiptModal.imageBlob })
                      ]);
                      setModalCopiedImage(true);
                      setTimeout(() => setModalCopiedImage(false), 3000);
                    }
                  } catch (clipErr) {
                    console.error('Clipboard error:', clipErr);
                  }
                }}
                className="py-2.5 px-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs text-center active:scale-95"
                title="نسخ الصورة للحافظة للصقها في الشات"
              >
                {modalCopiedImage ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>تم النسخ ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>نسخ الصورة</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSharedReceiptModal(null)}
                className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs text-center active:scale-95"
              >
                <span>إغلاق</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Printable High-Fidelity Receipt & Claim Card for Image Export */}
      {financials && (
        <div
          id="building-map-receipt-printable"
          className="printable-area hidden print:block text-right font-sans bg-white"
          dir="rtl"
          style={{
            width: '680px',
            maxWidth: '680px',
            padding: '24px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '16px',
            border: '2px solid #cbd5e1',
            boxSizing: 'border-box',
          }}
        >
          {/* Official Header with Building Emblem */}
          <div
            style={{
              backgroundColor: financials.currentMonthStatus === 'مسدد' ? '#047857' : '#1e3a8a',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '900', margin: 0, padding: 0 }}>
                {financials.currentMonthStatus === 'مسدد'
                  ? '💐 إيصال سداد واستلام مالي معتمد'
                  : '🏛️ إشعار مطالبة وبيان مستحقات شهرية'}
              </h2>
              <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px', fontWeight: '700' }}>
                اتحاد ملاك عمارة بيراميدز فيو ١
              </div>
            </div>
            <div style={{ textAlign: 'left', fontSize: '11px', fontWeight: '700', opacity: 0.95 }}>
              <div>التاريخ: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div style={{ marginTop: '3px' }}>
                المرجع:{' '}
                {financials.currentMonthStatus === 'مسدد'
                  ? (financials.currentMonthPayment?.receiptNumber ? `#${financials.currentMonthPayment.receiptNumber}` : `REC-${financials.resident.flatNumber}-${selectedMonth}${currentYear}`)
                  : `CLM-${financials.resident.flatNumber}-${selectedMonth}${currentYear}`}
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <div
            style={{
              backgroundColor: financials.currentMonthStatus === 'مسدد' ? '#ecfdf5' : '#fffbe2',
              border: `1px solid ${financials.currentMonthStatus === 'مسدد' ? '#10b981' : '#f59e0b'}`,
              color: financials.currentMonthStatus === 'مسدد' ? '#065f46' : '#92400e',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span>
              {financials.currentMonthStatus === 'مسدد'
                ? '✓ تم استلام مبلغ الاشتراك بنجاح وتوثيقه في السجل المالي المعتمد'
                : '⏳ نأمل المبادرة بالسداد لدعم استمرار خدمات وصيانة العمارة'}
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: financials.currentMonthStatus === 'مسدد' ? '#d1fae5' : '#fef3c7',
                fontWeight: '900',
                fontSize: '11px',
              }}
            >
              {financials.currentMonthStatus === 'مسدد' ? 'تم السداد ✓' : 'مطالبة بالسداد ⏳'}
            </span>
          </div>

          {/* Details Table */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '16px',
              fontSize: '12.5px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <tbody>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '9px 12px', width: '22%', fontWeight: '700', color: '#64748b' }}>اسم الشاغل:</td>
                <td style={{ padding: '9px 12px', fontWeight: '900', color: '#0f172a' }}>
                  <span>{financials.resident.name}</span>
                  {financials.resident.phone && (
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: '700', marginRight: '6px', fontFamily: 'monospace' }} dir="ltr">
                      ({formatMobileNumber(financials.resident.phone)})
                    </span>
                  )}
                </td>
                <td style={{ padding: '9px 12px', width: '20%', fontWeight: '700', color: '#64748b' }}>رقم الوحدة:</td>
                <td style={{ padding: '9px 12px', fontWeight: '900', color: '#1e3a8a' }}>
                  شقة {financials.resident.flatNumber} ({financials.resident.activityType})
                </td>
              </tr>
              <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '9px 12px', fontWeight: '700', color: '#64748b' }}>عن شهر:</td>
                <td style={{ padding: '9px 12px', fontWeight: '900', color: '#0f172a' }}>
                  اشتراك {monthName} {currentYear} ({financials.monthlyFee.toLocaleString()} ج.م)
                </td>
                <td style={{ padding: '9px 12px', fontWeight: '700', color: '#64748b' }}>نوع الإشغال:</td>
                <td style={{ padding: '9px 12px', fontWeight: '800', color: '#334155' }}>
                  {financials.resident.ownershipType || 'تمليك'}
                  {financials.resident.tenantName ? ` (مستأجر: ${financials.resident.tenantName})` : ''}
                </td>
              </tr>
              {financials.currentMonthStatus === 'مسدد' && (
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '9px 12px', fontWeight: '700', color: '#64748b' }}>تاريخ السداد:</td>
                  <td style={{ padding: '9px 12px', fontWeight: '800', color: '#0f172a' }}>
                    {financials.currentMonthPayment?.date || new Date().toISOString().slice(0, 10)}
                  </td>
                  <td style={{ padding: '9px 12px', fontWeight: '700', color: '#64748b' }}>طريقة التحصيل:</td>
                  <td style={{ padding: '9px 12px', fontWeight: '800', color: '#047857' }}>
                    {financials.currentMonthPayment?.paymentType || 'سداد نقدي معتمد'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Previous Debt Notice / Clean status */}
          {financials.oldDebtVal > 0 ? (
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#9f1239',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '900', color: '#be123c', marginBottom: '3px' }}>
                <span>⚠️ تنبيه بوجود مديونية قديمة مرحلة:</span>
              </div>
              <div>
                توجد مديونية قديمة مرحلة على الوحدة قدرها:{' '}
                <span style={{ fontWeight: '900', textDecoration: 'underline', color: '#881337' }}>
                  {financials.oldDebtVal.toLocaleString()} ج.م
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: '8px',
                padding: '8px 14px',
                marginBottom: '16px',
                fontSize: '11.5px',
                fontWeight: '700',
              }}
            >
              ✨ تنويه: الحساب خالٍ تماماً من أي مديونيات سابقة أو متأخرات.
            </div>
          )}

          {/* Polite message */}
          <div
            style={{
              backgroundColor: financials.currentMonthStatus === 'مسدد' ? '#f0fdf4' : '#eff6ff',
              border: `1px solid ${financials.currentMonthStatus === 'مسدد' ? '#bbf7d0' : '#bfdbfe'}`,
              color: financials.currentMonthStatus === 'مسدد' ? '#166534' : '#1e40af',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '11.5px',
              fontWeight: '700',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            {financials.currentMonthStatus === 'مسدد'
              ? '🌺 نشكركم جزيل الشكر والتقدير على حرصكم الدائم وسدادكم المنتظم، مما يساهم مباشرةً في الحفاظ على العمارة وتطوير خدماتها لراحة الجميع.'
              : '🤝 نأمل من سيادتكم التكرم بالمبادرة بسداد المستحقات في أقرب وقت لضمان استمرار خدمات النظافة، الحراسة، الصيانة، وتشغيل المصاعد بكفاءة لراحة جميع السكّان.'}
          </div>

          {/* Total Amount Box */}
          <div
            style={{
              backgroundColor: financials.currentMonthStatus === 'مسدد' ? '#ecfdf5' : '#fff1f2',
              border: `2px solid ${financials.currentMonthStatus === 'مسدد' ? '#059669' : '#e11d48'}`,
              borderRadius: '10px',
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>
              {financials.currentMonthStatus === 'مسدد' ? 'إجمالي المبلغ المسدد معتمداً:' : 'إجمالي المبلغ المستحق للسداد:'}
            </span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: '900',
                color: financials.currentMonthStatus === 'مسدد' ? '#047857' : '#be123c',
              }}
            >
              {financials.currentMonthStatus === 'مسدد'
                ? `${(financials.currentMonthPayment?.amount || financials.monthlyFee).toLocaleString()} ج.م`
                : `${(financials.monthlyFee + financials.oldDebtVal).toLocaleString()} ج.م`}
            </span>
          </div>

          {/* Official Seal / Footer */}
          <div
            style={{
              borderTop: '1px dashed #cbd5e1',
              paddingTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '10.5px',
              color: '#64748b',
              fontWeight: '700',
            }}
          >
            <span>تم استخراج هذا الإيصال إلكترونياً ومطابق للسجلات المالية الرسمية</span>
            <span
              style={{
                padding: '2px 8px',
                border: '1px solid #94a3b8',
                borderRadius: '4px',
                color: '#334155',
                fontWeight: '900',
              }}
            >
              معتمد إلكترونياً ✓ اتحاد ملاك بيراميدز فيو ١
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
