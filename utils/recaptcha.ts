// Google reCAPTCHA v3 helper
// Site key will be added to environment variables

export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Test key

export const loadRecaptcha = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }

    // Check if already loaded
    if ((window as any).grecaptcha) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Wait for grecaptcha to be ready
      const checkReady = setInterval(() => {
        if ((window as any).grecaptcha && (window as any).grecaptcha.ready) {
          clearInterval(checkReady);
          (window as any).grecaptcha.ready(() => {
            resolve();
          });
        }
      }, 100);
    };

    script.onerror = () => {
      reject(new Error('Failed to load reCAPTCHA'));
    };

    document.head.appendChild(script);
  });
};

export const executeRecaptcha = async (action: string): Promise<string> => {
  try {
    await loadRecaptcha();
    
    return new Promise((resolve, reject) => {
      (window as any).grecaptcha.ready(() => {
        (window as any).grecaptcha
          .execute(RECAPTCHA_SITE_KEY, { action })
          .then((token: string) => {
            resolve(token);
          })
          .catch((error: any) => {
            reject(error);
          });
      });
    });
  } catch (error) {
    console.error('reCAPTCHA error:', error);
    throw error;
  }
};
