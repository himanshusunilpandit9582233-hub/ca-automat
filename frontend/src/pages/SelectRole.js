import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import axios from 'axios';
import { 
  User, 
  Store, 
  Building, 
  Building2, 
  ArrowRight, 
  Loader2,
  CheckCircle2,
  Binary
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const roles = [
  {
    id: 'individual',
    name: 'Individual',
    icon: User,
    description: 'Personal tax filing and compliance',
    steps: ['PAN Verification', 'Consent'],
    color: 'bg-blue-50'
  },
  {
    id: 'sole_proprietor',
    name: 'Sole Proprietor',
    icon: Store,
    description: 'Single-owner business entity',
    steps: ['PAN Verification', 'GST Verification', 'Consent'],
    color: 'bg-green-50'
  },
  {
    id: 'opc',
    name: 'One Person Company',
    icon: Building,
    description: 'OPC with single director',
    steps: ['PAN Verification', 'CIN Verification', 'Consent'],
    color: 'bg-purple-50'
  },
  {
    id: 'pvt_ltd',
    name: 'Private Limited',
    icon: Building2,
    description: 'Multi-director private company',
    steps: ['CIN Verification', 'GST Verification', 'Director PAN', 'Consent'],
    color: 'bg-amber-50'
  }
];

export default function SelectRole() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setError(null);
  };

  const handleContinue = async () => {
    if (!selectedRole) {
      setError('Please select a role to continue');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API_URL}/api/onboarding/select-role`,
        { role: selectedRole },
        { 
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      
      updateUser({ role: selectedRole });
      navigate('/onboarding');
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to select role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-12 px-6" data-testid="select-role-page">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#002FA7] rounded-sm flex items-center justify-center">
              <Binary className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <h1 className="font-['Cabinet_Grotesk'] text-3xl lg:text-4xl font-bold text-[#0A0A0A] mb-3">
            Select Your Entity Type
          </h1>
          <p className="text-[#4B5563] max-w-lg mx-auto">
            Choose your business type to begin your customized onboarding journey.
            Each entity has specific verification requirements.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm max-w-xl mx-auto" data-testid="role-error">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            
            return (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className={`
                  relative p-6 bg-white border-2 rounded-sm text-left transition-all duration-200
                  ${isSelected 
                    ? 'border-[#002FA7] shadow-sm' 
                    : 'border-gray-200 hover:border-[#002FA7]/50'
                  }
                `}
                data-testid={`role-card-${role.id}`}
              >
                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle2 className="w-6 h-6 text-[#002FA7]" />
                  </div>
                )}

                <div className={`w-14 h-14 ${role.color} rounded-sm flex items-center justify-center mb-4`}>
                  <Icon className="w-7 h-7 text-[#002FA7]" />
                </div>

                <h3 className="font-['Cabinet_Grotesk'] font-bold text-xl text-[#0A0A0A] mb-2">
                  {role.name}
                </h3>
                
                <p className="text-sm text-[#4B5563] mb-4">
                  {role.description}
                </p>

                {/* Required Steps */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-2">
                    Required Steps
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {role.steps.map((step, i) => (
                      <span 
                        key={i}
                        className="px-2 py-1 bg-gray-100 text-xs text-[#4B5563] rounded-sm"
                      >
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedRole || loading}
            className="px-8 py-6 bg-[#002FA7] hover:bg-[#002482] text-white rounded-sm font-medium text-base disabled:opacity-50"
            data-testid="continue-btn"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Continue to Onboarding
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
        </div>

        {/* Info Note */}
        <p className="mt-8 text-center text-sm text-[#9CA3AF]">
          You can change your entity type later from settings
        </p>
      </div>
    </div>
  );
}
