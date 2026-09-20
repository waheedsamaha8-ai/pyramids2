import React, { useState } from 'react';
import { AppNotification, UserRole } from '../types';
import { Bell, CheckCircle2, AlertTriangle, Info, X, Trash2, MessageSquare, UserPlus, HelpCircle, Wrench } from 'lucide-react';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  role?: UserRole;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onDismiss,
  onClearAll,
  onClose,
  role,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'chat' | 'registration' | 'communication' | 'services'>('all');

  // Strictly filter to only the allowed categories
  const allowedNotifications = notifications.filter((n) => {
    if (!n.category) return false;
    if (role === 'ASSISTANT') {
      return ['registration', 'services'].includes(n.category);
    }
    return ['chat', 'registration', 'communication', 'services'].includes(n.category);
  });

  const displayedNotifications = activeCategory === 'all'
    ? allowedNotifications
    : allowedNotifications.filter(n => n.category === activeCategory);

  const getIcon = (type: AppNotification['type'], category?: AppNotification['category']) => {
    if (category === 'chat') {
      return <MessageSquare className="w-5 h-5 text-blue-600" />;
    }
    if (category === 'registration') {
      return <UserPlus className="w-5 h-5 text-emerald-600" />;
    }
    if (category === 'services') {
      return <Wrench className="w-5 h-5 text-amber-600" />;
    }
    if (category === 'communication') {
      return <HelpCircle className="w-5 h-5 text-indigo-600" />;
    }

    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getCategoryLabel = (category?: AppNotification['category']) => {
    switch (category) {
      case 'chat':
        return 'الدردشة والرسائل';
      case 'registration':
        return 'طلبات وتسجيل السكان';
      case 'communication':
        return 'التواصل والمقترحات';
      case 'services':
        return 'الخدمات والصيانة';
      default:
        return 'عام';
    }
  };

  const getTypeStyle = (type: AppNotification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50/50 border-emerald-100';
      case 'warning':
        return 'bg-amber-50/50 border-amber-100';
      case 'error':
        return 'bg-red-50/50 border-red-100';
      default:
        return 'bg-blue-50/50 border-blue-100';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-left text-right">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">مركز التنبيهات والرسائل</h2>
              <div className="relative">
                <Bell className="w-5 h-5 text-blue-900" />
                {allowedNotifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {allowedNotifications.filter(n => !n.read).length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Filter Categories Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-4 pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                activeCategory === 'all'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({allowedNotifications.length})
            </button>
            {role !== 'ASSISTANT' && (
              <>
                <button
                  onClick={() => setActiveCategory('chat')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                    activeCategory === 'chat'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  الدردشة ({allowedNotifications.filter(n => n.category === 'chat').length})
                </button>
                <button
                  onClick={() => setActiveCategory('communication')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                    activeCategory === 'communication'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  التواصل ({allowedNotifications.filter(n => n.category === 'communication').length})
                </button>
              </>
            )}
            <button
              onClick={() => setActiveCategory('services')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                activeCategory === 'services'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الخدمات ({allowedNotifications.filter(n => n.category === 'services').length})
            </button>
            <button
              onClick={() => setActiveCategory('registration')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                activeCategory === 'registration'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              السكان ({allowedNotifications.filter(n => n.category === 'registration').length})
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <Bell className="w-12 h-12 stroke-[1.5]" />
              <p className="text-sm font-semibold">لا توجد تنبيهات أو رسائل جديدة في هذا القسم.</p>
            </div>
          ) : (
            displayedNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 border rounded-2xl flex items-start gap-4 transition-all duration-200 ${getTypeStyle(notif.type)}`}
              >
                {/* Dismiss button */}
                <button
                  onClick={() => onDismiss(notif.id)}
                  className="text-slate-300 hover:text-slate-500 rounded-lg p-1 transition"
                  title="حذف التنبيه"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Message info */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 text-slate-600 border border-slate-200/60">
                      {getCategoryLabel(notif.category)}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">{notif.message}</p>
                  <span className="text-[10px] text-slate-400 font-semibold block pt-1">
                    {new Date(notif.timestamp).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Icon */}
                <div className="pt-0.5">
                  {getIcon(notif.type, notif.category)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {allowedNotifications.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
            <button
              onClick={onClearAll}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-bold transition px-4 py-2 rounded-xl hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>مسح جميع التنبيهات</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
