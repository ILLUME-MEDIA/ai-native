import small1 from '@admin/assets/images/stock/small-1.jpg';
import { useRef, useState } from 'react';
import { Button, Card, CardBody, CardHeader, Col, FormLabel, FormSelect, Row } from 'react-bootstrap';
import { Cropper } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
const FormCropper = () => {
  const cropperRef = useRef(null);
  const fileInputRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(small1.src);
  const [croppedImage, setCroppedImage] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(NaN);
  const onSelectFile = e => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result);
      reader.readAsDataURL(file);
    }
  };
  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const canvas = cropper.getCroppedCanvas();
      const croppedDataUrl = canvas.toDataURL();
      setCroppedImage(croppedDataUrl);
    }
  };
  const handleDownload = () => {
    if (!croppedImage) return;
    const link = document.createElement('a');
    link.href = croppedImage;
    link.download = 'cropped.png';
    link.click();
  };
  const handleClear = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setImageSrc(small1.src);
    setCroppedImage(null);
  };
  return <Card className="shadow-sm">
      <CardHeader className="d-flex align-items-center gap-2">
        <h5 className="mb-0">Upload &amp; Crop Image</h5>
        <span className="ms-auto small text-muted">Default demo image is used until user uploads.</span>
      </CardHeader>
      <CardBody>
        <Row className="g-3 align-items-end">
          <Col lg={8}>
            <FormLabel>Choose an image</FormLabel>
            <input ref={fileInputRef} type="file" id="fileInput" accept="image/*" className="form-control" onChange={onSelectFile} />
          </Col>
          <Col lg={4} className="d-grid gap-2">
            <Button variant="outline-secondary" onClick={() => setImageSrc(small1.src)} id="useDemoBtn">
              Use Demo Image
            </Button>
            <Button variant="outline-light" onClick={handleClear} id="clearInputBtn" className="border">
              Clear File Input
            </Button>
          </Col>
        </Row>

        <Row className="g-4 mt-1">
          <Col lg={8}>
            <div className="ratio ratio-4x3 bg-white border rounded overflow-hidden">
              <Cropper src={imageSrc} initialAspectRatio={16 / 9} aspectRatio={aspectRatio} guides={true} ref={cropperRef} preview=".cropper-img-preview" viewMode={1} background={false} responsive={true} autoCropArea={1} checkOrientation={false} />
            </div>
          </Col>

          <Col lg={4}>
            <div className="d-flex flex-wrap gap-2">
              <Button variant="outline-primary" onClick={() => cropperRef.current?.cropper.zoom(0.1)}>
                Zoom In
              </Button>
              <Button variant="outline-primary" onClick={() => cropperRef.current?.cropper.zoom(-0.1)}>
                Zoom Out
              </Button>
              <Button variant="outline-primary" onClick={() => cropperRef.current?.cropper.rotate(-45)}>
                Rotate -45°
              </Button>
              <Button variant="outline-primary" onClick={() => cropperRef.current?.cropper.rotate(45)}>
                Rotate +45°
              </Button>
              <Button variant="outline-secondary" onClick={() => cropperRef.current?.cropper.reset()}>
                Reset
              </Button>
              <div className="ms-auto d-flex align-items-center gap-2">
                <FormLabel className="mb-0">Aspect:</FormLabel>
                <FormSelect id="aspect" className="form-select-sm" style={{
                width: 'auto'
              }} onChange={e => setAspectRatio(e.target.value === 'NaN' ? undefined : eval(e.target.value))}>
                  <option value="NaN" defaultValue="NaN">
                    Free
                  </option>
                  <option value={1}>1:1</option>
                  <option value="16/9">16:9</option>
                  <option value="4/3">4:3</option>
                  <option value="3/4">3:4</option>
                </FormSelect>
              </div>
            </div>
            <p className="fw-semibold mt-4">Live Preview</p>
            <div className="cropper-img-preview border rounded" style={{
            width: '160px',
            height: '100px',
            overflow: 'hidden'
          }} />
            <div className="mt-4">
              <p className="fw-semibold mb-2">Cropped Output</p>
              {croppedImage ? <img id="croppedResult" className="img-thumbnail" src={croppedImage} alt="Cropped result" width={389} height={200} /> : <img id="croppedResult" className="img-thumbnail" src={small1} alt="Default demo image" width={389} height={200} />}
            </div>
            <div className="mt-4 d-grid gap-2">
              <Button variant="primary" onClick={handleCrop}>
                Crop &amp; Preview
              </Button>
              <Button variant="outline-secondary" id="downloadBtn" onClick={handleDownload} className={` ${croppedImage ? '' : 'disabled'}`}>
                Download Cropped
              </Button>
            </div>
          </Col>
        </Row>
      </CardBody>
    </Card>;
};
export default FormCropper;