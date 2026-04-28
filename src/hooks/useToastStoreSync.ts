// hooks/useToastStoreSync.ts
import { useEffect } from 'react';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';
import { useToastStore } from '../store/toastStore';

export const useToastStoreSync = () => {
  const setToastHandler = usePurchaseOrderStore((state) => state.setToastHandler);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    setToastHandler(showToast);
  }, [setToastHandler, showToast]);
};