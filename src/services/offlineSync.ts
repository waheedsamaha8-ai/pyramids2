import { OfflineAction, Resident, Payment, Expense, AppConfig, BuildingRules } from '../types';
import * as googleApi from './googleApi';

const QUEUE_KEY = 'offline_actions_queue';

// Get queued actions with automatic sanitization of oversized base64 data to prevent Google Sheets 50,000 cell limit errors
export function getOfflineQueue(): OfflineAction[] {
  const queueJson = localStorage.getItem(QUEUE_KEY);
  if (!queueJson) return [];
  try {
    const queue: OfflineAction[] = JSON.parse(queueJson);
    if (!Array.isArray(queue)) return [];

    let modified = false;
    for (const action of queue) {
      if (action && action.payload && typeof action.payload === 'object') {
        const p = action.payload;
        // Check for base64 or oversized strings in fields destined for Google Sheets cells
        for (const key of Object.keys(p)) {
          if (typeof p[key] === 'string') {
            if (p[key].startsWith('data:')) {
              if (!p.base64Image) {
                p.base64Image = p[key];
              }
              p[key] = ''; // Remove raw base64 from sheet cell field
              modified = true;
            } else if (p[key].length > 45000) {
              p[key] = p[key].substring(0, 45000);
              modified = true;
            }
          }
        }
      }
    }
    if (modified) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
    return queue;
  } catch {
    return [];
  }
}

// Clear or update queued actions
export function saveOfflineQueue(queue: OfflineAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Add an action to the queue
export function enqueueAction(type: OfflineAction['type'], payload: any) {
  const queue = getOfflineQueue();
  // Deep clone and sanitize payload for storage
  const sanitizedPayload = { ...payload };
  if (typeof sanitizedPayload.fileId === 'string' && sanitizedPayload.fileId.startsWith('data:')) {
    if (!sanitizedPayload.base64Image) sanitizedPayload.base64Image = sanitizedPayload.fileId;
    sanitizedPayload.fileId = '';
  }
  if (typeof sanitizedPayload.imageUrl === 'string' && sanitizedPayload.imageUrl.startsWith('data:')) {
    if (!sanitizedPayload.base64Image) sanitizedPayload.base64Image = sanitizedPayload.imageUrl;
    sanitizedPayload.imageUrl = '';
  }

  const newAction: OfflineAction = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload: sanitizedPayload,
    timestamp: Date.now(),
  };
  queue.push(newAction);
  saveOfflineQueue(queue);
  
  // Update local caches immediately so the offline user sees their updates in the UI
  applyActionToLocalCache(type, payload);
}

