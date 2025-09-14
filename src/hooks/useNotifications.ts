import { useState, useCallback, useEffect } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('seo_notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      } catch (error) {
        console.error('Failed to parse stored notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('seo_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep only last 50
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({
        ...notification,
        read: true
      }))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Helper functions to add specific types of notifications
  const notifySuccess = useCallback((title: string, message: string, actionUrl?: string, actionLabel?: string) => {
    addNotification({
      title,
      message,
      type: 'success',
      actionUrl,
      actionLabel
    });
  }, [addNotification]);

  const notifyError = useCallback((title: string, message: string, actionUrl?: string, actionLabel?: string) => {
    addNotification({
      title,
      message,
      type: 'error',
      actionUrl,
      actionLabel
    });
  }, [addNotification]);

  const notifyWarning = useCallback((title: string, message: string, actionUrl?: string, actionLabel?: string) => {
    addNotification({
      title,
      message,
      type: 'warning',
      actionUrl,
      actionLabel
    });
  }, [addNotification]);

  const notifyInfo = useCallback((title: string, message: string, actionUrl?: string, actionLabel?: string) => {
    addNotification({
      title,
      message,
      type: 'info',
      actionUrl,
      actionLabel
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo
  };
};

export default useNotifications;