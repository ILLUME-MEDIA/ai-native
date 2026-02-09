import FlagDe from "@admin/assets/images/flags/de.svg";
import FlagEs from "@admin/assets/images/flags/es.svg";
import FlagIn from "@admin/assets/images/flags/in.svg";
import FlagIt from "@admin/assets/images/flags/it.svg";
import FlagRu from "@admin/assets/images/flags/ru.svg";
import FlagUs from "@admin/assets/images/flags/us.svg";
import FlagSa from "@admin/assets/images/flags/sa.svg";
import { useState } from "react";
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from "react-bootstrap";
const languages = [{
  code: "EN",
  name: "English",
  flag: FlagUs
}, {
  code: "DE",
  name: "Deutsch",
  flag: FlagDe
}, {
  code: "IT",
  name: "Italiano",
  flag: FlagIt
}, {
  code: "ES",
  name: "Español",
  flag: FlagEs
}, {
  code: "RU",
  name: "Русский",
  flag: FlagRu
}, {
  code: "HI",
  name: "हिन्दी",
  flag: FlagIn
}, {
  code: "SA",
  name: "عربي",
  flag: FlagSa
}];
const LanguageDropdown = () => {
  const [selected, setSelected] = useState(languages[0]);
  return <div id="language-selector-rounded" className="topbar-item">
      <Dropdown>
        <DropdownToggle className="topbar-link fw-bold drop-arrow-none" type="button" aria-haspopup="false" aria-expanded="false">
          <img src={selected.flag} alt={selected.name} className="rounded-circle me-2" height={18} id="selected-language-image" />
          <span id="selected-language-code">{selected.code}</span>
        </DropdownToggle>
        <DropdownMenu align="end">
          {languages.map(lang => <DropdownItem key={lang.code} href="#" onClick={() => setSelected(lang)} title={lang.name}>
              <img src={lang.flag} alt={lang.name} className="me-1 rounded-circle" height={18} />
              <span className="align-middle">{lang.name}</span>
            </DropdownItem>)}
        </DropdownMenu>
      </Dropdown>
    </div>;
};
export default LanguageDropdown;