// Low-level helper to apply offline modifications directly to local caches
function applyActionToLocalCache(type: OfflineAction['type'], payload: any) {
  switch (type) {
    case 'ADD_RESIDENT': {
      const list = getCachedData<Resident[]>('residents') || [];
      list.push(payload);
      saveCachedData('residents', list);
      break;
    }
    case 'EDIT_RESIDENT': {
      let list = getCachedData<Resident[]>('residents') || [];
      list = list.map(item => item.id === payload.id ? payload : item);
      saveCachedData('residents', list);
      break;
    }
    case 'DELETE_RESIDENT': {
      let list = getCachedData<Resident[]>('residents') || [];
      list = list.filter(item => item.id !== payload.id);
      saveCachedData('residents', list);
      
      // Cascade delete payments locally
      let payments = getCachedData<Payment[]>('payments') || [];
      payments = payments.filter(p => p.residentId !== payload.id);
      saveCachedData('payments', payments);
      break;
    }
    case 'ADD_PAYMENT': {
      const list = getCachedData<Payment[]>('payments') || [];
      list.push(payload);
      saveCachedData('payments', list);
      break;
    }
    case 'EDIT_PAYMENT': {
      let list = getCachedData<Payment[]>('payments') || [];
      list = list.map(item => item.id === payload.id ? payload : item);
      saveCachedData('payments', list);
      break;
    }
    case 'DELETE_PAYMENT': {
      let list = getCachedData<Payment[]>('payments') || [];
      list = list.filter(item => item.id !== payload.id);
      saveCachedData('payments', list);
      break;
    }
    case 'ADD_EXPENSE': {
      const list = getCachedData<Expense[]>('expenses') || [];
      list.push(payload);
      saveCachedData('expenses', list);
      break;
    }
    case 'EDIT_EXPENSE': {
      let list = getCachedData<Expense[]>('expenses') || [];
      list = list.map(item => item.id === payload.id ? payload : item);
      saveCachedData('expenses', list);
      break;
    }
    case 'DELETE_EXPENSE': {
      let list = getCachedData<Expense[]>('expenses') || [];
      list = list.filter(item => item.id !== payload.id);
      saveCachedData('expenses', list);
      break;
    }
    case 'UPDATE_RULES': {
      saveCachedData('rules', { rules: payload });
      break;
    }
    case 'UPDATE_CONFIG': {
      saveCachedData('config', payload);
      break;
    }
    case 'ADD_CRAFTSMAN': {
      const list = getCachedData<any[]>('craftsmen') || [];
      list.push(payload);
      saveCachedData('craftsmen', list);
      break;
    }
    case 'EDIT_CRAFTSMAN': {
      let list = getCachedData<any[]>('craftsmen') || [];
      list = list.map(item => item.id === payload.id ? payload : item);
      saveCachedData('craftsmen', list);
      break;
    }
    case 'DELETE_CRAFTSMAN': {
      let list = getCachedData<any[]>('craftsmen') || [];
      list = list.filter(item => item.id !== payload.id);
      saveCachedData('craftsmen', list);
      break;
    }
    case 'ADD_CHAT_MESSAGE': {
      const list = getCachedData<any[]>('messages') || [];
      list.push(payload);
      saveCachedData('messages', list);
      break;
    }
    case 'SET_ALL_CHAT': {
      saveCachedData('messages', payload);
      break;
    }
    case 'ADD_DECISION': {
      const list = getCachedData<any[]>('decisions') || [];
      list.push(payload);
      saveCachedData('decisions', list);
      break;
    }
    case 'EDIT_DECISION': {
      let list = getCachedData<any[]>('decisions') || [];
      list = list.map(item => item.id === payload.id ? payload : item);
      saveCachedData('decisions', list);
      break;
    }
    case 'DELETE_DECISION': {
      let list = getCachedData<any[]>('decisions') || [];
      list = list.filter(item => item.id !== payload.id);
      saveCachedData('decisions', list);
      break;
    }
    case 'ADD_POLL': {
      const list = getCachedData<any[]>('polls') || [];
      list.push(payload);
      saveCachedData('polls', list);
      break;
    }
    case 'EDIT_POLL': {
      let list = getCachedData<any[]>('polls') || [];
      list = list.map(item => item.id === payload.id ? payload : item);
      saveCachedData('polls', list);
      break;
    }
    case 'DELETE_POLL': {
      let list = getCachedData<any[]>('polls') || [];
      list = list.filter(item => item.id !== payload.id);
      saveCachedData('polls', list);
      break;
    }
    case 'ADD_COMPLAINT': {
      const list = getCachedData<any[]>('complaints') || [];
      list.push(payload);
      saveCachedData('complaints', list);
      break;
    }
    case 'EDIT_COMPLAINT': {
      let list = getCachedData<any[]>('complaints') || [];
      list = list.map(item => item.id === payload.id ? payload : item);
      saveCachedData('complaints', list);
      break;
    }
    case 'DELETE_COMPLAINT': {
      let list = getCachedData<any[]>('complaints') || [];
      list = list.filter(item => item.id !== payload.id);
      saveCachedData('complaints', list);
      break;
    }
    case 'ADD_MAINTENANCE': {
      const list = getCachedData<any[]>('maintenance') || [];
      list.push(payload);
      saveCachedData('maintenance', list);
      break;
    }
    case 'EDIT_MAINTENANCE': {
      let list = getCachedData<any[]>('maintenance') || [];
      list = list.map(item => item.id === payload.id ? payload : item);
      saveCachedData('maintenance', list);
      break;
    }
    case 'DELETE_MAINTENANCE': {
      let list = getCachedData<any[]>('maintenance') || [];
      list = list.filter(item => item.id !== payload.id);
      saveCachedData('maintenance', list);
      break;
    }
    case 'ADD_EVENT': {
      const list = getCachedData<any[]>('events') || [];
      list.push(payload);
      saveCachedData('events', list);
      break;
    }
    case 'EDIT_EVENT': {
      let list = getCachedData<any[]>('events') || [];
      list = list.map(item => item.id === payload.id ? payload : item);
      saveCachedData('events', list);
      break;
    }
    case 'DELETE_EVENT': {
      let list = getCachedData<any[]>('events') || [];
      list = list.filter(item => item.id !== payload.id);
      saveCachedData('events', list);
      break;
    }
  }
}

