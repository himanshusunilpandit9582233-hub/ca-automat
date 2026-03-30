import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Binary, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { register, error, setError } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationError('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register(
      formData.email,
      formData.password,
      formData.name,
      formData.phone || null
    );
    setLoading(false);

    if (result.success) {
      navigate('/select-role');
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="register-page">
      {/* Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#002FA7] rounded-sm flex items-center justify-center">
              <Binary className="w-5 h-5 text-white" />
            </div>
            <span className="font-['Cabinet_Grotesk'] font-bold text-xl text-[#0A0A0A]">
              CA Automate
            </span>
          </Link>

          <h1 className="font-['Cabinet_Grotesk'] text-3xl font-bold text-[#0A0A0A] mb-2">
            Create Account
          </h1>
          <p className="text-[#4B5563] mb-8">
            Start your onboarding journey today
          </p>

          {/* Error Display */}
          {(error || validationError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm" data-testid="register-error">
              <p className="text-sm text-red-600">{validationError || error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-[#0A0A0A]">
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="John Doe"
                className="mt-2 h-12 border-gray-200 rounded-sm focus:border-[#002FA7] focus:ring-[#002FA7]"
                data-testid="register-name-input"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium text-[#0A0A0A]">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john@example.com"
                className="mt-2 h-12 border-gray-200 rounded-sm focus:border-[#002FA7] focus:ring-[#002FA7]"
                data-testid="register-email-input"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-[#0A0A0A]">
                Phone Number <span className="text-[#9CA3AF]">(Optional)</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 9876543210"
                className="mt-2 h-12 border-gray-200 rounded-sm focus:border-[#002FA7] focus:ring-[#002FA7]"
                data-testid="register-phone-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-[#0A0A0A]">
                Password
              </Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Min. 6 characters"
                  className="h-12 pr-12 border-gray-200 rounded-sm focus:border-[#002FA7] focus:ring-[#002FA7]"
                  data-testid="register-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-[#0A0A0A]">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Re-enter password"
                className="mt-2 h-12 border-gray-200 rounded-sm focus:border-[#002FA7] focus:ring-[#002FA7]"
                data-testid="register-confirm-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#002FA7] hover:bg-[#002482] text-white rounded-sm font-medium"
              data-testid="register-submit-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-[#4B5563]">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="text-[#002FA7] font-medium hover:underline"
              data-testid="login-link"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Image Section */}
      <div 
        className="hidden lg:block lg:w-1/2 relative"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/17057647/pexels-photo-17057647.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-[#002FA7]/80 flex items-center justify-center p-12">
          <div className="max-w-md text-white">
            <h2 className="font-['Cabinet_Grotesk'] text-3xl font-bold mb-4">
              Streamlined Onboarding
            </h2>
            <p className="text-white/80 leading-relaxed">
              Our 32-bit status system tracks your progress in real-time. 
              Complete verification steps at your own pace with resume capability.
            </p>
            
            {/* Binary Status Preview */}
            <div className="mt-8 p-4 bg-white/10 backdrop-blur-sm rounded-sm">
              <div className="flex gap-1 mb-2">
                {['0', '0', '0', '0', '0', '0', '0'].map((bit, i) => (
                  <div 
                    key={i}
                    className="w-8 h-8 font-mono text-xs flex items-center justify-center bg-white/10 text-white/60 border border-white/20"
                  >
                    {bit}
                  </div>
                ))}
              </div>
              <p className="font-mono text-xs text-white/60">
                Your journey starts at 0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
