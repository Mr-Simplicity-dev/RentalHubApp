import React, { useCallback, useMemo, useState } from 'react';
import NativePaystackCardModal from '../components/payments/NativePaystackCardModal';

const EMPTY_CHECKOUT = {
  visible: false,
  transaction: null,
  title: '',
  subtitle: '',
  amountLabel: '',
  onSuccess: null,
  onBrowserFallback: null,
};

const useNativePaystackCheckout = () => {
  const [checkout, setCheckout] = useState(EMPTY_CHECKOUT);

  const closeNativeCheckout = useCallback(() => {
    setCheckout(EMPTY_CHECKOUT);
  }, []);

  const openNativeCheckout = useCallback((options = {}) => {
    setCheckout({
      ...EMPTY_CHECKOUT,
      ...options,
      visible: true,
    });
  }, []);

  const handleSuccess = useCallback(
    async (response) => {
      const activeCheckout = checkout;
      setCheckout(EMPTY_CHECKOUT);
      await activeCheckout.onSuccess?.(response, activeCheckout);
    },
    [checkout]
  );

  const handleBrowserFallback = useCallback(async () => {
    const activeCheckout = checkout;
    setCheckout(EMPTY_CHECKOUT);
    await activeCheckout.onBrowserFallback?.(activeCheckout);
  }, [checkout]);

  const NativePaystackCheckoutModal = useMemo(
    () => (
      <NativePaystackCardModal
        visible={checkout.visible}
        transaction={checkout.transaction}
        title={checkout.title}
        subtitle={checkout.subtitle}
        amountLabel={checkout.amountLabel}
        onCancel={closeNativeCheckout}
        onBrowserFallback={handleBrowserFallback}
        onSuccess={handleSuccess}
      />
    ),
    [checkout, closeNativeCheckout, handleBrowserFallback, handleSuccess]
  );

  return {
    checkout,
    closeNativeCheckout,
    openNativeCheckout,
    NativePaystackCheckoutModal,
  };
};

export default useNativePaystackCheckout;
