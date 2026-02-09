import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Modal, Form, Badge } from 'react-bootstrap';
import axios from 'axios';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';

const Skills = () => {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editSkill, setEditSkill] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        instructions: '',
        trigger_keywords: [],
        is_active: true,
        priority: 0
    });

    useEffect(() => {
        fetchSkills();
    }, []);

    const fetchSkills = async () => {
        try {
            const response = await axios.get('/api/ai/skills');
            setSkills(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching skills:', error);
            setLoading(false);
        }
    };

    const handleOpenModal = async (skill = null) => {
        if (skill) {
            setShowModal(true);
            try {
                const { data: full } = await axios.get(`/api/ai/skills/${skill.id}`);
                setEditSkill(full);
                setFormData({
                    name: full.name,
                    description: full.description || '',
                    instructions: full.instructions || '',
                    trigger_keywords: full.trigger_keywords || [],
                    is_active: full.is_active,
                    priority: full.priority ?? 0
                });
            } catch (e) {
                console.error(e);
                setEditSkill(skill);
                setFormData({
                    name: skill.name,
                    description: skill.description || '',
                    instructions: '',
                    trigger_keywords: [],
                    is_active: skill.is_active,
                    priority: skill.priority ?? 0
                });
            }
        } else {
            setEditSkill(null);
            setFormData({
                name: '',
                description: '',
                instructions: '',
                trigger_keywords: [],
                is_active: true,
                priority: 0
            });
            setShowModal(true);
        }
    };

    const handleCloseModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editSkill) {
                await axios.patch(`/api/ai/skills/${editSkill.id}`, formData);
            } else {
                await axios.post('/api/ai/skills', formData);
            }
            fetchSkills();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving skill:', error);
            alert('Failed to save skill');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this skill?')) {
            try {
                await axios.delete(`/api/ai/skills/${id}`);
                fetchSkills();
            } catch (error) {
                console.error('Error deleting skill:', error);
            }
        }
    };

    return (
        <>
            <PageBreadcrumb title="AI Skills (Dynamic Protocols)" subtitle="Global AI System" />
            <Row>
                <Col xs={12}>
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <Card.Title as="h5">Skills List</Card.Title>
                            <Button variant="primary" size="sm" onClick={() => handleOpenModal()}>
                                Create Skill
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive className="table-centered table-nowrap mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Name</th>
                                        <th>Description</th>
                                        <th>Triggers</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {skills.map((skill) => (
                                        <tr key={skill.id}>
                                            <td><strong>{skill.name}</strong></td>
                                            <td>{skill.description}</td>
                                            <td>
                                                {(skill.trigger_keywords || []).map((key, i) => (
                                                    <Badge key={i} bg="soft-info" className="text-info me-1">{key}</Badge>
                                                ))}
                                                {(skill.trigger_keywords || []).length === 0 && <span className="text-muted small">Global</span>}
                                            </td>
                                            <td>
                                                {skill.is_active ? <Badge bg="success">Active</Badge> : <Badge bg="danger">Inactive</Badge>}
                                            </td>
                                            <td>
                                                <Button variant="soft-info" size="sm" className="me-1" onClick={() => handleOpenModal(skill)}>
                                                    <Icon icon="edit" className="icon-xs" />
                                                </Button>
                                                <Button variant="soft-danger" size="sm" onClick={() => handleDelete(skill.id)}>
                                                    <Icon icon="trash" className="icon-xs" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editSkill ? 'Edit' : 'Create'} AI Skill</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Skill Name</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Short Description</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Instructions (Prompt Injection)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={5}
                                required
                                value={formData.instructions}
                                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Trigger Keywords (Internal logic - comma separated)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g. youtube, sync, fetch"
                                value={formData.trigger_keywords.join(', ')}
                                onChange={(e) => setFormData({ ...formData, trigger_keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k !== '') })}
                            />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Priority</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3 mt-4">
                                    <Form.Check
                                        type="switch"
                                        label="Is Active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="text-end">
                            <Button variant="secondary" className="me-1" onClick={handleCloseModal}>Cancel</Button>
                            <Button variant="primary" type="submit">{editSkill ? 'Update' : 'Create'} Skill</Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default Skills;