// Standard getters and setters for local cache
export function getCachedData<T>(key: string): T | null {
  const json = localStorage.getItem(`cache_${key}`);
  return json ? JSON.parse(json) : null;
}

export function saveCachedData(key: string, data: any) {
  localStorage.setItem(`cache_${key}`, JSON.stringify(data));
}

// Proactively clear resident-related actions from the queue (e.g. when replacing all residents)
export function clearResidentActionsFromQueue() {
  const queue = getOfflineQueue();
  const filtered = queue.filter(action => 
    action.type !== 'ADD_RESIDENT' && 
    action.type !== 'EDIT_RESIDENT' && 
    action.type !== 'DELETE_RESIDENT'
  );
  if (filtered.length !== queue.length) {
    saveOfflineQueue(filtered);
    console.info(`[Offline Sync] Cleared ${queue.length - filtered.length} resident actions from queue.`);
  }
}

// Synchronize all queued actions to Google Sheets sequentially
export async function syncOfflineQueue(onProgress?: (msg: string) => void): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  const accessToken = googleApi.getAccessToken();
  if (!accessToken || accessToken === 'local-token') {
    // Actions are stored locally in cache; cannot push to Google Sheets without OAuth access token
    return 0;
  }

  const sId = googleApi.getSpreadsheetId();
  if (!sId || sId === 'local-resident-spreadsheet' || sId === 'pyramids-view-1-fallback-db') {
    // Spreadsheet is not ready or is running in local mode; postpone sync until connected
    return 0;
  }

  onProgress?.(`جاري مزامنة ${queue.length} من التحديثات المعلقة مع Google Sheets...`);
  
  let successCount = 0;
  const remainingActions: OfflineAction[] = [];

  for (let i = 0; i < queue.length; i++) {
    const action = queue[i];
    try {
      onProgress?.(`مزامنة: ${translateActionType(action.type)}...`);
      
      switch (action.type) {
        case 'ADD_RESIDENT':
          await googleApi.addResidentSheet(action.payload);
          break;
        case 'EDIT_RESIDENT':
          await googleApi.editResidentSheet(action.payload);
          break;
        case 'DELETE_RESIDENT':
          await googleApi.deleteResidentSheet(action.payload.id);
          break;
        case 'ADD_PAYMENT': {
          const rawBase64 = action.payload.base64Image || (action.payload.fileId?.startsWith('data:') ? action.payload.fileId : undefined);
          if (rawBase64) {
            try {
              onProgress?.(`رفع صورة الإيصال لـ ${action.payload.residentName || 'الساكن'} إلى Google Drive...`);
              const fileId = await googleApi.uploadFileToDrive(
                `Receipt_${action.payload.receiptNumber || action.payload.id}`,
                rawBase64,
                'image/jpeg'
              );
              action.payload.fileId = fileId;
              delete action.payload.base64Image;
            } catch (uErr) {
              console.warn('[Offline Sync] Failed to upload receipt image to Drive:', uErr);
              action.payload.fileId = '';
              delete action.payload.base64Image;
            }
          }
          if (action.payload.fileId?.startsWith('data:')) {
            action.payload.fileId = '';
          }
          await googleApi.addPaymentSheet(action.payload);
          break;
        }
        case 'EDIT_PAYMENT': {
          const rawBase64 = action.payload.base64Image || (action.payload.fileId?.startsWith('data:') ? action.payload.fileId : undefined);
          if (rawBase64) {
            try {
              onProgress?.(`رفع صورة الإيصال المحدثة إلى Google Drive...`);
              const fileId = await googleApi.uploadFileToDrive(
                `Receipt_${action.payload.receiptNumber || action.payload.id}`,
                rawBase64,
                'image/jpeg'
              );
              action.payload.fileId = fileId;
              delete action.payload.base64Image;
            } catch (uErr) {
              console.warn('[Offline Sync] Failed to upload receipt image to Drive:', uErr);
              action.payload.fileId = '';
              delete action.payload.base64Image;
            }
          }
          if (action.payload.fileId?.startsWith('data:')) {
            action.payload.fileId = '';
          }
          await googleApi.editPaymentSheet(action.payload);
          break;
        }
        case 'DELETE_PAYMENT':
          await googleApi.deletePaymentSheet(action.payload.id);
          break;
        case 'ADD_EXPENSE': {
          const rawBase64 = action.payload.base64Image || (action.payload.fileId?.startsWith('data:') ? action.payload.fileId : undefined);
          if (rawBase64) {
            try {
              onProgress?.(`رفع صورة الفاتورة للمصروف إلى Google Drive...`);
              const fileId = await googleApi.uploadFileToDrive(
                `Invoice_${action.payload.expenseType || 'Expense'}_${action.payload.id}`,
                rawBase64,
                'image/jpeg'
              );
              action.payload.fileId = fileId;
              delete action.payload.base64Image;
            } catch (uErr) {
              console.warn('[Offline Sync] Failed to upload invoice to Drive:', uErr);
              action.payload.fileId = '';
              delete action.payload.base64Image;
            }
          }
          if (action.payload.fileId?.startsWith('data:')) {
            action.payload.fileId = '';
          }
          await googleApi.addExpenseSheet(action.payload);
          break;
        }
        case 'EDIT_EXPENSE': {
          const rawBase64 = action.payload.base64Image || (action.payload.fileId?.startsWith('data:') ? action.payload.fileId : undefined);
          if (rawBase64) {
            try {
              onProgress?.(`رفع صورة الفاتورة المحدثة إلى Google Drive...`);
              const fileId = await googleApi.uploadFileToDrive(
                `Invoice_${action.payload.expenseType || 'Expense'}_${action.payload.id}`,
                rawBase64,
                'image/jpeg'
              );
              action.payload.fileId = fileId;
              delete action.payload.base64Image;
            } catch (uErr) {
              console.warn('[Offline Sync] Failed to upload invoice to Drive:', uErr);
              action.payload.fileId = '';
              delete action.payload.base64Image;
            }
          }
          if (action.payload.fileId?.startsWith('data:')) {
            action.payload.fileId = '';
          }
          await googleApi.editExpenseSheet(action.payload);
          break;
        }
        case 'DELETE_EXPENSE':
          await googleApi.deleteExpenseSheet(action.payload.id);
          break;
        case 'UPDATE_RULES':
          await googleApi.saveBuildingRulesSheet(action.payload);
          break;
        case 'UPDATE_CONFIG':
          await googleApi.saveAppConfig(action.payload);
          break;
        case 'ADD_CRAFTSMAN':
          await googleApi.addCraftsmanSheet(action.payload);
          break;
        case 'EDIT_CRAFTSMAN':
          await googleApi.editCraftsmanSheet(action.payload);
          break;
        case 'DELETE_CRAFTSMAN':
          await googleApi.deleteCraftsmanSheet(action.payload.id || action.payload);
          break;
        case 'ADD_CHAT_MESSAGE': {
          const rawBase64 = action.payload.base64Image || (action.payload.imageUrl?.startsWith('data:') ? action.payload.imageUrl : undefined);
          if (rawBase64) {
            try {
              onProgress?.(`رفع صورة الدردشة إلى Google Drive...`);
              const fileId = await googleApi.uploadFileToDrive(
                `Chat_${action.payload.id}`,
                rawBase64,
                'image/jpeg'
              );
              action.payload.imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
              delete action.payload.base64Image;
            } catch (uErr) {
              console.warn('[Offline Sync] Failed to upload chat image to Drive:', uErr);
              action.payload.imageUrl = '';
              delete action.payload.base64Image;
            }
          }
          if (action.payload.imageUrl?.startsWith('data:')) {
            action.payload.imageUrl = '';
          }
          await googleApi.addChatMessageSheet(action.payload);
          break;
        }
        case 'SET_ALL_CHAT':
          await googleApi.setAllChatMessagesSheet(action.payload);
          break;
        case 'ADD_DECISION':
          await googleApi.addAdminDecisionSheet(action.payload);
          break;
        case 'EDIT_DECISION':
          await googleApi.editAdminDecisionSheet(action.payload);
          break;
        case 'DELETE_DECISION':
          await googleApi.deleteAdminDecisionSheet(action.payload.id || action.payload);
          break;
        case 'ADD_POLL':
          await googleApi.addPollSheet(action.payload);
          break;
        case 'EDIT_POLL':
          await googleApi.editPollSheet(action.payload);
          break;
        case 'DELETE_POLL':
          await googleApi.deletePollSheet(action.payload.id || action.payload);
          break;
        case 'ADD_COMPLAINT': {
          const rawBase64 = action.payload.base64Image || (action.payload.imageUrl?.startsWith('data:') ? action.payload.imageUrl : undefined);
          if (rawBase64) {
            try {
              onProgress?.(`رفع صورة الشكوى إلى Google Drive...`);
              const fileId = await googleApi.uploadFileToDrive(
                `Complaint_${action.payload.id}`,
                rawBase64,
                'image/jpeg'
              );
              action.payload.imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
              delete action.payload.base64Image;
            } catch (uErr) {
              console.warn('[Offline Sync] Failed to upload complaint image to Drive:', uErr);
              action.payload.imageUrl = '';
              delete action.payload.base64Image;
            }
          }
          if (action.payload.imageUrl?.startsWith('data:')) {
            action.payload.imageUrl = '';
          }
          await googleApi.addComplaintSheet(action.payload);
          break;
        }
        case 'EDIT_COMPLAINT': {
          const rawBase64 = action.payload.base64Image || (action.payload.imageUrl?.startsWith('data:') ? action.payload.imageUrl : undefined);
          if (rawBase64) {
            try {
              onProgress?.(`رفع صورة الشكوى إلى Google Drive...`);
              const fileId = await googleApi.uploadFileToDrive(
                `Complaint_${action.payload.id}`,
                rawBase64,
                'image/jpeg'
              );
              action.payload.imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
              delete action.payload.base64Image;
            } catch (uErr) {
              console.warn('[Offline Sync] Failed to upload complaint image to Drive:', uErr);
              action.payload.imageUrl = '';
              delete action.payload.base64Image;
            }
          }
          if (action.payload.imageUrl?.startsWith('data:')) {
            action.payload.imageUrl = '';
          }
          await googleApi.editComplaintSheet(action.payload);
          break;
        }
        case 'DELETE_COMPLAINT':
          await googleApi.deleteComplaintSheet(action.payload.id || action.payload);
          break;
        case 'ADD_MAINTENANCE':
          await googleApi.addMaintenanceRequestSheet(action.payload);
          break;
        case 'EDIT_MAINTENANCE':
          await googleApi.editMaintenanceRequestSheet(action.payload);
          break;
        case 'DELETE_MAINTENANCE':
          await googleApi.deleteMaintenanceRequestSheet(action.payload.id || action.payload);
          break;
        case 'ADD_EVENT':
          await googleApi.addEventSheet(action.payload);
          break;
        case 'EDIT_EVENT':
          await googleApi.editEventSheet(action.payload);
          break;
        case 'DELETE_EVENT':
          await googleApi.deleteEventSheet(action.payload.id || action.payload);
          break;
      }
      
      successCount++;
    } catch (error: any) {
      const isNotInitError = error?.message?.includes('Spreadsheet not initialized') || 
                             error?.message?.includes('not initialized');

      const isAuthError = error?.message?.toLowerCase().includes('credential') || 
                          error?.message?.toLowerCase().includes('token') || 
                          error?.message?.toLowerCase().includes('unauthorized') || 
                          error?.message?.toLowerCase().includes('authenticated');
      
      const isNotFoundError = error?.message?.includes('لم يتم العثور على') || 
                             error?.message?.toLowerCase().includes('not found');

      const isCellLimitError = error?.message?.includes('50000') ||
                               error?.message?.includes('الحروف في خلية واحدة') ||
                               error?.message?.includes('exceeds the maximum') ||
                               error?.message?.includes('characters in a single cell');

      if (isNotInitError) {
        console.warn(`[Offline Sync] Postponing action ${action.id}: Google spreadsheet is not initialized yet.`);
        remainingActions.push(action);
        for (let j = i + 1; j < queue.length; j++) {
          remainingActions.push(queue[j]);
        }
        break;
      } else if (isAuthError) {
        console.warn(`[Offline Sync Auth Warning] Failed to sync action ${action.id} due to invalid/expired credentials:`, error.message || error);
        remainingActions.push(action);
      } else if (isNotFoundError) {
        console.info(`[Offline Sync Cleanup] Action ${action.id} skipped - record not found (likely deleted or replaced).`, error.message);
        // Do NOT push to remainingActions - we discard it because retrying won't help
        successCount++; // Count as "processed" to allow the queue to move forward
      } else if (isCellLimitError) {
        console.warn(`[Offline Sync Cleanup] Action ${action.id} discarded because its payload exceeded Google Sheets 50,000 char cell limit. Queue unblocked.`, error.message);
        // Do NOT push to remainingActions - allow sync queue to progress
        successCount++;
      } else {
        console.error(`Failed to sync action ${action.id}:`, error);
        // If it's another error (network, etc.), keep it in the queue to try again later
        remainingActions.push(action);
      }
    }
  }

  saveOfflineQueue(remainingActions);
  return successCount;
}

