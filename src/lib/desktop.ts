// Desktop integration helpers for Tauri
// These functions will work in both Tauri desktop and browser environments

let tauriApi: typeof import('@tauri-apps/api/core') | null = null;
let notificationApi: typeof import('@tauri-apps/plugin-notification') | null = null;
let windowApi: typeof import('@tauri-apps/api/window') | null = null;

// Lazy load Tauri APIs
async function loadTauriApis() {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    if (!tauriApi) {
      tauriApi = await import('@tauri-apps/api/core');
    }
    if (!notificationApi) {
      try {
        notificationApi = await import('@tauri-apps/plugin-notification');
      } catch (e) {
        console.log('Notification plugin not available');
      }
    }
    if (!windowApi) {
      try {
        windowApi = await import('@tauri-apps/api/window');
      } catch (e) {
        console.log('Window API not available');
      }
    }
    return true;
  }
  return false;
}

// Check if running in Tauri desktop environment
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

// Send a native notification (works in both Tauri and browser)
export async function showNotification(title: string, body: string): Promise<void> {
  const isTauri = await loadTauriApis();

  if (isTauri && notificationApi) {
    try {
      // Check and request permission if needed
      let permissionGranted = await notificationApi.isPermissionGranted();
      if (!permissionGranted) {
        const permission = await notificationApi.requestPermission();
        permissionGranted = permission === 'granted';
      }

      if (permissionGranted) {
        notificationApi.sendNotification({ title, body });
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
      // Fallback to browser notification
      showBrowserNotification(title, body);
    }
  } else {
    // Browser fallback
    showBrowserNotification(title, body);
  }
}

// Browser notification fallback
async function showBrowserNotification(title: string, body: string): Promise<void> {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, { body });
    }
  }
}

// Play notification sound (browser fallback)
export function playNotificationSound(): void {
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  audio.play().catch(e => console.log('Audio play failed:', e));
}

// Window controls (Tauri only)
export async function hideWindow(): Promise<void> {
  const isTauri = await loadTauriApis();
  if (isTauri && windowApi) {
    try {
      const window = windowApi.getCurrentWindow();
      await window.hide();
    } catch (error) {
      console.error('Failed to hide window:', error);
    }
  }
}

export async function showWindow(): Promise<void> {
  const isTauri = await loadTauriApis();
  if (isTauri && windowApi) {
    try {
      const window = windowApi.getCurrentWindow();
      await window.show();
      await window.setFocus();
    } catch (error) {
      console.error('Failed to show window:', error);
    }
  }
}

export async function toggleWindow(): Promise<void> {
  const isTauri = await loadTauriApis();
  if (isTauri && windowApi) {
    try {
      const window = windowApi.getCurrentWindow();
      const visible = await window.isVisible();
      if (visible) {
        await window.hide();
      } else {
        await window.show();
        await window.setFocus();
      }
    } catch (error) {
      console.error('Failed to toggle window:', error);
    }
  }
}

// Start dragging the window (for frameless window)
export async function startDragging(): Promise<void> {
  const isTauri = await loadTauriApis();
  if (isTauri && windowApi) {
    try {
      const window = windowApi.getCurrentWindow();
      await window.startDragging();
    } catch (error) {
      console.error('Failed to start dragging:', error);
    }
  }
}
