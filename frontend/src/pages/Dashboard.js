import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import axios from 'axios';
import { 
  Binary, 
  LogOut, 
  User, 
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
  CreditCard,
  FileCheck,
  Building2,
  Shield,
  Database,
  FileText,
  Settings
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BIT_LABELS = [
  { bit: 64, label: 'Account', icon: User },
  { bit: 32, label: 'ITR', icon: FileText },
  { bit: 16, label: 'AIS', icon: Database },
  { bit: 8, label: 'Consent', icon: Shield },
  { bit: 4, label: 'CIN', icon: Building2 },
  { bit: 2, label: 'GST', icon: FileCheck },
  { bit: 1, label: 'PAN', icon: CreditCard }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[#002FA7]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]" data-testid="dashboard-page">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#002FA7] rounded-sm flex items-center justify-center">
              <Binary className="w-5 h-5 text-white" />
            </div>
            <span className="font-['Cabinet_Grotesk'] font-bold text-xl text-[#0A0A0A]">
              CA Automate
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-[#4B5563]"
              data-testid="refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
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

      <div className="max-w-7xl mx-auto py-8 px-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-['Cabinet_Grotesk'] text-3xl font-bold text-[#0A0A0A] mb-2">
            Welcome back, {user?.name}
          </h1>
          <p className="text-[#4B5563]">
            {status?.role ? ROLE_DISPLAY[status.role] : 'No role selected'} Account
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Status Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Binary Status Display */}
            <div className="bg-white border border-gray-200 rounded-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A]">
                  32-Bit Status Code
                </h2>
                <span className="font-mono text-2xl text-[#002FA7]" data-testid="status-code-display">
                  {status?.status_code || 0}
                </span>
              </div>

              {/* Binary Representation */}
              <div className="mb-6">
                <p className="text-sm text-[#9CA3AF] mb-3">Binary Representation</p>
                <div className="flex gap-1 flex-wrap">
                  {(status?.status_binary || '0000000').split('').map((bit, i) => (
                    <div 
                      key={i}
                      className={`
                        w-12 h-12 font-mono text-lg flex flex-col items-center justify-center border transition-all duration-200
                        ${bit === '1' 
                          ? 'bg-[#002FA7] text-white border-[#002FA7]' 
                          : 'bg-gray-100 text-gray-400 border-gray-200'
                        }
                      `}
                      data-testid={`binary-bit-${i}`}
                    >
                      <span className="text-sm">{bit}</span>
                      <span className="text-[8px] mt-0.5 opacity-70">
                        {BIT_LABELS[i]?.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bit Legend */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {BIT_LABELS.map(({ bit, label, icon: Icon }) => {
                  const isSet = status?.status_code ? (status.status_code & bit) !== 0 : false;
                  return (
                    <div 
                      key={bit}
                      className={`
                        flex items-center gap-2 p-3 border rounded-sm
                        ${isSet ? 'border-[#059669] bg-green-50' : 'border-gray-200'}
                      `}
                      data-testid={`bit-status-${bit}`}
                    >
                      {isSet ? (
                        <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300" />
                      )}
                      <div>
                        <p className={`text-xs font-mono ${isSet ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>
                          {bit}
                        </p>
                        <p className={`text-sm ${isSet ? 'text-[#0A0A0A]' : 'text-[#4B5563]'}`}>
                          {label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step Status Table */}
            <div className="bg-white border border-gray-200 rounded-sm p-6">
              <h2 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A] mb-4">
                Verification Status
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-[#9CA3AF]">Step</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[#9CA3AF]">Bit Value</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[#9CA3AF]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(status?.status_breakdown || {}).map(([key, value]) => (
                      <tr key={key} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 px-4">
                          <span className="text-sm text-[#0A0A0A] capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-[#4B5563]">
                            {key === 'pan_verified' && '1'}
                            {key === 'gst_verified' && '2'}
                            {key === 'cin_verified' && '4'}
                            {key === 'consent_given' && '8'}
                            {key === 'ais_access' && '16'}
                            {key === 'itr_fetched' && '32'}
                            {key === 'account_created' && '64'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {value ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-[#059669] text-xs font-medium rounded-sm">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-[#9CA3AF] text-xs font-medium rounded-sm">
                              <XCircle className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Card */}
            <div className="bg-white border border-gray-200 rounded-sm p-6">
              <h3 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A] mb-4">
                Onboarding Progress
              </h3>

              <div className="relative pt-1 mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[#4B5563]">Completion</span>
                  <span className="font-mono font-bold text-[#002FA7]" data-testid="progress-percentage">
                    {status?.progress_percentage || 0}%
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#002FA7] transition-all duration-500"
                    style={{ width: `${status?.progress_percentage || 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#4B5563]">Completed</span>
                  <span className="text-[#059669] font-medium">
                    {status?.completed_steps?.length || 0} steps
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4B5563]">Pending</span>
                  <span className="text-[#D97706] font-medium">
                    {status?.pending_steps?.length || 0} steps
                  </span>
                </div>
              </div>

              {(status?.pending_steps?.length || 0) > 0 && (
                <Button
                  onClick={() => navigate('/onboarding')}
                  className="w-full mt-6 bg-[#002FA7] hover:bg-[#002482] text-white rounded-sm"
                  data-testid="resume-onboarding-btn"
                >
                  Resume Onboarding
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>

            {/* User Details */}
            {status?.user_details && (
              <div className="bg-white border border-gray-200 rounded-sm p-6">
                <h3 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A] mb-4">
                  Verified Details
                </h3>

                <div className="space-y-3">
                  {status.user_details.pan && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-[#4B5563]">PAN</span>
                      <span className="font-mono text-sm text-[#0A0A0A]">
                        {status.user_details.pan}
                      </span>
                    </div>
                  )}
                  {status.user_details.gstin && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-[#4B5563]">GSTIN</span>
                      <span className="font-mono text-sm text-[#0A0A0A]">
                        {status.user_details.gstin}
                      </span>
                    </div>
                  )}
                  {status.user_details.cin && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-[#4B5563]">CIN</span>
                      <span className="font-mono text-sm text-[#0A0A0A]">
                        {status.user_details.cin}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 rounded-sm p-6">
              <h3 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A] mb-4">
                Quick Actions
              </h3>

              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-[#4B5563] hover:text-[#0A0A0A]"
                  onClick={() => navigate('/select-role')}
                  data-testid="change-role-btn"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Change Entity Type
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
