import Icon from "@admin/components/wrappers/Icon";
import { useLayoutContext } from "@admin/context/useLayoutContext";
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from "react-bootstrap";
const themeDropdownOptions = [{
  value: "light",
  label: "Light",
  icon: "sun"
}, {
  value: "dark",
  label: "Dark",
  icon: "moon"
}, {
  value: "system",
  label: "System",
  icon: "sun-moon"
}];
const ThemeMode = () => {
  const {
    theme,
    updateSettings
  } = useLayoutContext();
  return <div id="theme-dropdown" className="topbar-item">
      <Dropdown align="end">
        <DropdownToggle as="button" className="topbar-link btn shadow-none btn-link drop-arrow-none px-2 fw-medium" id="themeModeDropdown">
          {theme === "light" ? <span className="topbar-link-icon">
              <Icon icon="moon" />
            </span> : <span className="topbar-link-icon">
              <Icon icon="sun" />
            </span>}
        </DropdownToggle>

        <DropdownMenu className="theme-dropdown">
          {themeDropdownOptions.map(option => <DropdownItem as="label" key={option.value} className={theme === option.value ? "active" : ""}>
              <input type="radio" name="data-bs-theme" value={option.value} className="form-check-input d-none" checked={theme === option.value} onChange={() => updateSettings({
            theme: option.value
          })} />
              <Icon icon={option.icon} className="align-middle me-1 fs-16" />
              <span className="align-middle">{option.label}</span>
            </DropdownItem>)}
        </DropdownMenu>
      </Dropdown>
    </div>;
};
export default ThemeMode;