import Icon from "@admin/components/wrappers/Icon";
import { useLayoutContext } from "@admin/context/useLayoutContext";
const CustomizerToggler = () => {
  const {
    toggleCustomizer
  } = useLayoutContext();
  return <div className="topbar-item d-none d-sm-flex btn-theme-setting">
    <button className="topbar-link" type="button" onClick={toggleCustomizer}>
      <span className="topbar-link-icon">
        <span>
          <Icon icon="settings" />
        </span>
      </span>
    </button>
  </div>;
};
export default CustomizerToggler;