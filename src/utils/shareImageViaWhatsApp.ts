import { toWhatsAppNumber } from './phoneUtils';

export interface ShareImageOptions {
  imageBlob: Blob;
  fileName: string;
  phone?: string | number | null;
  recipientName?: string;
  title: string;
  text: string;
  onSuccessToast?: (msg: string) => void;
  onErrorToast?: (msg: string) => void;
}

export interface ShareImageResult {
  success: boolean;
  method: 'native' | 'clipboard_whatsapp' | 'download_whatsapp' | 'cancelled';
  message?: string;
}

/**
 * Shares an image directly to WhatsApp using:
 * 1. Native Web Share API with File (Mobile / supported OS - directly attaches image in WhatsApp)
 * 2. Fallback: Copies image to clipboard + downloads image file + opens WhatsApp chat directly with the phone number
 */
export async function shareImageViaWhatsApp(options: ShareImageOptions): Promise<ShareImageResult> {
  const {
    imageBlob,
    fileName,
    phone,
    recipientName,
    title,
    text,
    onSuccessToast,
    onErrorToast,
  } = options;

  const cleanPhone = toWhatsAppNumber(phone);
  const targetLabel = recipientName ? `(${recipientName})` : (phone ? `(${phone})` : '');

  // 1. Prepare File for Native Sharing
  const file = new File([imageBlob], fileName, { type: 'image/png' });

  // 2. Try Native Web Share API with File (Supported on Mobile Chrome, Safari, Android, iOS)
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: title,
        text: text,
      });
      const msg = `تم فتح تطبيق الواتساب لمشاركة الصورة بنجاح ${targetLabel}`;
      onSuccessToast?.(msg);
      return { success: true, method: 'native', message: msg };
    } catch (shareErr: any) {
      if (shareErr?.name === 'AbortError') {
        return { success: false, method: 'cancelled', message: 'تم إلغاء المشاركة' };
      }
      console.warn('Native file share error, proceeding to desktop clipboard fallback:', shareErr);
    }
  }

  // 3. Fallback: Copy image to Clipboard + Download PNG + Open WhatsApp URL
  let copiedToClipboard = false;
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': imageBlob }),
      ]);
      copiedToClipboard = true;
    } catch (clipErr) {
      console.warn('Clipboard image write not permitted or failed:', clipErr);
    }
  }

  // Download image file to device
  try {
    const blobUrl = URL.createObjectURL(imageBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch (dlErr) {
    console.warn('Direct file download error:', dlErr);
  }

  // Open WhatsApp
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  let waUrl = '';
  if (cleanPhone) {
    waUrl = isMobile
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  } else {
    waUrl = isMobile
      ? `https://wa.me/?text=${encodeURIComponent(text)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  const win = window.open(waUrl, '_blank');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    window.location.href = waUrl;
  }

  const statusMsg = copiedToClipboard
    ? `تم نسخ الصورة للحافظة وتحميلها لجهازك، وجاري فتح محادثة الواتساب ${targetLabel} — اضغط (لصق / Ctrl+V) في الشات لإرسال الصورة فوراً!`
    : `تم تحميل الصورة لجهازك وفتح محادثة الواتساب ${targetLabel} — يمكنك إرفاق الصورة المحفوظة في الشات الآن.`;

  onSuccessToast?.(statusMsg);
  return {
    success: true,
    method: copiedToClipboard ? 'clipboard_whatsapp' : 'download_whatsapp',
    message: statusMsg,
  };
}
