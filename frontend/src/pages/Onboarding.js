import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import axios from 'axios';
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Building2,
  FileCheck,
  Shield,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * BITMASK STATUS SYSTEM
 * ---------------------
 * status_code is a combination of multiple flags stored in a single integer using bitwise operations.
 * Each verification step is represented by a power of 2:
 * 
 * PAN Verified     = 1   (2^0 = 0b0000001)
 * GST Verified     = 2   (2^1 = 0b0000010)
 * CIN Verified     = 4   (2^2 = 0b0000100)
 * Consent Given    = 8   (2^3 = 0b0001000)
 * AIS Access       = 16  (2^4 = 0b0010000)
 * ITR Fetched      = 32  (2^5 = 0b0100000)
 * Account Created  = 64  (2^6 = 0b1000000)
 * 
 * To SET a bit:    new_status = current_status | BIT_VALUE
 * To CHECK a bit:  (status_code & BIT_VALUE) !== 0
 * To REMOVE a bit: new_status = current_status & ~BIT_VALUE
 * 
 * Example: After PAN (1) and GST (2) verification:
 * status_code = 0 | 1 | 2 = 3 (0b0000011)
 */

// Step configurations for each verification type
const STEP_CONFIG = {
  pan: {
    title: 'PAN Verification',
    icon: CreditCard,
    description: 'Enter your PAN card details for identity verification',
    fields: [
      { name: 'pan', label: 'PAN Number', placeholder: 'ABCDE1234F', maxLength: 10, hint: 'Enter 10-character PAN' }
    ]
  },
  director_pan: {
    title: 'Director PAN Verification',
    icon: CreditCard,
    description: 'Enter the company director\'s PAN card details',
    fields: [
      { name: 'pan', label: 'Director PAN Number', placeholder: 'ABCDE1234F', maxLength: 10, hint: 'Enter director\'s 10-character PAN' }
    ]
  },
  gst: {
    title: 'GST Verification',
    icon: FileCheck,
    description: 'Enter your GST Identification Number for business verification',
    fields: [
      { name: 'gstin', label: 'GSTIN', placeholder: '22AAAAA0000A1Z5', maxLength: 15, hint: 'Enter 15-character GSTIN' }
    ]
  },
  cin: {
    title: 'CIN Verification',
    icon: Building2,
    description: 'Enter your Company Identification Number',
    fields: [
      { name: 'cin', label: 'CIN', placeholder: 'U12345MH2020PTC123456', maxLength: 21, hint: 'Enter 21-character CIN' }
    ]
  },
  consent: {
    title: 'Consent & Authorization',
    icon: Shield,
    description: 'Please review and accept the terms to proceed',
    isConsent: true
  }
};

