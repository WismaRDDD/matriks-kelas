'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AUTH_REDIRECT_FLAG = '__matriks_kelas_auth_redirect__';

function getRequestPath(input) {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (input && typeof input.url === 'string') {
    return input.url;
  }

  return '';
}

function isProtectedApiRequest(requestPath) {
  if (!requestPath) {
    return false;
  }

  try {
    const url = requestPath.startsWith('http')
      ? new URL(requestPath)
      : new URL(requestPath, window.location.origin);

    return url.origin === window.location.origin
      && url.pathname.startsWith('/api/')
      && !url.pathname.startsWith('/api/auth/');
  } catch {
    return false;
  }
}

export default function AuthRedirectOnUnauthorized() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const requestPath = getRequestPath(input);

      if (response.status !== 401 || !isProtectedApiRequest(requestPath)) {
        return response;
      }

      if (!window[AUTH_REDIRECT_FLAG]) {
        window[AUTH_REDIRECT_FLAG] = true;
        router.replace('/login');
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
      window[AUTH_REDIRECT_FLAG] = false;
    };
  }, [router]);

  return null;
}