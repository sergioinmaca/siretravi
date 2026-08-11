import { useEffect } from 'react';

export function useModalBackLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    let pushCount = 0;
    window.history.pushState(null, '', window.location.href);
    pushCount += 1;

    const handlePop = () => {
      window.history.pushState(null, '', window.location.href);
      pushCount += 1;
    };

    window.addEventListener('popstate', handlePop);

    return () => {
      window.removeEventListener('popstate', handlePop);
      if (pushCount > 0) {
        window.history.go(-pushCount);
      }
    };
  }, [isOpen]);
}
