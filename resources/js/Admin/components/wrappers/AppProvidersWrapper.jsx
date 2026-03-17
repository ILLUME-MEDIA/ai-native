import { LayoutProvider } from '@admin/context/useLayoutContext';
import { NotificationProvider } from '@admin/context/useNotificationContext';
import { OffcanvasProvider } from '@admin/context/useOffcanvasContext';
import { InitialPropsProvider } from '@admin/context/InitialPropsContext';
import React from 'react';
const AppProvidersWrapper = ({
  children
}) => {
  return <LayoutProvider>
      <NotificationProvider>
        <OffcanvasProvider>
          <InitialPropsProvider>{children}</InitialPropsProvider>
        </OffcanvasProvider>
      </NotificationProvider>
    </LayoutProvider>;
};
export default AppProvidersWrapper;