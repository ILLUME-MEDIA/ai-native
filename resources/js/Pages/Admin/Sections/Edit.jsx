import { Link, useForm, usePage } from '@inertiajs/react';
import { Card, CardBody, CardHeader, Col, Form, FormGroup, FormLabel, Row } from 'react-bootstrap';
import PageBreadcrumb from '@/Admin/PageBreadcrumb';
import Icon from '@/Admin/components/wrappers/Icon';

export default function SectionsEdit() {
    const { props } = usePage();
    const { section } = props;

    const { data, setData, put, processing, errors } = useForm({
        name: section?.name ?? '',
        table_name: section?.table_name ?? '',
        slug: section?.slug ?? '',
        mcp_enabled: !!section?.mcp_enabled,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!section) return;
        put(route('admin.sections.update', section.id));
    };

    return (
        <div className="py-4">
            <PageBreadcrumb title="Edit Section" subtitle="Section Builder" />

            <Row className="justify-content-center">
                <Col lg={8}>
                    <Card>
                        <CardHeader className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Edit Section / Table</h5>
                            <Link
                                href={route('admin.sections.index')}
                                className="btn btn-light btn-sm d-inline-flex align-items-center"
                            >
                                <Icon icon="arrow-left" className="me-1" />
                                Back to list
                            </Link>
                        </CardHeader>
                        <CardBody>
                            <Form onSubmit={handleSubmit}>
                                <FormGroup className="mb-3">
                                    <FormLabel>Section Name</FormLabel>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                    />
                                    {errors.name && (
                                        <div className="text-danger mt-1 small">
                                            {errors.name}
                                        </div>
                                    )}
                                </FormGroup>

                                <FormGroup className="mb-3">
                                    <FormLabel>Table Name</FormLabel>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={data.table_name}
                                        onChange={(e) => setData('table_name', e.target.value)}
                                        disabled
                                    />
                                    {errors.table_name && (
                                        <div className="text-danger mt-1 small">
                                            {errors.table_name}
                                        </div>
                                    )}
                                </FormGroup>

                                <FormGroup className="mb-3">
                                    <FormLabel>Slug</FormLabel>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={data.slug}
                                        onChange={(e) => setData('slug', e.target.value)}
                                    />
                                    {errors.slug && (
                                        <div className="text-danger mt-1 small">
                                            {errors.slug}
                                        </div>
                                    )}
                                </FormGroup>

                                <FormGroup className="mb-3 form-check">
                                    <input
                                        id="mcp_enabled"
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={data.mcp_enabled}
                                        onChange={(e) => setData('mcp_enabled', e.target.checked)}
                                    />
                                    <FormLabel
                                        className="form-check-label"
                                        htmlFor="mcp_enabled"
                                    >
                                        Enable MCP / AI access for this table
                                    </FormLabel>
                                </FormGroup>

                                <div className="d-flex justify-content-end gap-2">
                                    <Link
                                        href={route('admin.sections.index')}
                                        className="btn btn-light"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        className="btn btn-primary d-inline-flex align-items-center"
                                        disabled={processing}
                                    >
                                        <Icon icon="device-floppy" className="me-1" />
                                        Update Section
                                    </button>
                                </div>
                            </Form>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

