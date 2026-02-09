import { useLayoutContext } from '@admin/context/useLayoutContext';
import { toTitleCase } from '@admin/utils/helpers';
import defaultImg from '@admin/assets/images/layouts/sidenav-size-default.png';
import compactImg from '@admin/assets/images/layouts/sidenav-size-compact.png';
import condensedImg from '@admin/assets/images/layouts/sidenav-size-condensed.png';
import onHoverImg from '@admin/assets/images/layouts/sidenav-size-on-hover.png';
import onHoverActiveImg from '@admin/assets/images/layouts/sidenav-size-on-hover-active.png';
import offcanvasImg from '@admin/assets/images/layouts/sidenav-size-offcanvas.png';
const sidenavSizeOptions = [{
  value: 'default',
  image: defaultImg
}, {
  value: 'compact',
  image: compactImg
}, {
  value: 'condensed',
  image: condensedImg
}, {
  value: 'on-hover',
  image: onHoverImg
}, {
  value: 'on-hover-active',
  image: onHoverActiveImg
}, {
  value: 'offcanvas',
  image: offcanvasImg
}];
const SidenavSize = () => {
  const {
    updateSettings,
    sidenavSize
  } = useLayoutContext();
  const handleSidenavSizeChange = value => {
    updateSettings({
      sidenavSize: value
    });
  };
  return <div id="sidenav-size" className="p-3 border-bottom border-dashed">
      <h5 className="mb-3 fw-bold">Sidebar Size</h5>
      <div className="row g-3">
        {sidenavSizeOptions && sidenavSizeOptions.map(option => <div className="col-4" id={`sidenav-size-${option.value}`} key={option.value}>
              <div className="form-check sidebar-setting card-radio">
                <input className="form-check-input" type="radio" name="data-sidenav-size" id={`layout-sidenav-size-${option.value}`} checked={sidenavSize === option.value} onChange={() => handleSidenavSizeChange(option.value)} />
                <label className="form-check-label p-0 w-100" htmlFor={`layout-sidenav-size-${option.value}`}>
                  <img src={option.image} alt="layout-img" className="img-fluid" />
                </label>
              </div>
              <h5 className="mb-0 text-center text-muted mt-2">{toTitleCase(option.value)}</h5>
            </div>)}
      </div>
    </div>;
};
export default SidenavSize;