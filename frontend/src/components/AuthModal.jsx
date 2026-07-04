import React, { useState } from 'react';
import { X, Phone, Key, Mail, User, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { showFlash } from './FlashMessage';
import { apiUrl } from '../utils/api';

const patientLoginSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, '10-digit mobile number is required.'),
  password: z.string().min(1, 'Password is required.'),
});

const doctorAdminLoginSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const patientSignupSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required.'),
  email: z.string().trim().min(1, 'Email is required.').email('Invalid email address.'),
  phone: z.string().regex(/^\d{10}$/, 'Valid 10-digit phone number is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string().min(1, 'Confirm password is required.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

const doctorSignupSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required.'),
  email: z.string().trim().min(1, 'Email is required.').email('Invalid email address.'),
  phone: z.string().regex(/^\d{10}$/, 'Valid 10-digit phone number is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string().min(1, 'Confirm password is required.'),
  experience: z.string().refine(val => val !== '' && !isNaN(val) && Number(val) >= 0, 'Experience must be a positive number.'),
  fee: z.string().refine(val => val !== '' && !isNaN(val) && Number(val) >= 0, 'Fee must be a positive number.'),
  activeHours: z.string().trim().min(1, 'Daily available hours are required.'),
  address: z.string().trim().min(1, 'Clinic address is required.'),
  bio: z.string().optional(),
  latitude: z.any().optional(),
  longitude: z.any().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('patient');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [specialty, setSpecialty] = useState('General Physician');
  const [experience, setExperience] = useState('');
  const [fee, setFee] = useState('');
  const [activeHours, setActiveHours] = useState('09:00 AM - 05:00 PM');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [clinicLat, setClinicLat] = useState('');
  const [clinicLng, setClinicLng] = useState('');
  const [isSuspended, setIsSuspended] = useState(false);

  const [wizardStep, setWizardStep] = useState(1);
  const [tempToken, setTempToken] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtpVerified, setEmailOtpVerified] = useState(true);
  const [phoneOtpVerified, setPhoneOtpVerified] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [idUploaded, setIdUploaded] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setErrorMsg('');
    setSuccessMsg('');
    setErrors({});
    setIsSubmitted(false);
    if (newRole === 'admin') {
      setMode('login');
    }
  };

  const handleFieldChange = (field, setter, value) => {
    setter(value);

    if (field === 'email') {
      setIsSuspended(false);
    }

    if (isSubmitted) {
      const currentData = {
        name: field === 'name' ? value : name,
        email: field === 'email' ? value : email,
        phone: field === 'phone' ? value : phone,
        password: field === 'password' ? value : password,
        confirmPassword: field === 'confirmPassword' ? value : confirmPassword,
        experience: field === 'experience' ? value : experience,
        fee: field === 'fee' ? value : fee,
        activeHours: field === 'activeHours' ? value : activeHours,
        address: field === 'address' ? value : address,
        bio: field === 'bio' ? value : bio,
      };

      let schema;
      if (mode === 'login') {
        schema = role === 'patient' ? patientLoginSchema : doctorAdminLoginSchema;
      } else {
        schema = role === 'patient' ? patientSignupSchema : doctorSignupSchema;
      }

      const parseResult = schema.safeParse(currentData);
      if (parseResult.success) {
        setErrors({});
      } else {
        const fieldErrors = {};
        (parseResult.error.errors || parseResult.error.issues || []).forEach((err) => {
          const path = err.path[0];
          if (!fieldErrors[path]) {
            fieldErrors[path] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitted(true);

    const body = { role, password };
    if (role === 'doctor' || role === 'admin') {
      body.email = email.trim();
    } else {
      body.phone = phone.trim();
    }

    const schema = role === 'patient' ? patientLoginSchema : doctorAdminLoginSchema;
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      const fieldErrors = {};
      (parseResult.error.errors || parseResult.error.issues || []).forEach((err) => {
        const path = err.path[0];
        if (!fieldErrors[path]) {
          fieldErrors[path] = err.message;
        }
      });
      setErrors(fieldErrors);
      setErrorMsg('Please correct the validation errors below.');
      showFlash('Please fill all required fields', 'warning');
      return;
    }
    setErrors({});

    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Logged in successfully!');
        setTimeout(() => {
          onSuccess(data);
          onClose();
          resetForm();
        }, 1000);
      } else {
        if (data.isSuspended) {
          setIsSuspended(true);
          setErrorMsg(data.message);
          setErrors(prev => ({ ...prev, email: 'Email address is suspended.' }));
          showFlash(data.message, 'error');
        } else if (data.rejectionReason) {
          setErrorMsg(`Login failed: ${data.message} Reason: "${data.rejectionReason}"`);
          showFlash(`Login failed: ${data.message}`, 'error');
        } else {
          const msg = data.message || 'Login failed. Please check credentials.';
          setErrorMsg(msg);

          const lowerMsg = msg.toLowerCase();
          if (lowerMsg.includes('credentials') || lowerMsg.includes('password') || lowerMsg.includes('invalid email')) {
            showFlash('Invalid password', 'error');
            setErrors(prev => ({
              ...prev,
              password: 'Check your credentials.',
              email: role !== 'patient' ? 'Check your credentials.' : undefined,
              phone: role === 'patient' ? 'Check your credentials.' : undefined
            }));
          } else {
            showFlash(msg, 'error');
          }
        }
      }
    } catch (err) {
      setErrorMsg('Network error logging in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitted(true);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password: password,
      confirmPassword: confirmPassword,
    };

    if (role === 'doctor') {
      payload.specialty = specialty;
      payload.experience = experience.toString().trim();
      payload.fee = fee.toString().trim();
      payload.activeHours = activeHours.trim();
      payload.address = address.trim();
      payload.bio = bio.trim();
      payload.latitude = clinicLat !== '' ? Number(clinicLat) : undefined;
      payload.longitude = clinicLng !== '' ? Number(clinicLng) : undefined;
    }

    const schema = role === 'patient' ? patientSignupSchema : doctorSignupSchema;
    const parseResult = schema.safeParse(payload);
    if (!parseResult.success) {
      const fieldErrors = {};
      (parseResult.error.errors || parseResult.error.issues || []).forEach((err) => {
        const path = err.path[0];
        if (!fieldErrors[path]) {
          fieldErrors[path] = err.message;
        }
      });
      setErrors(fieldErrors);
      setErrorMsg('Please correct the validation errors below.');
      showFlash('Please fill all required fields', 'warning');
      return;
    }
    setErrors({});

    const backendPayload = {
      name: name.trim(),
      password: password,
      email: email.trim(),
      role,
      phone: phone.trim(),
    };

    if (role === 'doctor') {
      backendPayload.specialty = specialty;
      backendPayload.experience = Number(experience);
      backendPayload.fee = Number(fee);
      backendPayload.activeHours = activeHours.trim();
      backendPayload.address = address.trim();
      backendPayload.bio = bio.trim();
      backendPayload.latitude = clinicLat !== '' ? Number(clinicLat) : '';
      backendPayload.longitude = clinicLng !== '' ? Number(clinicLng) : '';
    }

    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendPayload),
      });
      const data = await res.json();

      if (res.ok) {
        if (role === 'doctor') {
          setTempToken(data.token);
          setSuccessMsg('Basic info registered. Please verify your OTP verification codes');
          setWizardStep(2);
        } else {
          setSuccessMsg('Account registered successfully! Logging you in...');
          setTimeout(() => {
            onSuccess(data);
            onClose();
            resetForm();
          }, 1000);
        }
      } else {
        const msg = data.message || 'Registration failed.';
        if (data.rejectionReason) {
          setErrorMsg(`Registration failed: ${msg} Reason: "${data.rejectionReason}"`);
        } else {
          setErrorMsg(msg);
        }

        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes('already exists') || lowerMsg.includes('registered') || data.isSuspended) {
          if (lowerMsg.includes('email') || data.isSuspended) {
            setErrors(prev => ({ ...prev, email: data.isSuspended ? 'Email address is suspended.' : 'Email is already registered.' }));
            if (data.isSuspended) {
              setIsSuspended(true);
            }
          } else if (lowerMsg.includes('phone')) {
            setErrors(prev => ({ ...prev, phone: 'Phone number is already registered.' }));
          } else {
            setErrors(prev => ({
              ...prev,
              email: role !== 'patient' ? 'Already registered.' : undefined,
              phone: role === 'patient' ? 'Already registered.' : undefined
            }));
          }
        }
      }
    } catch (err) {
      setErrorMsg('Network error registering profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/verify-email-otp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tempToken ? { 'Authorization': `Bearer ${tempToken}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ otp: emailOtp })
      });
      const data = await res.json();
      if (res.ok) {
        setEmailOtpVerified(true);
        setSuccessMsg('Email verified successfully!');
      } else {
        setErrorMsg(data.message || 'Verification failed.');
      }
    } catch (err) {
      setErrorMsg('Network error verifying Email OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/verify-phone-otp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tempToken ? { 'Authorization': `Bearer ${tempToken}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ otp: phoneOtp })
      });
      const data = await res.json();
      if (res.ok) {
        setPhoneOtpVerified(true);
        setSuccessMsg('Phone verified successfully!');
      } else {
        setErrorMsg(data.message || 'Verification failed.');
      }
    } catch (err) {
      setErrorMsg('Network error verifying Phone OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('media', selectedFile);

    try {
      const res = await fetch(apiUrl('/api/auth/upload-id'), {
        method: 'POST',
        headers: {
          ...(tempToken ? { 'Authorization': `Bearer ${tempToken}` } : {})
        },
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setIdUploaded(true);
        setSuccessMsg('ID Document uploaded successfully.');
      } else {
        setErrorMsg(data.message || 'ID Upload failed.');
      }
    } catch (err) {
      setErrorMsg('Network error uploading ID document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitApplication = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/submit-application'), {
        method: 'POST',
        headers: {
          ...(tempToken ? { 'Authorization': `Bearer ${tempToken}` } : {})
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setWizardStep(4);
        setSuccessMsg('Application submitted for admin review!');
      } else {
        setErrorMsg(data.message || 'Application submission failed.');
      }
    } catch (err) {
      setErrorMsg('Network error submitting application.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setEmail('');
    setRole('patient');
    setMode('login');
    setSpecialty('General Physician');
    setExperience('');
    setFee('');
    setActiveHours('09:00 AM - 05:00 PM');
    setAddress('');
    setBio('');
    setClinicLat('');
    setClinicLng('');
    setIsSuspended(false);
    setErrorMsg('');
    setSuccessMsg('');
    setShowPassword(false);
    setWizardStep(1);
    setTempToken('');
    setEmailOtp('');
    setPhoneOtp('');
    setEmailOtpVerified(false);
    setPhoneOtpVerified(false);
    setSelectedFile(null);
    setIdUploaded(false);
    setIsUploading(false);
    setErrors({});
    setIsSubmitted(false);
  };

  const doctorSpecialties = [
    'ENT', 'Cardiologist', 'Dermatologist', 'Dentist',
    'General Physician', 'Gynecologist/obstetrician',
    'Pediatrician', 'Neurologist', 'Psychiatrist'
  ];

  const isFormValid = () => {
    return true;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(5, 6, 12, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '30px 24px',
        position: 'relative',
        background: 'rgba(13, 17, 29, 0.95)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        boxShadow: '0 10px 40px rgba(6, 182, 212, 0.15)',
        animation: 'fadeIn 0.3s ease-out',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>

        {/* Close Button */}
        <button
          onClick={() => { onClose(); resetForm(); }}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            transition: 'color 0.2s',
          }}
        >
          <X size={20} />
        </button>

        {/* Tab Headers (Login vs Register) - Hidden if Admin or in middle of doctor wizard */}
        {role !== 'admin' && wizardStep === 1 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            background: 'rgba(0,0,0,0.2)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--card-border)',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                background: mode === 'login' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                color: mode === 'login' ? 'var(--primary-neon)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.82rem',
                transition: 'all 0.3s'
              }}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                background: mode === 'signup' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                color: mode === 'signup' ? 'var(--secondary-neon)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.82rem',
                transition: 'all 0.3s'
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Role Selector (Patient vs Doctor vs Admin) - Hidden in middle of doctor wizard */}
        {wizardStep === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => handleRoleChange('patient')}
              style={{
                padding: '10px 4px',
                border: role === 'patient' ? '1px solid var(--primary-neon)' : '1px solid var(--card-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                background: role === 'patient' ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                color: role === 'patient' ? 'var(--primary-neon)' : 'var(--text-muted)',
                fontSize: '0.74rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('doctor')}
              style={{
                padding: '10px 4px',
                border: role === 'doctor' ? '1px solid var(--secondary-neon)' : '1px solid var(--card-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                background: role === 'doctor' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                color: role === 'doctor' ? 'var(--secondary-neon)' : 'var(--text-muted)',
                fontSize: '0.74rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              Doctor
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              style={{
                padding: '10px 4px',
                border: role === 'admin' ? '1px solid #f43f5e' : '1px solid var(--card-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                background: role === 'admin' ? 'rgba(244, 63, 94, 0.1)' : 'transparent',
                color: role === 'admin' ? '#f43f5e' : 'var(--text-muted)',
                fontSize: '0.74rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              Admin
            </button>
          </div>
        )}

        {/* Header Title */}
        {wizardStep === 1 && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.35rem', color: '#fff', fontWeight: 800 }}>
              {mode === 'login'
                ? (role === 'admin' ? 'Admin Gateway' : `${role === 'doctor' ? 'Doctor' : 'User'} Login`)
                : `Create ${role === 'doctor' ? 'Doctor' : 'User'} Profile`
              }
            </h3>
          </div>
        )}

        {/* Notifications HUD */}
        {errorMsg && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', color: 'var(--accent-alert)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: 'var(--secondary-neon)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ================= STEP 1: FORM ================= */}
        {wizardStep === 1 && (
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Sign Up Fields: Full Name */}
            {mode === 'signup' && (
              <div>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)' }} size={16} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleFieldChange('name', setName, e.target.value)}
                    placeholder="Enter Full Name *"
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: errors.name ? '1px solid var(--accent-alert)' : '1px solid var(--card-border)',
                      borderRadius: '8px',
                      padding: '12px 14px 12px 38px',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
                {errors.name && (
                  <span style={{ color: 'var(--accent-alert)', fontSize: '0.72rem', marginTop: '4px', display: 'block', textAlign: 'left' }}>
                    {errors.name}
                  </span>
                )}
              </div>
            )}

            {/* Email Input: Required for doctor, admin, and patient on signup */}
            {(role === 'doctor' || role === 'admin' || (role === 'patient' && mode === 'signup')) && (
              <div>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)' }} size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => handleFieldChange('email', setEmail, e.target.value)}
                    placeholder="Email Address *"
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: errors.email ? '1px solid var(--accent-alert)' : '1px solid var(--card-border)',
                      borderRadius: '8px',
                      padding: '12px 14px 12px 38px',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
                {errors.email && (
                  <span style={{ color: 'var(--accent-alert)', fontSize: '0.72rem', marginTop: '4px', display: 'block', textAlign: 'left' }}>
                    {errors.email}
                    {isSuspended && (
                      <span
                        style={{ color: '#f87171', textDecoration: 'underline', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold' }}
                        onClick={() => window.open(`/api/auth/suspension-details/${email.toLowerCase().trim()}`, '_blank')}
                      >
                        See reasons for suspension
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}

            {/* Mobile Number Input: Required for patients login/signup, and doctor signup */}
            {(role === 'patient' || (role === 'doctor' && mode === 'signup')) && (
              <div>
                <div style={{ position: 'relative' }}>
                  <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)' }} size={16} />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => handleFieldChange('phone', setPhone, e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="10-digit Mobile Number *"
                    maxLength="10"
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: errors.phone ? '1px solid var(--accent-alert)' : '1px solid var(--card-border)',
                      borderRadius: '8px',
                      padding: '12px 14px 12px 38px',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      letterSpacing: '0.05em'
                    }}
                  />
                </div>
                {errors.phone && (
                  <span style={{ color: 'var(--accent-alert)', fontSize: '0.72rem', marginTop: '4px', display: 'block', textAlign: 'left' }}>
                    {errors.phone}
                  </span>
                )}
              </div>
            )}

            {/* Common Field: Password */}
            <div>
              <div style={{ position: 'relative' }}>
                <Key style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)' }} size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => handleFieldChange('password', setPassword, e.target.value)}
                  placeholder={mode === 'signup' ? "Password (min 6 characters) *" : "Password *"}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: errors.password ? '1px solid var(--accent-alert)' : '1px solid var(--card-border)',
                    borderRadius: '8px',
                    padding: '12px 40px 12px 38px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255, 255, 255, 0.4)', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <span style={{ color: 'var(--accent-alert)', fontSize: '0.72rem', marginTop: '4px', display: 'block', textAlign: 'left' }}>
                  {errors.password}
                </span>
              )}
            </div>

            {/* Confirm Password Field (Signup only) */}
            {mode === 'signup' && (
              <div>
                <div style={{ position: 'relative' }}>
                  <Key style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)' }} size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => handleFieldChange('confirmPassword', setConfirmPassword, e.target.value)}
                    placeholder="Confirm Password *"
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: errors.confirmPassword ? '1px solid var(--accent-alert)' : '1px solid var(--card-border)',
                      borderRadius: '8px',
                      padding: '12px 40px 12px 38px',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
                {errors.confirmPassword && (
                  <span style={{ color: 'var(--accent-alert)', fontSize: '0.72rem', marginTop: '4px', display: 'block', textAlign: 'left' }}>
                    {errors.confirmPassword}
                  </span>
                )}
              </div>
            )}

            {/* Sign Up Fields: Doctor Specific Fields */}
            {mode === 'signup' && role === 'doctor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px dashed var(--card-border)', paddingTop: '14px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--secondary-neon)', fontWeight: 700 }}>PROFESSIONAL CREDENTIALS</span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Specialization *</label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
                    >
                      {doctorSpecialties.map(spec => (
                        <option key={spec} value={spec} style={{ background: '#0d111d' }}>{spec}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Experience (Years) *</label>
                    <input
                      type="number"
                      required
                      value={experience}
                      placeholder="e.g. 10"
                      onChange={(e) => handleFieldChange('experience', setExperience, e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        border: errors.experience ? '1px solid var(--accent-alert)' : '1px solid var(--card-border)',
                        borderRadius: '8px',
                        padding: '10px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                    {errors.experience && (
                      <span style={{ color: 'var(--accent-alert)', fontSize: '0.68rem', marginTop: '4px', display: 'block', textAlign: 'left' }}>
                        {errors.experience}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Consultation Fee (INR) *</label>
                    <input
                      type="number"
                      required
                      value={fee}
                      placeholder="e.g. 500"
                      onChange={(e) => handleFieldChange('fee', setFee, e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        border: errors.fee ? '1px solid var(--accent-alert)' : '1px solid var(--card-border)',
                        borderRadius: '8px',
                        padding: '10px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                    {errors.fee && (
                      <span style={{ color: 'var(--accent-alert)', fontSize: '0.68rem', marginTop: '4px', display: 'block', textAlign: 'left' }}>
                        {errors.fee}
                      </span>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Clinic Address *</label>
                    <input
                      type="text"
                      required
                      value={address}
                      placeholder="e.g. Koramangala, Bengaluru"
                      onChange={(e) => handleFieldChange('address', setAddress, e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        border: errors.address ? '1px solid var(--accent-alert)' : '1px solid var(--card-border)',
                        borderRadius: '8px',
                        padding: '10px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                    {errors.address && (
                      <span style={{ color: 'var(--accent-alert)', fontSize: '0.68rem', marginTop: '4px', display: 'block', textAlign: 'left' }}>
                        {errors.address}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Daily Available Hours *</label>
                  <input
                    type="text"
                    required
                    value={activeHours}
                    placeholder="e.g. 09:00 AM - 05:00 PM"
                    onChange={(e) => handleFieldChange('activeHours', setActiveHours, e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: errors.activeHours ? '1px solid var(--accent-alert)' : '1px solid var(--card-border)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                  {errors.activeHours && (
                    <span style={{ color: 'var(--accent-alert)', fontSize: '0.68rem', marginTop: '4px', display: 'block', textAlign: 'left' }}>
                      {errors.activeHours}
                    </span>
                  )}
                </div>



                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Professional Bio</label>
                  <textarea
                    value={bio}
                    placeholder="Describe your medical background, specialization details, clinic philosophy..."
                    onChange={(e) => handleFieldChange('bio', setBio, e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: errors.bio ? '1px solid var(--accent-alert)' : '1px solid var(--card-border)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '0.8rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                  {errors.bio && (
                    <span style={{ color: 'var(--accent-alert)', fontSize: '0.68rem', marginTop: '4px', display: 'block', textAlign: 'left' }}>
                      {errors.bio}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Clinic Latitude (Optional)</label>
                    <input
                      type="number"
                      step="any"
                      value={clinicLat}
                      placeholder="e.g. 12.971891"
                      onChange={(e) => setClinicLat(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '8px',
                        padding: '10px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Clinic Longitude (Optional)</label>
                    <input
                      type="number"
                      step="any"
                      value={clinicLng}
                      placeholder="e.g. 77.641151"
                      onChange={(e) => setClinicLng(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '8px',
                        padding: '10px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: !isLoading
                  ? (role === 'doctor' ? 'var(--secondary-neon)' : (role === 'admin' ? '#f43f5e' : 'var(--primary-neon)'))
                  : 'rgba(255,255,255,0.05)',
                color: !isLoading
                  ? (role === 'patient' ? '#000' : '#fff')
                  : 'var(--text-muted)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: !isLoading ? 'pointer' : 'default',
                transition: 'all 0.2s',
                marginTop: '8px'
              }}
            >
              {isLoading
                ? (mode === 'login' ? 'Verifying Gateway...' : 'Registering Credentials...')
                : (mode === 'login' ? 'Login' : 'Begin Verification Wizard')
              }
            </button>
          </form>
        )}

        {/* ================= STEP 2: OTP VERIFICATION ================= */}
        {wizardStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', textAlign: 'center' }}>Step 2: Verify Phone Number</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
              Check your phone for a verification code
            </p>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Phone Verification Code *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="6-digit SMS OTP"
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value)}
                  disabled={phoneOtpVerified}
                  style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleVerifyPhoneOtp}
                  disabled={isLoading || phoneOtpVerified || !phoneOtp}
                  style={{
                    background: phoneOtpVerified ? 'rgba(16,185,129,0.2)' : 'var(--primary-neon)',
                    color: phoneOtpVerified ? 'var(--secondary-neon)' : '#000',
                    border: 'none', borderRadius: '6px', padding: '0 16px', fontSize: '0.8rem', fontWeight: 700, cursor: phoneOtpVerified ? 'default' : 'pointer'
                  }}
                >
                  {phoneOtpVerified ? '✓ Verified' : 'Verify'}
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={!emailOtpVerified || !phoneOtpVerified}
              onClick={() => { setWizardStep(3); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                background: emailOtpVerified && phoneOtpVerified ? 'var(--secondary-neon)' : 'rgba(255,255,255,0.05)',
                color: emailOtpVerified && phoneOtpVerified ? '#fff' : 'var(--text-muted)',
                border: 'none', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: emailOtpVerified && phoneOtpVerified ? 'pointer' : 'default', marginTop: '10px'
              }}
            >
              Continue to ID Upload (Step 3/4)
            </button>
          </div>
        )}

        {/* ================= STEP 3: ID UPLOAD ================= */}
        {wizardStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', textAlign: 'center' }}>Step 3: Upload Government ID</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
              To ensure safety, upload proof of your medical registration card or ID (PDF, JPG, JPEG, or PNG).
            </p>

            <div style={{ border: '2px dashed var(--card-border)', padding: '24px', borderRadius: '10px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                    setErrorMsg('');
                  }
                }}
                style={{ display: 'none' }}
                id="govt-id-input"
              />
              <label htmlFor="govt-id-input" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--card-border)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                Select Document
              </label>
              {selectedFile ? (
                <span style={{ fontSize: '0.78rem', color: 'var(--primary-neon)', wordBreak: 'break-all' }}>
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No file selected. Limit: 5MB</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleFileUpload}
              disabled={isUploading || idUploaded || !selectedFile}
              style={{
                background: idUploaded ? 'rgba(16,185,129,0.2)' : 'var(--primary-neon)',
                color: idUploaded ? 'var(--secondary-neon)' : '#000',
                border: 'none', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: idUploaded ? 'default' : 'pointer'
              }}
            >
              {isUploading ? 'Uploading...' : (idUploaded ? '✓ Upload Successful' : 'Upload ID Proof')}
            </button>

            <button
              type="button"
              disabled={!idUploaded}
              onClick={handleSubmitApplication}
              style={{
                background: idUploaded ? 'var(--secondary-neon)' : 'rgba(255,255,255,0.05)',
                color: idUploaded ? '#fff' : 'var(--text-muted)',
                border: 'none', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: idUploaded ? 'pointer' : 'default', marginTop: '10px'
              }}
            >
              Submit Verification Profile
            </button>
          </div>
        )}

        {/* ================= STEP 4: SUCCESS HUDS ================= */}
        {wizardStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><CheckCircle size={48} style={{ color: 'var(--secondary-neon)' }} /></div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary-neon)' }}>Verification Profile Filed!</h4>
            <p style={{ fontSize: '0.85rem', color: '#fff', lineHeight: 1.6 }}>
              Thank you, Dr. <strong>{name}</strong>. Your application credentials have been successfully logged under review.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '12px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Verification Status: <strong>PENDING ADMIN APPROVAL</strong>
              <br />
              Once approved by the Verification Authority, you will receive login permissions and appears in search lists.
            </div>
            <button
              type="button"
              onClick={() => { onClose(); resetForm(); }}
              style={{
                background: 'var(--secondary-neon)',
                color: '#fff',
                border: 'none', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', marginTop: '10px'
              }}
            >
              Done & Close
            </button>
          </div>
        )}

      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}} />
    </div>
  );
};

export default AuthModal;
