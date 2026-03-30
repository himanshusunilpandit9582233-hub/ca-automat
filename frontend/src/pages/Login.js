import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Binary, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, error, setError } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      // Check if user has selected a role
      if (result.data.role) {
        navigate('/dashboard');
      } else {
        navigate('/select-role');
      }
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
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
            Welcome Back
          </h1>
          <p className="text-[#4B5563] mb-8">
            Sign in to continue your onboarding
          </p>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm" data-testid="login-error">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                data-testid="login-email-input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-[#0A0A0A]">
                  Password
                </Label>
              </div>
              <div className="relative mt-2">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                  className="h-12 pr-12 border-gray-200 rounded-sm focus:border-[#002FA7] focus:ring-[#002FA7]"
                  data-testid="login-password-input"
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#002FA7] hover:bg-[#002482] text-white rounded-sm font-medium"
              data-testid="login-submit-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-[#4B5563]">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="text-[#002FA7] font-medium hover:underline"
              data-testid="register-link"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Image Section */}
      <div 
        className="hidden lg:block lg:w-1/2 relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1649142738067-1c88b4406cc7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwzfHx0ZWNoJTIwY29tcGFueSUyMGxvZ28lMjBibGFjayUyMGFuZCUyMHdoaXRlfGVufDB8fHx8MTc3NDkwMjM0Mnww&ixlib=rb-4.1.0&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-[#0A0A0A]/70 flex items-center justify-center p-12">
          <div className="max-w-md text-white">
            <h2 className="font-['Cabinet_Grotesk'] text-3xl font-bold mb-4">
              Resume Your Progress
            </h2>
            <p className="text-white/80 leading-relaxed">
              Pick up right where you left off. Your onboarding status is saved 
              and tracked with our 32-bit bitmask system.
            </p>
            
            {/* Progress Preview */}
            <div className="mt-8 space-y-3">
              {[
                { name: 'PAN Verification', bit: 1 },
                { name: 'GST Verification', bit: 2 },
                { name: 'Consent', bit: 8 }
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-white/60">
                  <div className="w-5 h-5 border border-white/30 rounded-sm flex items-center justify-center">
                    <span className="font-mono text-xs">{step.bit}</span>
                  </div>
                  <span className="text-sm">{step.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
