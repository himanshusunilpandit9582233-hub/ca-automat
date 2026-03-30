import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import axios from 'axios';
import { 
  Binary, 
  CheckCircle2, 
  Circle, 
  Loader2, 
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Building2,
  FileCheck,
  Shield
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Step configurations
const STEP_CONFIG = {
  pan: {
    title: 'PAN Verification',
    icon: CreditCard,
    description: 'Enter your PAN card number for verification',
    fields: [
      { name: 'pan', label: 'PAN Number', placeholder: 'ABCDE1234F', maxLength: 10 }
    ]
  },
  director_pan: {
    title: 'Director PAN Verification',
    icon: CreditCard,
    description: 'Enter the director\'s PAN card number',
    fields: [
      { name: 'pan', label: 'Director PAN Number', placeholder: 'ABCDE1234F', maxLength: 10 }
    ]
  },
  gst: {
    title: 'GSTIN Verification',
    icon: FileCheck,
    description: 'Enter your GST Identification Number',
    fields: [
      { name: 'gstin', label: 'GSTIN', placeholder: '22AAAAA0000A1Z5', maxLength: 15 }
    ]
  },
  cin: {
    title: 'CIN Verification',
    icon: Building2,
    description: 'Enter your Company Identification Number',
    fields: [
      { name: 'cin', label: 'CIN', placeholder: 'U12345MH2020PTC123456', maxLength: 21 }
    ]
  },
  consent: {
    title: 'Consent & Authorization',
    icon: Shield,
    description: 'Review and provide consent for data processing',
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
    const stepConfig = STEP_CONFIG[currentStep];
    
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
          setError('Please enter a valid 10-character PAN');
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
          setError('Please provide general consent to continue');
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
      setError(e.response?.data?.detail || 'Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#002FA7]" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#4B5563] mb-4">Failed to load onboarding status</p>
          <Button onClick={() => navigate('/select-role')}>Select Role</Button>
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#002FA7] rounded-sm flex items-center justify-center">
              <Binary className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A]">
                Onboarding
              </h1>
              <p className="text-xs text-[#9CA3AF]">
                {ROLE_DISPLAY[status.role]}
              </p>
            </div>
          </div>
          
          {/* Binary Status */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-[#9CA3AF] font-mono">Status:</span>
            <div className="flex gap-0.5">
              {status.status_binary.split('').map((bit, i) => (
                <div 
                  key={i}
                  className={`w-6 h-6 font-mono text-xs flex items-center justify-center border ${
                    bit === '1' 
                      ? 'bg-[#002FA7] text-white border-[#002FA7]' 
                      : 'bg-gray-100 text-gray-400 border-gray-200'
                  }`}
                  data-testid={`status-bit-${i}`}
                >
                  {bit}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto py-8 px-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-sm p-6">
              <h2 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A] mb-4">
                Progress
              </h2>
              
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[#4B5563]">Completion</span>
                  <span className="font-mono text-[#002FA7]">{status.progress_percentage}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#002FA7] transition-all duration-500"
                    style={{ width: `${status.progress_percentage}%` }}
                    data-testid="progress-bar"
                  />
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-3">
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
                        w-full flex items-center gap-3 p-3 rounded-sm text-left transition-all
                        ${isCurrent && !isCompleted ? 'bg-[#002FA7]/5 border border-[#002FA7]' : 'border border-transparent'}
                        ${isCompleted ? 'opacity-60' : 'hover:bg-gray-50'}
                      `}
                      data-testid={`step-${step}`}
                    >
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${isCompleted 
                          ? 'bg-[#059669] text-white' 
                          : isCurrent 
                            ? 'bg-[#002FA7] text-white' 
                            : 'bg-gray-100 text-gray-400'
                        }
                      `}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className={`text-sm ${isCompleted || isCurrent ? 'text-[#0A0A0A]' : 'text-[#9CA3AF]'}`}>
                        {config?.title || step}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Status Code */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-[#9CA3AF] mb-1">Status Code</p>
                <p className="font-mono text-lg text-[#0A0A0A]" data-testid="status-code">
                  {status.status_code}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-sm p-8">
              {isStepCompleted ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 text-[#059669] mx-auto mb-4" />
                  <h3 className="font-['Cabinet_Grotesk'] font-bold text-xl text-[#0A0A0A] mb-2">
                    Step Completed
                  </h3>
                  <p className="text-[#4B5563] mb-6">
                    This step has already been verified
                  </p>
                  {currentStepIndex < status.required_steps.length - 1 && (
                    <Button
                      onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                      className="bg-[#002FA7] hover:bg-[#002482] text-white rounded-sm"
                    >
                      Next Step
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Step Header */}
                  <div className="flex items-start gap-4 mb-8">
                    <div className="w-12 h-12 bg-[#002FA7]/10 rounded-sm flex items-center justify-center">
                      <StepIcon className="w-6 h-6 text-[#002FA7]" />
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
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm" data-testid="step-error">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Form Fields */}
                  {stepConfig?.isConsent ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-sm">
                        <Checkbox
                          id="general"
                          checked={consents.general}
                          onCheckedChange={(checked) => handleConsentChange('general', checked)}
                          data-testid="consent-general"
                        />
                        <div>
                          <Label htmlFor="general" className="font-medium text-[#0A0A0A] cursor-pointer">
                            General Consent
                          </Label>
                          <p className="text-sm text-[#4B5563] mt-1">
                            I consent to the processing of my data for onboarding purposes
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-sm">
                        <Checkbox
                          id="ais"
                          checked={consents.ais}
                          onCheckedChange={(checked) => handleConsentChange('ais', checked)}
                          data-testid="consent-ais"
                        />
                        <div>
                          <Label htmlFor="ais" className="font-medium text-[#0A0A0A] cursor-pointer">
                            AIS Data Fetch Consent
                          </Label>
                          <p className="text-sm text-[#4B5563] mt-1">
                            I authorize fetching my Annual Information Statement data
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-sm">
                        <Checkbox
                          id="itr"
                          checked={consents.itr}
                          onCheckedChange={(checked) => handleConsentChange('itr', checked)}
                          data-testid="consent-itr"
                        />
                        <div>
                          <Label htmlFor="itr" className="font-medium text-[#0A0A0A] cursor-pointer">
                            ITR Filing Consent
                          </Label>
                          <p className="text-sm text-[#4B5563] mt-1">
                            I authorize the filing of my Income Tax Return
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stepConfig?.fields?.map((field) => (
                        <div key={field.name}>
                          <Label htmlFor={field.name} className="text-sm font-medium text-[#0A0A0A]">
                            {field.label}
                          </Label>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleInputChange}
                            placeholder={field.placeholder}
                            maxLength={field.maxLength}
                            className="mt-2 h-12 border-gray-200 rounded-sm focus:border-[#002FA7] focus:ring-[#002FA7] font-mono uppercase"
                            data-testid={`input-${field.name}`}
                          />
                          <p className="text-xs text-[#9CA3AF] mt-1">
                            {formData[field.name]?.length || 0} / {field.maxLength} characters
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      onClick={() => currentStepIndex > 0 && setCurrentStepIndex(currentStepIndex - 1)}
                      disabled={currentStepIndex === 0}
                      className="text-[#4B5563]"
                      data-testid="prev-step-btn"
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Previous
                    </Button>

                    <Button
                      onClick={handleSubmitStep}
                      disabled={submitting}
                      className="bg-[#002FA7] hover:bg-[#002482] text-white rounded-sm px-6"
                      data-testid="submit-step-btn"
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          {currentStep === 'consent' ? 'Complete Onboarding' : 'Verify & Continue'}
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