function translateActionType(type: OfflineAction['type']): string {
  switch (type) {
    case 'ADD_RESIDENT': return 'إضافة ساكن';
    case 'EDIT_RESIDENT': return 'تعديل ساكن';
    case 'DELETE_RESIDENT': return 'حذف ساكن';
    case 'ADD_PAYMENT': return 'إضافة عملية تحصيل';
    case 'EDIT_PAYMENT': return 'تعديل عملية تحصيل';
    case 'DELETE_PAYMENT': return 'حذف عملية تحصيل';
    case 'ADD_EXPENSE': return 'إضافة مصروف جديد';
    case 'EDIT_EXPENSE': return 'تعديل مصروف';
    case 'DELETE_EXPENSE': return 'حذف مصروف';
    case 'UPDATE_RULES': return 'تحديث تعليمات العمارة';
    case 'UPDATE_CONFIG': return 'تعديل إعدادات النظام';
    case 'ADD_CRAFTSMAN': return 'إضافة فني / صنايعي';
    case 'EDIT_CRAFTSMAN': return 'تعديل بيانات فني';
    case 'DELETE_CRAFTSMAN': return 'حذف فني';
    case 'ADD_CHAT_MESSAGE': return 'إرسال رسالة دردشة';
    case 'SET_ALL_CHAT': return 'تحديث سجل المحادثات';
    case 'ADD_DECISION': return 'إصدار قرار إداري';
    case 'EDIT_DECISION': return 'تعديل قرار إداري';
    case 'DELETE_DECISION': return 'حذف قرار إداري';
    case 'ADD_POLL': return 'إنشاء استبيان وتصويت';
    case 'EDIT_POLL': return 'تعديل استبيان وتصويت';
    case 'DELETE_POLL': return 'حذف استبيان';
    case 'ADD_COMPLAINT': return 'تقديم شكوى ومقترح';
    case 'EDIT_COMPLAINT': return 'تعديل شكوى ومقترح';
    case 'DELETE_COMPLAINT': return 'حذف شكوى';
    case 'ADD_MAINTENANCE': return 'طلب صيانة جديد';
    case 'EDIT_MAINTENANCE': return 'تحديث طلب صيانة';
    case 'DELETE_MAINTENANCE': return 'حذف طلب صيانة';
    case 'ADD_EVENT': return 'إضافة موعد أو فعالية';
    case 'EDIT_EVENT': return 'تعديل موعد أو فعالية';
    case 'DELETE_EVENT': return 'حذف موعد أو فعالية';
    default: return 'عملية قاعدة البيانات';
  }
}
