import Icon from '@admin/components/wrappers/Icon';
import { useLayoutContext } from '@admin/context/useLayoutContext';
const OnHoverToggle = () => {
  const {
    sidenavSize,
    updateSettings
  } = useLayoutContext();
  const handleToggle = () => {
    updateSettings({
      sidenavSize: sidenavSize === 'on-hover-active' ? 'on-hover' : 'on-hover-active'
    });
  };
  return <button className="button-on-hover" onClick={handleToggle}>
      <Icon icon="menu-4" className="fs-22 align-middle" />
    </button>;
};
export default OnHoverToggle;