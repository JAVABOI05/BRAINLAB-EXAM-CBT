export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export const TOAST_EVENT = "brainlab-toast-event";

export const toast = {
  success(message: string, title?: string, duration = 3500) {
    emitToast("success", message, title, duration);
  },
  error(message: string, title?: string, duration = 4500) {
    emitToast("error", message, title, duration);
  },
  info(message: string, title?: string, duration = 3500) {
    emitToast("info", message, title, duration);
  },
  warning(message: string, title?: string, duration = 4000) {
    emitToast("warning", message, title, duration);
  },
};

function emitToast(type: ToastType, message: string, title?: string, duration = 3500) {
  if (typeof window === "undefined") return;
  const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const detail: ToastMessage = { id, type, title, message, duration };
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail }));
}
