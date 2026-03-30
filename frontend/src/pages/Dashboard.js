import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import axios from 'axios';
import { 
  LogOut, 
  User, 
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowRight,
  CreditCard,
  FileCheck,
  Building2,
  Shield,
  FileText,
  Download,
  Settings
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * BITMASK STATUS EXPLANATION
 * --------------------------
 * The status_code is a single integer that stores multiple verification flags using bitwise operations.
 * Each bit represents a specific verification step:
 * 
 * Bit 0 (1)  = PAN Verified
 * Bit 1 (2)  = GST Verified
 * Bit 2 (4)  = CIN Verified
 * Bit 3 (8)  = Consent Given
 * Bit 4 (16) = AIS Access Approved
 * Bit 5 (32) = ITR Data Fetched
 * Bit 6 (64) = Account Created
 * 
 * To check if PAN is verified: (status_code & 1) !== 0
 * To check if GST is verified: (status_code & 2) !== 0
 */

const VERIFICATION_ITEMS = [
  { bit: 1, label: 'PAN Verified', icon: CreditCard },
  { bit: 2, label: 'GST Verified', icon: FileCheck },
  { bit: 4, label: 'CIN Verified', icon: Building2 },
  { bit: 8, label: 'Consent Accepted', icon: Shield },
  { bit: 16, label: 'AIS Access', icon: FileText },
  { bit: 32, label: 'ITR Data', icon: FileText },
  { bit: 64, label: 'Account Active', icon: User }
];

const ROLE_DISPLAY = {
  individual: 'Individual',
  sole_proprietor: 'Sole Proprietor',
  opc: 'One Person Company',
  pvt_ltd: 'Private Limited'
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.get(`${API_URL}/api/onboarding/status`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setStatus(data);
    } catch (e) {
      if (e.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Check if a specific bit is set in status_code using bitwise AND
  const isBitSet = (bitValue) => {
    if (!status) return false;
    return (status.status_code & bitValue) !== 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[#002FA7]" />
      </div>
    );
  }

  const isOnboardingComplete = status?.progress_percentage === 100;

  return (
    <div className="min-h-screen bg-[#F9FAFB]" data-testid="dashboard-page">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-['Cabinet_Grotesk'] font-bold text-xl text-[#0A0A0A]">
              CA Dashboard
            </h1>
            <p className="text-sm text-[#4B5563]">
              {ROLE_DISPLAY[status?.role]} Account
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-[#4B5563]"
              data-testid="refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-[#DC2626] hover:text-[#DC2626] hover:bg-red-50"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto py-8 px-6">
        {/* Welcome Banner */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-['Cabinet_Grotesk'] text-2xl font-bold text-[#0A0A0A]">
                Welcome, {user?.name}
              </h2>
              <p className="text-[#4B5563] mt-1">
                {user?.email}
              </p>
            </div>
            {isOnboardingComplete ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-[#059669] rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Verified</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-[#D97706] rounded-lg">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Onboarding Pending</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Onboarding Status Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A]">
                  Verification Status
                </h3>
                <span className="text-sm text-[#4B5563]">
                  {status?.completed_steps?.length || 0}/{status?.required_steps?.length || 0} completed
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#4B5563]">Progress</span>
                  <span className="font-bold text-[#002FA7]" data-testid="progress-percentage">
                    {Math.round(status?.progress_percentage || 0)}%
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#002FA7] transition-all duration-500"
                    style={{ width: `${status?.progress_percentage || 0}%` }}
                  />
                </div>
              </div>

              {/* Verification Items */}
              <div className="space-y-3">
                {status?.required_steps?.map((step, index) => {
                  const isCompleted = status.completed_steps?.includes(step);
                  const stepLabels = {
                    pan: 'PAN Verification',
                    director_pan: 'Director PAN Verification',
                    gst: 'GST Verification',
                    cin: 'CIN Verification',
                    consent: 'Consent & Authorization'
                  };
                  
                  return (
                    <div 
                      key={step}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-[#059669] text-white' : 'bg-gray-300 text-white'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <span className="text-sm font-bold">{index + 1}</span>
                          )}
                        </div>
                        <span className={`font-medium ${isCompleted ? 'text-[#059669]' : 'text-[#4B5563]'}`}>
                          {stepLabels[step] || step}
                        </span>
                      </div>
                      <span className={`text-sm px-3 py-1 rounded-full ${
                        isCompleted 
                          ? 'bg-green-100 text-[#059669]' 
                          : 'bg-gray-200 text-[#4B5563]'
                      }`}>
                        {isCompleted ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Resume Button */}
              {!isOnboardingComplete && (
                <Button
                  onClick={() => navigate('/onboarding')}
                  className="w-full mt-6 bg-[#002FA7] hover:bg-[#002482] text-white rounded-lg py-6"
                  data-testid="resume-onboarding-btn"
                >
                  Resume Onboarding
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Verified Documents */}
            {status?.user_details && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A] mb-4">
                  Verified Documents
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {status.user_details.pan && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-[#4B5563] text-sm mb-1">
                        <CreditCard className="w-4 h-4" />
                        PAN Number
                      </div>
                      <p className="font-mono font-bold text-[#0A0A0A]">
                        {status.user_details.pan}
                      </p>
                    </div>
                  )}
                  {status.user_details.gstin && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-[#4B5563] text-sm mb-1">
                        <FileCheck className="w-4 h-4" />
                        GSTIN
                      </div>
                      <p className="font-mono font-bold text-[#0A0A0A]">
                        {status.user_details.gstin}
                      </p>
                    </div>
                  )}
                  {status.user_details.cin && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-[#4B5563] text-sm mb-1">
                        <Building2 className="w-4 h-4" />
                        CIN
                      </div>
                      <p className="font-mono font-bold text-[#0A0A0A] text-sm">
                        {status.user_details.cin}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A] mb-4">
                Account Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#9CA3AF]">Entity Type</p>
                  <p className="font-medium text-[#0A0A0A]">{ROLE_DISPLAY[status?.role]}</p>
                </div>
                <div>
                  <p className="text-sm text-[#9CA3AF]">Account Status</p>
                  <p className={`font-medium ${isBitSet(64) ? 'text-[#059669]' : 'text-[#D97706]'}`}>
                    {isBitSet(64) ? 'Active' : 'Pending Activation'}
                  </p>
                </div>
                {isBitSet(16) && (
                  <div>
                    <p className="text-sm text-[#9CA3AF]">AIS Access</p>
                    <p className="font-medium text-[#059669]">Authorized</p>
                  </div>
                )}
                {isBitSet(32) && (
                  <div>
                    <p className="text-sm text-[#9CA3AF]">ITR Filing</p>
                    <p className="font-medium text-[#059669]">Authorized</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A] mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {isOnboardingComplete && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-[#4B5563] hover:text-[#0A0A0A]"
                    data-testid="download-certificate-btn"
                  >
                    <Download className="w-4 h-4 mr-3" />
                    Download Certificate
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start text-[#4B5563] hover:text-[#0A0A0A]"
                  onClick={() => navigate('/select-role')}
                  data-testid="change-role-btn"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Change Entity Type
                </Button>
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-[#002FA7] rounded-lg p-6 text-white">
              <h3 className="font-['Cabinet_Grotesk'] font-bold text-lg mb-2">
                Need Help?
              </h3>
              <p className="text-sm text-white/80 mb-4">
                Contact our support team for assistance with your onboarding.
              </p>
              <Button
                variant="secondary"
                className="w-full bg-white text-[#002FA7] hover:bg-gray-100"
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
