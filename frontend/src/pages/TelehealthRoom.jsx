import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import {
  Phone, Video, VideoOff, Mic, MicOff, Send, Paperclip, X, Download,
  FileText, ArrowLeft, Monitor, PhoneOff, Check, CheckCheck, Trash2, Smile
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useTelehealthCall } from '../hooks/useTelehealthCall';
import { useTelehealthChat } from '../hooks/useTelehealthChat';
import '../styles/TelehealthRoom.css';
import { API_BASE } from '../utils/api';

const formatLastSeen = (dateString) => {
  if (!dateString) return 'Offline';
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Last seen today at ${timeStr}`;
  } else if (isYesterday) {
    return `Last seen yesterday at ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return `Last seen on ${dateStr} at ${timeStr}`;
  }
};

const TelehealthRoom = ({ appointmentId, user, onBack }) => {
  const [socket, setSocket] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const role = user.role; // 'patient' or 'doctor'

  // Initialize socket instance
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socketInstance = io(API_BASE || 'http://localhost:5000', {
      withCredentials: true,
      auth: {
        token: token || undefined
      }
    });
    setSocket(socketInstance);
    return () => {
      socketInstance.disconnect();
    };
  }, [appointmentId]);

  // Consume Chat Hook
  const {
    appointment,
    messages,
    messageText,
    setMessageText,
    counterpartPresence,
    isTyping,
    counterpartTyping,
    isExpired,
    uploading,
    selectedFile,
    filePreviewUrl,
    fullscreenImageUrl,
    setFullscreenImageUrl,
    fileInputRef,
    handleClearSelectedFile,
    handleSendMessage,
    handleDeleteMessage,
    handleTyping,
    handleAttachmentUpload,
    counterpartId
  } = useTelehealthChat({
    socket,
    user,
    appointmentId,
    role
  });

  const counterpartName = appointment
    ? (role === 'doctor' ? (appointment.patientId?.name || 'Patient') : (appointment.doctorId?.name || 'Doctor'))
    : 'Consultation Room';

  const counterpartPhoto = appointment
    ? (role === 'doctor' ? (appointment.patientId?.profileImage) : (appointment.doctorId?.profileImage))
    : null;

  // Consume Call Hook
  const {
    callState,
    callType,
    callId,
    incomingCallData,
    localStream,
    remoteStream,
    micMuted,
    camOff,
    isScreenSharing,
    callDuration,
    handleStartCall,
    handleAcceptCall,
    handleRejectCall,
    handleEndCall,
    toggleMute,
    toggleCam,
    handleToggleScreenShare,
    formatCallTime
  } = useTelehealthCall({
    socket,
    user,
    counterpartId,
    counterpartName,
    counterpartPhoto,
    isExpired
  });

  // Scroll browser window to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll to bottom on new messages (internal container only)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, counterpartTyping]);

  // Bind WebRTC media streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  // Close emoji picker on outside click
  const emojiPickerRef = useRef(null);
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setShowEmojiPicker(false);
    handleSendMessage(e);
  };

  return (
    <div className="tr-container">
      
      <div className="tr-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={onBack} className="tr-header-back-btn">
            <ArrowLeft size={18} />
          </button>
          
          <div className="tr-avatar-wrapper">
            <img
              src={counterpartPhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${counterpartName}`}
              alt={counterpartName}
              className="tr-avatar-img"
            />
            {counterpartPresence.online && (
              <span className="tr-avatar-online-indicator" />
            )}
          </div>

          <div>
            <h4 className="tr-header-title">
              {role === 'doctor' ? counterpartName : `Dr. ${counterpartName.replace(/^(?:Dr\.?\s*)+/i, '')}`}
            </h4>
            <div 
              className="tr-header-status"
              style={{ color: counterpartPresence.online ? '#10b981' : '#6b7280' }}
            >
              {counterpartPresence.online ? 'Active now' : formatLastSeen(counterpartPresence.lastSeen)}
            </div>
          </div>
        </div>

        {/* Start consultation voice/video call buttons */}
        {!isExpired && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => handleStartCall('voice')} title="Voice Call" className="tr-call-btn-voice">
              <Phone size={16} />
            </button>
            <button onClick={() => handleStartCall('video')} title="Video Call" className="tr-call-btn-video">
              <Video size={16} />
            </button>
          </div>
        )}
      </div>

      {/* CONSULTATION ROOM MAIN TWO-PANE SECTION */}
      <div className="tr-main-pane">

        {/* Left Pane: Chat Messages container */}
        <div className="tr-chat-pane">

          {/* Expiration Banner alert */}
          {isExpired && (
            <div className="tr-expire-banner">
              Consultation Period Expired
            </div>
          )}

          {/* Messages list */}
          <div ref={messagesContainerRef} className="tr-messages-container">
            {messages.map(m => {
              const isOwnMessage = m.senderId === user.id || m.senderId === user._id;
              
              return (
                <div 
                  key={m._id} 
                  className="tr-message-row"
                  style={{
                    alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                    flexDirection: isOwnMessage ? 'row-reverse' : 'row'
                  }}
                >
                  {/* Left Avatar for partner messages only */}
                  {!isOwnMessage && (
                    <img 
                      src={counterpartPhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${counterpartName}`} 
                      alt={counterpartName} 
                      className="tr-message-avatar"
                    />
                  )}

                  {/* Message bubble */}
                  <div
                    className="tr-message-bubble"
                    style={{
                      background: isOwnMessage ? '#701557' : '#ffffff',
                      borderRadius: isOwnMessage ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      color: isOwnMessage ? '#ffffff' : '#1f2937',
                      animation: 'fadeIn 0.2s ease-out'
                    }}
                  >
                    {/* Media Content Types */}
                    {m.messageType === 'image' && (
                      <div style={{ marginBottom: '6px' }}>
                        <img 
                          src={m.fileUrl} 
                          alt="Attachment" 
                          onClick={() => setFullscreenImageUrl(m.fileUrl)}
                          style={{ maxWidth: '100%', borderRadius: '10px', maxHeight: '200px', objectFit: 'cover', cursor: 'pointer', transition: 'opacity 0.2s' }}
                          onMouseEnter={(e) => e.target.style.opacity = 0.85}
                          onMouseLeave={(e) => e.target.style.opacity = 1}
                        />
                      </div>
                    )}

                    {m.messageType === 'video' && (
                      <div style={{ marginBottom: '6px', position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
                        <video 
                          src={m.fileUrl} 
                          controls
                          style={{ maxWidth: '100%', borderRadius: '10px', maxHeight: '240px', background: '#000', display: 'block' }}
                        />
                        <button
                          type="button"
                          onClick={() => setFullscreenImageUrl(m.fileUrl)}
                          title="View Fullscreen"
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(5, 6, 12, 0.75)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#fff',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            opacity: 0.8,
                            transition: 'opacity 0.2s',
                            zIndex: 5
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = 1}
                          onMouseLeave={(e) => e.target.style.opacity = 0.8}
                        >
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>⛶</span>
                        </button>
                      </div>
                    )}

                    {m.messageType === 'pdf' && (
                      <div className="tr-attachment-pdf">
                        <FileText size={20} style={{ color: '#ef4444' }} />
                        <div style={{ overflow: 'hidden' }}>
                          <span className="tr-attachment-pdf-name" style={{ color: isOwnMessage ? '#fff' : '#1f2937' }}>
                            {m.content}
                          </span>
                        </div>
                        <a 
                          href={m.fileUrl} 
                          download 
                          target="_blank" 
                          rel="noreferrer"
                          className="tr-attachment-pdf-download-btn"
                          style={{ color: isOwnMessage ? '#fff' : '#701557' }}
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    )}

                    {/* Text content */}
                    {m.messageType === 'text' && (
                      <p className="tr-message-text">{m.content}</p>
                    )}

                    {/* Metadata Footer */}
                    <div className="tr-message-footer">
                      <span className="tr-message-time" style={{ color: isOwnMessage ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isOwnMessage && (
                        <span>
                          {m.deliveredStatus === 'read' ? (
                            <CheckCheck size={12} style={{ color: '#60a5fa' }} />
                          ) : (
                            <Check size={12} style={{ color: 'rgba(255,255,255,0.6)' }} />
                          )}
                        </span>
                      )}
                      
                      {/* Delete option */}
                      {isOwnMessage && !isExpired && (
                        <button 
                          onClick={() => handleDeleteMessage(m._id)}
                          title="Delete message"
                          className="tr-message-delete-btn"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Counterpart typing indicator */}
            {counterpartTyping && (
              <div className="tr-typing-indicator">
                <span className="tr-typing-dot"></span>
                <span className="tr-typing-dot"></span>
                <span className="tr-typing-dot"></span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Chat Input Area */}
          <div className="tr-input-form-container">
            {/* Attachment preview if selected */}
            {selectedFile && (
              <div className="tr-attachment-preview">
                <div className="tr-attachment-preview-img-wrapper">
                  {filePreviewUrl ? (
                    <img src={filePreviewUrl} alt="Preview" className="tr-attachment-preview-img" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                      <FileText size={18} style={{ color: '#ef4444' }} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {selectedFile.name}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready to send
                  </span>
                </div>
                <button onClick={handleClearSelectedFile} className="tr-attachment-preview-clear-btn">
                  <X size={12} />
                </button>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="tr-input-bar">
              {/* Emoji Picker toggle button */}
              {!isExpired && (
                <button 
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="tr-input-emoji-btn"
                >
                  <Smile size={20} />
                </button>
              )}

              {/* Attachment selector */}
              {!isExpired && (
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="tr-input-attach-btn"
                >
                  <Paperclip size={20} />
                </button>
              )}

              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAttachmentUpload}
                accept="image/*,video/*,application/pdf"
                style={{ display: 'none' }}
              />

              <input 
                type="text" 
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  handleTyping();
                }}
                disabled={isExpired || uploading}
                placeholder={isExpired ? "Consultation period has closed." : (uploading ? "Uploading attachment..." : "Type a message...")}
                className="tr-input-text"
              />

              {!isExpired && (
                <button 
                  type="submit" 
                  disabled={(!messageText.trim() && !selectedFile) || uploading}
                  className="tr-input-send-btn"
                  style={{
                    opacity: (!messageText.trim() && !selectedFile) || uploading ? 0.5 : 1,
                    cursor: (!messageText.trim() && !selectedFile) || uploading ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Send size={16} />
                </button>
              )}
            </form>

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="tr-emoji-picker-popover">
                <EmojiPicker 
                  onEmojiClick={(emojiData) => setMessageText(prev => prev + emojiData.emoji)}
                  width={320}
                  height={350}
                  skinTonesDisabled
                  searchDisabled
                />
              </div>
            )}
          </div>

        </div>

      </div>

      {/* WebRTC Video Call Screen Overlay */}
      {callState !== 'idle' && callState !== 'calling' && (
        <div className="tr-video-call-overlay">
          <div className="tr-video-call-window">
            
            {/* Header info bar */}
            <div className="tr-video-call-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Video size={18} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>
                  Active Consult: {counterpartName}
                </span>
              </div>
              <span className="tr-video-call-time">
                {formatCallTime(callDuration)}
              </span>
            </div>

            {/* Main view screens */}
            <div className="tr-video-call-feed-container">
              {callType === 'video' ? (
                <div className="tr-video-feed-remote-wrapper">
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="tr-video-feed-remote"
                  />
                  
                  {/* PiP Local Video feed */}
                  <div className="tr-video-feed-local-wrapper">
                    <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="tr-video-feed-local"
                    />
                  </div>
                </div>
              ) : (
                /* Voice call UI banner */
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                  <img 
                    src={counterpartPhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${counterpartName}`} 
                    alt={counterpartName} 
                    style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #10b981' }} 
                  />
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>{counterpartName}</h3>
                    <p style={{ color: '#10b981', fontSize: '0.82rem', marginTop: '6px', fontWeight: 600, letterSpacing: '0.05em' }}>
                      VOICE CONSULTATION ACTIVE
                    </p>
                  </div>
                  {/* Hidden stream players */}
                  <audio ref={remoteVideoRef} autoPlay />
                  <audio ref={localVideoRef} autoPlay muted />
                </div>
              )}
            </div>

            {/* Call action buttons bar */}
            <div className="tr-video-call-controls">
              <button 
                onClick={toggleMute}
                title={micMuted ? "Unmute Mic" : "Mute Mic"}
                className="tr-video-call-btn"
                style={{ background: micMuted ? '#ef4444' : 'rgba(255,255,255,0.08)' }}
              >
                {micMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {callType === 'video' && (
                <button 
                  onClick={toggleCam}
                  title={camOff ? "Turn Cam On" : "Turn Cam Off"}
                  className="tr-video-call-btn"
                  style={{ background: camOff ? '#ef4444' : 'rgba(255,255,255,0.08)' }}
                >
                  {camOff ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
              )}

              {callType === 'video' && (
                <button 
                  onClick={handleToggleScreenShare}
                  title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                  className="tr-video-call-btn"
                  style={{ background: isScreenSharing ? '#10b981' : 'rgba(255,255,255,0.08)' }}
                >
                  <Monitor size={20} />
                </button>
              )}

              <button 
                onClick={handleEndCall}
                title="Hang Up"
                className="tr-video-call-btn tr-video-call-btn-hangup"
              >
                <PhoneOff size={20} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Incoming Call Screen overlay */}
      {callState === 'incoming' && incomingCallData && (
        <div className="tr-incoming-call-modal">
          <div className="tr-incoming-call-card">
            <img 
              src={counterpartPhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${counterpartName}`} 
              alt={counterpartName} 
              className="tr-incoming-call-avatar"
            />
            <div>
              <h3 className="tr-incoming-call-title">Incoming {callType.toUpperCase()} Call</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>{counterpartName}</p>
            </div>
            
            <div className="tr-incoming-call-buttons">
              <button 
                onClick={handleAcceptCall}
                className="tr-incoming-call-btn-accept"
              >
                <Phone size={16} />
                Accept
              </button>
              <button 
                onClick={handleRejectCall}
                className="tr-incoming-call-btn-reject"
              >
                <PhoneOff size={16} />
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing Calling state overlay */}
      {callState === 'calling' && !incomingCallData && (
        <div className="tr-incoming-call-modal">
          <div className="tr-incoming-call-card">
            <img 
              src={counterpartPhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${counterpartName}`} 
              alt={counterpartName} 
              className="tr-incoming-call-avatar"
              style={{ animation: 'pulse 2s infinite' }}
            />
            <div>
              <h3 className="tr-incoming-call-title">Calling...</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>{counterpartName}</p>
            </div>
            
            <button 
              onClick={handleEndCall}
              className="tr-incoming-call-btn-reject"
              style={{ width: '100%', marginTop: '10px' }}
            >
              <PhoneOff size={16} />
              Cancel Call
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Media Lightbox Modal */}
      {fullscreenImageUrl && (
        <div className="tr-lightbox-overlay">
          <div className="tr-lightbox-card">
            <button 
              onClick={() => setFullscreenImageUrl(null)}
              className="tr-lightbox-close-btn"
            >
              <X size={20} />
            </button>

            {fullscreenImageUrl.toLowerCase().includes('.mp4') || fullscreenImageUrl.includes('video') ? (
              <video src={fullscreenImageUrl} controls className="tr-lightbox-img" autoPlay />
            ) : (
              <img src={fullscreenImageUrl} alt="Attachment Fullscreen" className="tr-lightbox-img" />
            )}

            <a 
              href={fullscreenImageUrl} 
              download 
              target="_blank" 
              rel="noreferrer"
              className="tr-lightbox-download-btn"
            >
              <Download size={14} />
              Download Attachment File
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelehealthRoom;
