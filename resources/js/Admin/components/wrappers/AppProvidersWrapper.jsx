import { LayoutProvider } from '@admin/context/useLayoutContext';
import { NotificationProvider } from '@admin/context/useNotificationContext';
import { InitialPropsProvider } from '@admin/context/InitialPropsContext';
import React from 'react';
const AppProvidersWrapper = ({
  children
}) => {
  return <LayoutProvider>
      <NotificationProvider>
        <InitialPropsProvider>{children}</InitialPropsProvider>
      </NotificationProvider>
    </LayoutProvider>;
};
export default AppProvidersWrapper;