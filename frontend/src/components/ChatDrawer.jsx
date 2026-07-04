import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Stethoscope, AlertTriangle, ArrowRight, Star, MapPin, Calendar, RotateCcw, Bot, User } from 'lucide-react';
import { apiUrl } from '../utils/api';

const ChatDrawer = ({ isOpen, onClose, onSearchSpecialty, onBook }) => {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your AeroBot AI Symptom Assistant. Describe your symptoms (e.g. 'I have had a throbbing headache and mild fever for 2 days') and I will ask follow-up questions to understand your case, triage severity, and suggest the right specialists and doctors.",
      type: 'welcome'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isRagActive, setIsRagActive] = useState(false);
  const chatEndRef = useRef(null);

  const [triageState, setTriageState] = useState({
    stage: 'initial',
    specialist: '',
    priority: '',
    analysis: '',
    answers: []
  });

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMsg = text.trim();

    const updatedMessages = [...messages, { sender: 'user', text: userMsg }];
    setMessages(updatedMessages);
    setIsLoading(true);
    setSelectedOptions([]);

    try {
      const response = await fetch(apiUrl('/api/ai/chatbot'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: updatedMessages })
      });

      if (!response.ok) {
        throw new Error("Chatbot API returned error status.");
      }

      const data = await response.json();
      setIsRagActive(!!data.isRagUsed);


      setMessages(prev => [...prev, {
        sender: 'ai',
        text: data.text,
        isComplete: data.isComplete,
        options: data.options || [],
        optionsType: data.optionsType || 'single',
        triage: data.isComplete ? {
          analysis: data.triageAnalysis,
          priority: data.priority,
          specialist: data.specialty,
          followUp: data.followUpInstructions
        } : null,
        doctors: data.doctors || []
      }]);

    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: "I encountered an error connecting to the medical AI engine. Please verify your connection or try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const textToSend = inputText;
    setInputText('');
    await sendMessage(textToSend);
  };

  const handleToggleOption = (opt) => {
    const isNone = opt.toLowerCase().includes('none');
    setSelectedOptions(prev => {
      if (isNone) {
        return prev.includes(opt) ? [] : [opt];
      } else {
        const filtered = prev.filter(item => !item.toLowerCase().includes('none'));
        if (filtered.includes(opt)) {
          return filtered.filter(item => item !== opt);
        } else {
          return [...filtered, opt];
        }
      }
    });
  };

  const handleConfirmMultiSelect = () => {
    if (selectedOptions.length === 0) return;
    const textToSend = selectedOptions.join(', ');
    sendMessage(textToSend);
  };

  const resetChat = () => {
    setMessages([
      {
        sender: 'ai',
        text: "Hello! I am your AeroBot AI Symptom Assistant. Describe your symptoms (e.g. 'I have had a throbbing headache and mild fever for 2 days') and I will ask follow-up questions to understand your case, triage severity, and suggest the right specialists and doctors.",
        type: 'welcome'
      }
    ]);
    setSelectedOptions([]);
    setIsRagActive(false);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '430px',
        height: '600px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
        background: '#ffffff',
        borderRadius: '16px'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              background: '#f1f5f9',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e2e8f0'
            }}>
              <Bot style={{ color: '#701557' }} size={18} />
            </div>
            <span
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #ffffff',
                display: 'inline-block'
              }}
            />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', color: '#1f2937', fontWeight: 700, fontFamily: 'Outfit' }}>
              AeroBot AI
            </h3>
            <span
              style={{
                fontSize: '0.65rem',
                color: isRagActive ? '#10b981' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isRagActive ? "Verified Clinical RAG Active" : "Intelligent Diagnostic Mode"}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={resetChat}
            title="Reset Conversation"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '50%',
              transition: 'background 0.2s, color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onClose}
            title="Close Chat"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '50%',
              transition: 'background 0.2s, color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Message Sequence Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f5f3f0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {messages.map((msg, index) => {
          const isAi = msg.sender === 'ai';
          return (
            <div
              key={index}
              style={{
                alignSelf: isAi ? 'flex-start' : 'flex-end',
                maxWidth: '88%',
                display: 'flex',
                gap: '10px',
                flexDirection: isAi ? 'row' : 'row-reverse',
                alignItems: 'flex-start'
              }}
            >
              {/* Avatar circle */}
              <div style={{
                flexShrink: 0,
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isAi ? '#f1f5f9' : '#701557',
                border: isAi ? '1px solid #e2e8f0' : 'none'
              }}>
                {isAi ? (
                  <Bot style={{ color: '#701557' }} size={14} />
                ) : (
                  <User style={{ color: '#ffffff' }} size={12} />
                )}
              </div>

              {/* Message Bubble Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                <div
                  style={{
                    background: isAi ? '#ffffff' : '#701557',
                    color: isAi ? '#1f2937' : '#ffffff',
                    fontWeight: isAi ? 400 : 500,
                    padding: '12px 16px',
                    borderRadius: isAi ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                    fontSize: '0.82rem',
                    lineHeight: '1.5',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  {msg.text}

                  {/* Quick replies options (rendered only on the latest message for single-selects) */}
                  {isAi && msg.options && msg.options.length > 0 && index === messages.length - 1 && msg.optionsType !== 'multi' && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {msg.options.map((option, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => sendMessage(option)}
                          disabled={isLoading}
                          style={{
                            background: 'rgba(112, 21, 87, 0.05)',
                            border: '1px solid rgba(112, 21, 87, 0.25)',
                            borderRadius: '50px',
                            color: '#701557',
                            padding: '6px 14px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#701557';
                            e.target.style.color = '#fff';
                            e.target.style.borderColor = '#701557';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(112, 21, 87, 0.05)';
                            e.target.style.color = '#701557';
                            e.target.style.borderColor = 'rgba(112, 21, 87, 0.25)';
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Triage Results Card */}
                  {isAi && msg.triage && (
                    <div
                      style={{
                        marginTop: '10px',
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        maxWidth: '100%'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: 600 }}>RECOMMENDED TIMELINE:</span>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color:
                              msg.triage.priority === 'High' ? '#b91c1c' :
                              msg.triage.priority === 'Medium' ? '#b45309' : '#047857',
                            background:
                              msg.triage.priority === 'High' ? '#fee2e2' :
                              msg.triage.priority === 'Medium' ? '#fef3c7' : '#d1fae5',
                            border: `1px solid ${
                              msg.triage.priority === 'High' ? '#fca5a5' :
                              msg.triage.priority === 'Medium' ? '#fcd34d' : '#6ee7b7'
                            }`
                          }}
                        >
                          {msg.triage.priority === 'High' ? 'URGENT ATTENTION' :
                           msg.triage.priority === 'Medium' ? 'SCHEDULE APPOINTMENT' :
                           'SELF-CARE / ROUTINE'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#1f2937' }}>
                        <strong>Assessment:</strong> {msg.triage.analysis}
                      </div>

                      {msg.triage.specialist && (
                        <div style={{ fontSize: '0.74rem', color: '#1f2937' }}>
                          <strong>Specialist:</strong> {msg.triage.specialist}
                        </div>
                      )}

                      <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                        <strong>Advice:</strong> {msg.triage.followUp}
                      </div>

                      {/* Quick Skyscanner Trigger Action Link */}
                      {msg.triage.specialist && (
                        <button
                          onClick={() => {
                            onSearchSpecialty(msg.triage.specialist);
                            onClose();
                          }}
                          style={{
                            marginTop: '2px',
                            background: 'rgba(112, 21, 87, 0.05)',
                            border: '1px solid rgba(112, 21, 87, 0.25)',
                            borderRadius: '6px',
                            color: '#701557',
                            padding: '5px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                        >
                          View on interactive map
                          <ArrowRight size={10} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Recommended Doctors Carousel/List */}
                {isAi && msg.doctors && msg.doctors.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', width: '100%' }}>
                    <span style={{ fontSize: '0.7rem', color: '#701557', fontWeight: 600, letterSpacing: '0.05em' }}>
                      RECOMMENDED DOCTORS IN BANGALORE:
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        gap: '10px',
                        overflowX: 'auto',
                        paddingBottom: '8px',
                        width: '100%',
                        scrollbarWidth: 'thin'
                      }}
                    >
                      {msg.doctors.map((doc, docIdx) => (
                        <div
                          key={doc.doctorId || docIdx}
                          style={{
                            flex: '0 0 260px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#000000' }}>
                              {doc.name.startsWith('Dr.') || doc.name.startsWith('Dr ') ? doc.name : `Dr. ${doc.name}`}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                              <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 'bold' }}>
                                {doc.experience || doc.experienceYears || 10} Yrs Exp
                              </span>
                            </div>
                          </div>

                          <span style={{ fontSize: '0.7rem', color: '#000000', fontWeight: 500 }}>
                            {doc.specialty || doc.specialization}
                          </span>
                          {doc.address && (
                            <span style={{ fontSize: '0.68rem', color: '#4b5563', display: 'block', fontStyle: 'italic', wordBreak: 'break-word' }}>
                              {doc.address}
                            </span>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981' }}>
                              Fee: ₹{doc.fee}
                            </span>
                            <button
                              onClick={() => {
                                  if (onBook) {
                                    onBook(doc);
                                    onClose();
                                  } else {
                                    onSearchSpecialty(doc.specialty);
                                    onClose();
                                  }
                                }}
                              style={{
                                background: 'rgba(112, 21, 87, 0.05)',
                                border: '1px solid rgba(112, 21, 87, 0.35)',
                                borderRadius: '6px',
                                color: '#701557',
                                padding: '4px 8px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                  e.target.style.background = '#701557';
                                  e.target.style.color = '#fff';
                                }}
                              onMouseLeave={(e) => {
                                  e.target.style.background = 'rgba(112, 21, 87, 0.05)';
                                  e.target.style.color = '#701557';
                                }}
                            >
                              Book
                              <ArrowRight size={10} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Option choices selection box (rendered only for multi-select checklists) */}
                {isAi && index === messages.length - 1 && !msg.isComplete && msg.options && msg.options.length > 0 && msg.optionsType === 'multi' && !isLoading && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        width: '100%',
                        boxSizing: 'border-box',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Select multiple options:
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {msg.options.map((opt, optIdx) => {
                          const isChecked = selectedOptions.includes(opt);
                          return (
                            <label
                              key={optIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '0.8rem',
                                color: '#374151',
                                cursor: 'pointer',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                background: isChecked ? 'rgba(112, 21, 87, 0.05)' : 'transparent',
                                border: '1px solid ' + (isChecked ? 'rgba(112, 21, 87, 0.25)' : 'transparent'),
                                transition: 'all 0.2s',
                                boxSizing: 'border-box'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleOption(opt)}
                                style={{
                                  accentColor: '#701557',
                                  width: '16px',
                                  height: '16px',
                                  cursor: 'pointer'
                                }}
                              />
                              {opt}
                            </label>
                          );
                        })}
                      </div>
                      <button
                        onClick={handleConfirmMultiSelect}
                        disabled={selectedOptions.length === 0}
                        style={{
                          marginTop: '6px',
                          background: selectedOptions.length === 0 ? '#f3f4f6' : '#701557',
                          border: 'none',
                          borderRadius: '8px',
                          color: selectedOptions.length === 0 ? '#9ca3af' : '#ffffff',
                          padding: '10px 16px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: selectedOptions.length === 0 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                          width: '100%'
                        }}
                      >
                        Confirm Selection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Pulsing Loading Indicators */}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', marginLeft: '38px', background: '#ffffff', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', display: 'flex', gap: '4px', alignItems: 'center', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#701557', animation: 'pulseDot 1.2s infinite 0s' }} />
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#701557', animation: 'pulseDot 1.2s infinite 0.2s' }} />
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#701557', animation: 'pulseDot 1.2s infinite 0.4s' }} />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ padding: '12px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Describe symptoms (e.g. cough, fever)..."
          disabled={isLoading}
          className="chat-input"
          style={{
            flex: 1,
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '24px',
            padding: '8px 16px',
            color: '#000000',
            fontSize: '0.8rem',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          style={{
            background: '#701557',
            border: 'none',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer',
            opacity: isLoading || !inputText.trim() ? 0.6 : 1
          }}
        >
          <Send size={14} />
        </button>
      </form>

      {/* Embedded CSS for dots pulse and scrollbars */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulseDot {
          0%, 100% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        .chat-carousel::-webkit-scrollbar {
          height: 4px;
        }
        .chat-carousel::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
        }
        .chat-carousel::-webkit-scrollbar-thumb {
          background: #701557;
          border-radius: 4px;
        }
        .chat-input::placeholder {
          color: #4b5563 !important;
          opacity: 1 !important;
        }
      `}} />
    </div>
  );
};

export default ChatDrawer;
