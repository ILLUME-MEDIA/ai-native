import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, CardHeader, CardFooter, FormControl, Button, Badge, Spinner, Form } from 'react-bootstrap';
import axios from 'axios';
import { SimpleBar } from '@admin/components/wrappers/SimpleBar';
import Icon from '@admin/components/wrappers/Icon';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';

const Chat = () => {
    const [messages, setMessages] = useState([
        {
            id: 'init',
            sender: 'ai',
            text: 'Hello! I am your Global AI Assistant. How can I help you today?',
            type: 'text',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [endpoints, setEndpoints] = useState([]);
    const [selectedEndpoint, setSelectedEndpoint] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [availableModels, setAvailableModels] = useState([]);

    const [currentModelInfo, setCurrentModelInfo] = useState({
        model: 'Detecting...',
        mode: 'AUTO'
    });
    const scrollRef = useRef(null);

    useEffect(() => {
        fetchEndpoints();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            const scrollElement = scrollRef.current.getScrollElement();
            scrollElement.scrollTop = scrollElement.scrollHeight;
        }
    }, [messages]);

    const fetchEndpoints = async () => {
        try {
            const response = await axios.get('/api/ai/endpoints');
            const activeEndpoints = response.data.filter(e => e.is_active);
            setEndpoints(activeEndpoints);
        } catch (error) {
            console.error('Error fetching endpoints:', error);
        }
    };

    const handleEndpointChange = (endpointId) => {
        setSelectedEndpoint(endpointId);
        setSelectedModel(''); // Reset model when endpoint changes

        if (!endpointId) {
            setAvailableModels([]);
            return;
        }

        const endpoint = endpoints.find(e => e.id == endpointId);
        if (endpoint && endpoint.metadata && endpoint.metadata.available_models) {
            setAvailableModels(endpoint.metadata.available_models);
            // If endpoint has a default model, pre-select it or keep AUTO
            if (endpoint.default_model) {
                // optional: setSelectedModel(endpoint.default_model);
            }
        } else {
            setAvailableModels([]);
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || loading) return;

        const userMsg = {
            id: Date.now().toString(),
            sender: 'user',
            text: inputText,
            type: 'text',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setLoading(true);

        try {
            const payload = {
                message: inputText,
                endpoint_id: selectedEndpoint || null,
                model: selectedModel || null
            };

            const response = await axios.post('/api/ai/chat', payload);

            // Access response data safely
            const logData = response.data.log || response.data; // Fallback for direct result

            // Handle system messages if model switched
            if (logData && logData.model && logData.model !== currentModelInfo?.model) {
                const systemMsg = {
                    id: 'sys-' + Date.now(),
                    sender: 'system',
                    text: `System: Switched to model ${logData.model} (${logData.provider || 'AI'})`,
                    type: 'system',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                setMessages(prev => [...prev, systemMsg]);
            }

            setCurrentModelInfo({
                model: logData.model || 'Unknown',
                mode: selectedEndpoint ? 'MANUAL' : 'AUTO',
                provider: logData.provider || 'AI'
            });

            const aiMsg = {
                id: 'ai-' + Date.now(),
                sender: 'ai',
                text: response.data.response || response.data.text || 'No response received.',
                type: 'text',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to get response from AI. Please check endpoints.';
            const errorMsg = {
                id: 'err-' + Date.now(),
                sender: 'system',
                text: `Error: ${errorMessage}`,
                type: 'error',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageBreadcrumb title="AI Chat" subtitle="Global AI System" />
            <div className="d-flex justify-content-center" style={{ height: 'calc(100vh - 200px)' }}>
                <Card className="h-100 mb-0 shadow-lg flex-grow-1 position-relative" style={{ maxWidth: '1000px' }}>
                    <CardHeader className="card-bg d-flex justify-content-between align-items-center px-4 py-3 border-bottom border-light">
                        <div className="d-flex align-items-center gap-3">
                            <span className="avatar avatar-md">
                                <span className="avatar-title text-bg-warning fw-bold rounded-circle shadow-sm">AI</span>
                            </span>
                            <div>
                                <h4 className="mb-0">Global AI Assistant</h4>
                                {currentModelInfo && (
                                    <p className="mb-0 fs-xs text-muted">
                                        <Icon icon="cpu" className="me-1" />
                                        Model: <span className="text-info fw-semibold">{currentModelInfo.model}</span> |
                                        <Badge bg={currentModelInfo.mode === 'AUTO' ? 'success' : 'info'} className="ms-2 shadow-sm">
                                            {currentModelInfo.mode}
                                        </Badge>
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                            <Form.Select
                                size="sm"
                                className="w-auto border-0 bg-light-subtle"
                                value={selectedEndpoint}
                                onChange={(e) => handleEndpointChange(e.target.value)}
                                style={{ fontSize: '0.8rem' }}
                            >
                                <option value="">Auto Provider</option>
                                {endpoints.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </Form.Select>

                            {selectedEndpoint && (
                                <Form.Select
                                    size="sm"
                                    className="w-auto border-0 bg-light-subtle"
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    style={{ fontSize: '0.8rem' }}
                                >
                                    <option value="">Auto Model</option>
                                    {availableModels.map((m, idx) => <option key={`${m}-${idx}`} value={m}>{m}</option>)}
                                </Form.Select>
                            )}

                            <div className="vr mx-1"></div>

                            <Button variant="soft-danger" size="sm" onClick={() => setMessages([messages[0]])} title="Clear Conversation">
                                <Icon icon="trash" className="icon-sm" />
                            </Button>
                        </div>
                    </CardHeader>

                    <SimpleBar
                        className="card-body px-4 py-4 mb-5"
                        style={{ maxHeight: 'calc(100% - 140px)' }}
                        ref={scrollRef}
                    >
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`d-flex align-items-start gap-3 my-4 ${msg.sender === 'user' ? 'justify-content-end' : ''}`}>
                                {msg.sender === 'ai' && (
                                    <span className="avatar avatar-sm flex-shrink-0">
                                        <span className="avatar-title text-bg-warning fw-bold rounded-circle">AI</span>
                                    </span>
                                )}
                                <div style={{ maxWidth: '80%' }} className={msg.sender === 'user' ? 'text-end' : ''}>
                                    {msg.type === 'system' ? (
                                        <div className="bg-light-subtle text-muted fs-xs py-1 px-3 rounded-pill mb-1 border italic text-center">
                                            {msg.text}
                                        </div>
                                    ) : msg.type === 'error' ? (
                                        <div className="bg-danger-subtle text-danger py-2 px-4 rounded-3 mb-1 border border-danger-subtle shadow-sm">
                                            {msg.text}
                                        </div>
                                    ) : (
                                        <div className={`py-3 px-4 rounded-4 mb-1 shadow-sm fs-base ${msg.sender === 'user' ? 'bg-primary text-white text-start' : 'bg-white border text-dark'}`} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                            {msg.text}
                                        </div>
                                    )}
                                    <div className="text-muted d-flex align-items-center gap-1 fs-xs mt-1 px-1 justify-content-inherit">
                                        <Icon icon="clock" className="icon-xs" /> {msg.timestamp}
                                    </div>
                                </div>
                                {msg.sender === 'user' && (
                                    <span className="avatar avatar-sm flex-shrink-0">
                                        <span className="avatar-title text-bg-info fw-bold rounded-circle">ME</span>
                                    </span>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="d-flex align-items-start gap-3 my-4">
                                <span className="avatar avatar-sm flex-shrink-0 pulse">
                                    <span className="avatar-title text-bg-warning fw-bold rounded-circle">AI</span>
                                </span>
                                <div className="bg-white border py-3 px-4 rounded-4 shadow-sm">
                                    <Spinner animation="grow" size="sm" className="me-2 text-warning" />
                                    AI is processing...
                                </div>
                            </div>
                        )}
                    </SimpleBar>

                    <CardFooter className="bg-white border-top border-light position-absolute bottom-0 w-100 p-3 pt-0">
                        <Form onSubmit={handleSendMessage} className="d-flex gap-3 align-items-center bg-light p-2 rounded-4 border">
                            <FormControl
                                type="text"
                                className="bg-transparent border-0 shadow-none py-2 px-3"
                                placeholder="State your request or ask a question..."
                                style={{ fontSize: '1.05rem' }}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                disabled={loading}
                            />
                            <Button
                                variant="primary"
                                type="submit"
                                className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                style={{ width: '45px', height: '45px', padding: 0 }}
                                disabled={loading || !inputText.trim()}
                            >
                                {loading ? <Spinner animation="border" size="sm" /> : <Icon icon="send-2" style={{ fontSize: '1.5rem' }} />}
                            </Button>
                        </Form>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
};

export default Chat;
