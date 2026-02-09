import defaultImg from '@admin/assets/images/layouts/skin-default.png';
import elegantImg from '@admin/assets/images/layouts/skin-elegant.png';
import flatImg from '@admin/assets/images/layouts/skin-flat.png';
import galaxyImg from '@admin/assets/images/layouts/skin-galaxy.png';
import luxeImg from '@admin/assets/images/layouts/skin-luxe.png';
import materialImg from '@admin/assets/images/layouts/skin-material.png';
import matrixImg from '@admin/assets/images/layouts/skin-matrix.png';
import minimalImg from '@admin/assets/images/layouts/skin-minimal.png';
import modernImg from '@admin/assets/images/layouts/skin-modern.png';
import monoImg from '@admin/assets/images/layouts/skin-mono.png';
import neoImg from '@admin/assets/images/layouts/skin-neo.png';
import neonImg from '@admin/assets/images/layouts/skin-neon.png';
import novaImg from '@admin/assets/images/layouts/skin-nova.png';
import pixelImg from '@admin/assets/images/layouts/skin-pixel.png';
import prismImg from '@admin/assets/images/layouts/skin-prism.png';
import retroImg from '@admin/assets/images/layouts/skin-retro.png';
import saasImg from '@admin/assets/images/layouts/skin-saas.png';
import silverImg from '@admin/assets/images/layouts/skin-silver.png';
import softImg from '@admin/assets/images/layouts/skin-soft.png';
import vividImg from '@admin/assets/images/layouts/skin-vivid.png';
import orbitImg from '@admin/assets/images/layouts/skin-orbit.png';
import crystalImg from '@admin/assets/images/layouts/skin-crystal.png';
import auroraImg from '@admin/assets/images/layouts/skin-aurora.png';
import xenonImg from '@admin/assets/images/layouts/skin-xenon.png';
import zenImg from '@admin/assets/images/layouts/skin-zen.png';
import { useLayoutContext } from '@admin/context/useLayoutContext';
import { toTitleCase } from '@admin/utils/helpers';
const skinOptions = [{
  value: 'default',
  image: defaultImg
}, {
  value: 'minimal',
  image: minimalImg
}, {
  value: 'modern',
  image: modernImg
}, {
  value: 'material',
  image: materialImg
}, {
  value: 'saas',
  image: saasImg
}, {
  value: 'flat',
  image: flatImg
}, {
  value: 'galaxy',
  image: galaxyImg
}, {
  value: 'luxe',
  image: luxeImg
}, {
  value: 'retro',
  image: retroImg
}, {
  value: 'neon',
  image: neonImg
}, {
  value: 'pixel',
  image: pixelImg
}, {
  value: 'soft',
  image: softImg
}, {
  value: 'mono',
  image: monoImg
}, {
  value: 'prism',
  image: prismImg
}, {
  value: 'nova',
  image: novaImg
}, {
  value: 'zen',
  image: zenImg
}, {
  value: 'elegant',
  image: elegantImg
}, {
  value: 'vivid',
  image: vividImg
}, {
  value: 'aurora',
  image: auroraImg
}, {
  value: 'crystal',
  image: crystalImg
}, {
  value: 'matrix',
  image: matrixImg
}, {
  value: 'orbit',
  image: orbitImg
}, {
  value: 'neo',
  image: neoImg
}, {
  value: 'silver',
  image: silverImg
}, {
  value: 'xenon',
  image: xenonImg
}];
const Skin = () => {
  const {
    updateSettings,
    skin
  } = useLayoutContext();
  const handleSkinChange = value => {
    updateSettings({
      skin: value
    });
  };
  return <div id="skin" className="p-3 border-bottom border-dashed">
      <h5 className="mb-3 fw-bold">Select Theme</h5>
      <div className="row g-3">
        {skinOptions.map(item => <div className="col-6" id={`skin-${item.value}`} key={item.value}>
            <div className="form-check card-radio">
              <input className="form-check-input" type="radio" name="data-skin" id={`demo-skin-${item.value}`} checked={skin === item.value} onChange={() => handleSkinChange(item.value)} />
              <label className="form-check-label p-0 w-100" htmlFor={`demo-skin-${item.value}`}>
                <img src={item.image} alt="layout-img" className="img-fluid" />
              </label>
            </div>
            <h5 className="text-center text-muted mt-2 mb-0">{toTitleCase(item.value)}</h5>
          </div>)}
      </div>
    </div>;
};
export default Skin;