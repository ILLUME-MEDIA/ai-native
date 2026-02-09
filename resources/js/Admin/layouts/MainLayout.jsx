import { useLayoutContext } from '@admin/context/useLayoutContext';
import HorizontalLayout from '@admin/layouts/HorizontalLayout';
import VerticalLayout from '@admin/layouts/VerticalLayout';
import { Outlet } from 'react-router';
const MainLayout = () => {
  const {
    orientation
  } = useLayoutContext();
  return <>
      {orientation === 'vertical' && <VerticalLayout><Outlet /></VerticalLayout>}
      {orientation === 'horizontal' && <HorizontalLayout><Outlet /></HorizontalLayout>}
    </>;
};
export default MainLayout;