const ROLE_DISPLAY = {
  individual: 'Individual',
  sole_proprietor: 'Sole Proprietor',
  opc: 'One Person Company',
  pvt_ltd: 'Private Limited'
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [status, setStatus] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [consents, setConsents] = useState({
    general: false,
    ais: false,
    itr: false
  });

  // Fetch onboarding status
  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.get(`${API_URL}/api/onboarding/status`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setStatus(data);
      
      // Find first pending step
      if (data.pending_steps && data.pending_steps.length > 0) {
        const firstPending = data.required_steps.findIndex(
          step => data.pending_steps.includes(step)
        );
        setCurrentStepIndex(Math.max(0, firstPending));
      }
      
      // Check if onboarding is complete
      if (data.progress_percentage === 100) {
        navigate('/dashboard');
      }
    } catch (e) {
      if (e.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to fetch onboarding status');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    setError(null);
  };

  const handleConsentChange = (key, checked) => {
    setConsents(prev => ({ ...prev, [key]: checked }));
    setError(null);
  };

  const handleSubmitStep = async () => {
    if (!status) return;
    
    const currentStep = status.required_steps[currentStepIndex];
    
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      let endpoint = '';
      let payload = {};

      if (currentStep === 'pan' || currentStep === 'director_pan') {
        endpoint = '/api/onboarding/pan-verify';
        payload = { pan: formData.pan };
        
        if (!formData.pan || formData.pan.length !== 10) {
          setError('Please enter a valid 10-character PAN number');
          setSubmitting(false);
          return;
        }
      } else if (currentStep === 'gst') {
        endpoint = '/api/onboarding/gstin-verify';
        payload = { gstin: formData.gstin };
        
        if (!formData.gstin || formData.gstin.length !== 15) {
          setError('Please enter a valid 15-character GSTIN');
          setSubmitting(false);
          return;
        }
      } else if (currentStep === 'cin') {
        endpoint = '/api/onboarding/cin-verify';
        payload = { cin: formData.cin };
        
        if (!formData.cin || formData.cin.length !== 21) {
          setError('Please enter a valid 21-character CIN');
          setSubmitting(false);
          return;
        }
      } else if (currentStep === 'consent') {
        endpoint = '/api/onboarding/consent';
        payload = {
          general_consent: consents.general,
          ais_consent: consents.ais,
          itr_consent: consents.itr
        };
        
        if (!consents.general) {
          setError('Please accept the terms and conditions to continue');
          setSubmitting(false);
          return;
        }
      }

      await axios.post(`${API_URL}${endpoint}`, payload, {
        withCredentials: true,
        headers
      });

      // Clear form data
      setFormData({});
      setConsents({ general: false, ais: false, itr: false });
      
      // Refresh status
      await fetchStatus();

    } catch (e) {
      setError(e.response?.data?.detail || 'Verification failed. Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#002FA7] mx-auto mb-4" />
          <p className="text-[#4B5563]">Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-12 h-12 text-[#DC2626] mx-auto mb-4" />
          <h2 className="font-['Cabinet_Grotesk'] text-xl font-bold text-[#0A0A0A] mb-2">
            Unable to Load
          </h2>
          <p className="text-[#4B5563] mb-4">Please select your entity type first</p>
          <Button onClick={() => navigate('/select-role')} className="bg-[#002FA7] hover:bg-[#002482]">
            Select Entity Type
          </Button>
        </div>
      </div>
    );
  }

  const currentStep = status.required_steps[currentStepIndex];
  const stepConfig = STEP_CONFIG[currentStep];
  const isStepCompleted = status.completed_steps.includes(currentStep);
  const StepIcon = stepConfig?.icon || Circle;

  return (
    <div className="min-h-screen bg-[#F9FAFB]" data-testid="onboarding-page">
      {/* Clean Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-['Cabinet_Grotesk'] font-bold text-xl text-[#0A0A0A]">
                {ROLE_DISPLAY[status.role]} Onboarding
              </h1>
              <p className="text-sm text-[#4B5563]">
                Step {currentStepIndex + 1} of {status.required_steps.length}
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm text-[#9CA3AF]">Progress</span>
              <p className="font-bold text-[#002FA7]">{Math.round(status.progress_percentage)}%</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#002FA7] transition-all duration-500"
              style={{ width: `${status.progress_percentage}%` }}
              data-testid="progress-bar"
            />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-8 px-6">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Steps Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-sm text-[#9CA3AF] uppercase tracking-wider mb-4">
                Verification Steps
              </h3>
              <div className="space-y-2">
                {status.required_steps.map((step, index) => {
                  const config = STEP_CONFIG[step];
                  const isCompleted = status.completed_steps.includes(step);
                  const isCurrent = index === currentStepIndex;
                  
                  return (
                    <button
                      key={step}
                      onClick={() => !isCompleted && setCurrentStepIndex(index)}
                      disabled={isCompleted}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all
                        ${isCurrent && !isCompleted ? 'bg-[#002FA7]/5 border border-[#002FA7]' : 'border border-transparent'}
                        ${isCompleted ? 'opacity-60 cursor-default' : 'hover:bg-gray-50 cursor-pointer'}
                      `}
                      data-testid={`step-${step}`}
                    >
                      <div className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                        ${isCompleted 
                          ? 'bg-[#059669] text-white' 
                          : isCurrent 
                            ? 'bg-[#002FA7] text-white' 
                            : 'bg-gray-200 text-gray-500'
                        }
                      `}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className={`text-sm ${isCompleted || isCurrent ? 'text-[#0A0A0A] font-medium' : 'text-[#9CA3AF]'}`}>
                        {config?.title?.replace(' Verification', '') || step}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              {isStepCompleted ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 text-[#059669] mx-auto mb-4" />
                  <h3 className="font-['Cabinet_Grotesk'] font-bold text-2xl text-[#0A0A0A] mb-2">
                    Verified Successfully
                  </h3>
                  <p className="text-[#4B5563] mb-8">
                    This step has been completed
                  </p>
                  {currentStepIndex < status.required_steps.length - 1 && (
                    <Button
                      onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                      className="bg-[#002FA7] hover:bg-[#002482] text-white rounded-lg px-6"
                      data-testid="next-step-btn"
                    >
                      Continue to Next Step
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Step Header */}
                  <div className="flex items-start gap-4 mb-8 pb-6 border-b border-gray-100">
                    <div className="w-14 h-14 bg-[#002FA7]/10 rounded-lg flex items-center justify-center">
                      <StepIcon className="w-7 h-7 text-[#002FA7]" />
                    </div>
                    <div>
                      <h2 className="font-['Cabinet_Grotesk'] font-bold text-2xl text-[#0A0A0A]">
                        {stepConfig?.title}
                      </h2>
                      <p className="text-[#4B5563] mt-1">
                        {stepConfig?.description}
                      </p>
                    </div>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3" data-testid="step-error">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Form Fields */}
                  {stepConfig?.isConsent ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-5 border border-gray-200 rounded-lg hover:border-[#002FA7]/30 transition-colors">
                        <Checkbox
                          id="general"
                          checked={consents.general}
                          onCheckedChange={(checked) => handleConsentChange('general', checked)}
                          className="mt-1"
                          data-testid="consent-general"
                        />
                        <div>
                          <Label htmlFor="general" className="font-medium text-[#0A0A0A] cursor-pointer">
                            I accept the Terms and Conditions <span className="text-red-500">*</span>
                          </Label>
                          <p className="text-sm text-[#4B5563] mt-1">
                            I consent to the processing of my data for verification and compliance purposes
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-5 border border-gray-200 rounded-lg hover:border-[#002FA7]/30 transition-colors">
                        <Checkbox
                          id="ais"
                          checked={consents.ais}
                          onCheckedChange={(checked) => handleConsentChange('ais', checked)}
                          className="mt-1"
                          data-testid="consent-ais"
                        />
                        <div>
                          <Label htmlFor="ais" className="font-medium text-[#0A0A0A] cursor-pointer">
                            Authorize AIS Data Fetch
                          </Label>
                          <p className="text-sm text-[#4B5563] mt-1">
                            I authorize fetching my Annual Information Statement from the Income Tax portal
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-5 border border-gray-200 rounded-lg hover:border-[#002FA7]/30 transition-colors">
                        <Checkbox
                          id="itr"
                          checked={consents.itr}
                          onCheckedChange={(checked) => handleConsentChange('itr', checked)}
                          className="mt-1"
                          data-testid="consent-itr"
                        />
                        <div>
                          <Label htmlFor="itr" className="font-medium text-[#0A0A0A] cursor-pointer">
                            Authorize ITR Filing
                          </Label>
                          <p className="text-sm text-[#4B5563] mt-1">
                            I authorize the filing of my Income Tax Return on my behalf
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {stepConfig?.fields?.map((field) => (
                        <div key={field.name}>
                          <Label htmlFor={field.name} className="text-sm font-medium text-[#0A0A0A]">
                            {field.label} <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleInputChange}
                            placeholder={field.placeholder}
                            maxLength={field.maxLength}
                            className="mt-2 h-14 text-lg border-gray-200 rounded-lg focus:border-[#002FA7] focus:ring-[#002FA7] font-mono uppercase tracking-wider"
                            data-testid={`input-${field.name}`}
                          />
                          <div className="flex justify-between mt-2">
                            <p className="text-xs text-[#9CA3AF]">{field.hint}</p>
                            <p className="text-xs text-[#9CA3AF]">
                              {formData[field.name]?.length || 0}/{field.maxLength}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      onClick={() => currentStepIndex > 0 && setCurrentStepIndex(currentStepIndex - 1)}
                      disabled={currentStepIndex === 0}
                      className="text-[#4B5563]"
                      data-testid="prev-step-btn"
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Back
                    </Button>

                    <Button
                      onClick={handleSubmitStep}
                      disabled={submitting}
                      className="bg-[#002FA7] hover:bg-[#002482] text-white rounded-lg px-8 py-6 text-base"
                      data-testid="submit-step-btn"
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          {currentStep === 'consent' ? 'Complete & Continue' : 'Verify'}
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
