import { VisitorLog } from '@/types';

const VISITOR_STORAGE_KEY = 'trabaf_visitor_logs_v1';
const CACHED_IP_KEY = 'trabaf_cached_ip_info';

interface IpInfo {
  ip: string;
  city?: string;
  country?: string;
}

let cachedIpPromise: Promise<IpInfo> | null = null;

// Helper to parse device info from user agent
function detectDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
    if (/ipad|tablet/i.test(ua)) return 'Tablette';
    return 'Mobile';
  }
  return 'Ordinateur Desktop';
}

// Fetch current visitor IP and basic geo location via free API
export async function getVisitorIpInfo(): Promise<IpInfo> {
  if (typeof window === 'undefined') {
    return { ip: '127.0.0.1', city: 'Tunis', country: 'Tunisie' };
  }

  // Check cached info in sessionStorage
  try {
    const cached = sessionStorage.getItem(CACHED_IP_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore
  }

  if (cachedIpPromise) return cachedIpPromise;

  cachedIpPromise = (async () => {
    try {
      // Primary: ipapi.co (provides IP + City + Country)
      const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const info: IpInfo = {
          ip: data.ip || 'Inconnu',
          city: data.city || 'Tunis',
          country: data.country_name || 'Tunisie'
        };
        try { sessionStorage.setItem(CACHED_IP_KEY, JSON.stringify(info)); } catch {}
        return info;
      }
    } catch {
      // Fallback 1: ipify.org
      try {
        const res2 = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
        if (res2.ok) {
          const data2 = await res2.json();
          const info2: IpInfo = { ip: data2.ip || '197.30.12.84', city: 'Tunis', country: 'Tunisie' };
          try { sessionStorage.setItem(CACHED_IP_KEY, JSON.stringify(info2)); } catch {}
          return info2;
        }
      } catch {
        // Fallback 2: default
      }
    }

    const fallbackInfo: IpInfo = { ip: '197.30.12.84', city: 'Tunis', country: 'Tunisie' };
    return fallbackInfo;
  })();

  return cachedIpPromise;
}

// Get raw visitor logs from localStorage
export function getVisitorLogs(): VisitorLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(VISITOR_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Track a visitor page view
export async function trackVisit(pagePath: string): Promise<VisitorLog | null> {
  if (typeof window === 'undefined') return null;

  try {
    const info = await getVisitorIpInfo();
    const userAgent = navigator.userAgent || '';
    const device = detectDevice(userAgent);

    const logs = getVisitorLogs();
    const newLog: VisitorLog = {
      id: 'visit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      ip: info.ip,
      city: info.city,
      country: info.country,
      device: device,
      page: pagePath,
      timestamp: new Date().toISOString(),
      user_agent: userAgent
    };

    // Keep up to 200 most recent visits
    const updated = [newLog, ...logs].slice(0, 200);
    localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('trabaf_storage_updated'));
    return newLog;
  } catch (err) {
    console.error('Failed to track visit:', err);
    return null;
  }
}

// Get visitor statistics
export function getVisitorStats() {
  const logs = getVisitorLogs();
  const totalVisits = logs.length;

  const uniqueIps = Array.from(new Set(logs.map(l => l.ip)));
  const uniqueIpCount = uniqueIps.length;

  const recentVisitors = logs.slice(0, 20);

  return {
    totalVisits,
    uniqueIpCount,
    uniqueIps,
    recentVisitors
  };
}

// Clear logs
export function clearVisitorLogs(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(VISITOR_STORAGE_KEY);
  window.dispatchEvent(new Event('trabaf_storage_updated'));
}
