import Icon from '@admin/components/wrappers/Icon';
import { useRef } from 'react';
import { Button, Card, CardBody, CardHeader, CardTitle, Col, FormControl, Row } from 'react-bootstrap';
import { useCopyToClipboard } from 'usehooks-ts';
const Clipboard = () => {
  const [copiedText, copy] = useCopyToClipboard();
  const inputRef = useRef(null);
  const textareaRef = useRef(null);
  const cutToClipboard = async inputRef => {
    const el = inputRef.current;
    if (el) {
      const success = await copy(el.value);
      if (success) {
        el.value = '';
      }
    }
  };
  return <Card title="Examples">
      <CardHeader>
        <CardTitle as="h4">Examples</CardTitle>
      </CardHeader>
      <CardBody>
        <Row className="g-3">
          <Col xl={6}>
            <div className="border border-light rounded p-3 h-100">
              <h5 className="mb-1">Copy from Element</h5>

              <p className="text-primary fw-bold" id="copytext">
                Click the button to copy this promotional text.
              </p>
              <Button variant="primary" size="sm" onClick={() => copy('Click the button to copy this promotional text.')}>
                <Icon icon="copy" className="me-1" /> {copiedText ? 'Copied' : ' Copy Text'}
              </Button>
            </div>
          </Col>
          <Col xl={6}>
            <div className="border border-light rounded p-3 h-100">
              <h5 className="mb-1">Copy from Element</h5>

              <p className="text-primary fw-bold" id="copytext">
                Click the button to copy this promotional text.
              </p>
              <Button variant="primary" size="sm" onClick={() => copy('Click the button to copy this promotional text.')}>
                <Icon icon="copy" className="me-1" /> {copiedText ? 'Copied' : ' Copy Text'}
              </Button>
            </div>
          </Col>
          <Col xl={6}>
            <div className="border border-light rounded p-3 h-100">
              <h5 className="mb-1">Cut from Input</h5>

              <p className="text-muted mb-2" id="copytext">
                This cuts the value from a single-line input field.
              </p>
              <FormControl type="text" ref={inputRef} defaultValue="Temporary token: 8GDF-393K-L99Z" />
              <Button variant="danger" size="sm" className="mt-2" onClick={() => cutToClipboard(inputRef)}>
                <Icon icon="cut" className="me-1" /> Cut Token
              </Button>
            </div>
          </Col>
          <Col xl={6}>
            <div className="border border-light rounded p-3 h-100">
              <h5 className="mb-1">Cut from Textarea</h5>

              <p className="text-muted mb-2" id="copytext">
                This cuts the value from a textarea field.
              </p>
              <textarea className="form-control" ref={textareaRef} defaultValue="This content will be cut and removed from this textarea." />
              <Button variant="danger" size="sm" className="mt-2" onClick={() => cutToClipboard(textareaRef)}>
                <Icon icon="cut" className="me-1" /> Cut Token
              </Button>
            </div>
          </Col>
        </Row>
      </CardBody>
    </Card>;
};
export default Clipboard;