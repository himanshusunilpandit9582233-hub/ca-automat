import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  Shield, 
  FileCheck, 
  Building2, 
  Users, 
  ArrowRight, 
  CheckCircle2,
  Binary,
  Zap,
  Lock
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Shield,
      title: 'Secure Verification',
      description: 'PAN, GSTIN, and CIN verification with industry-standard encryption'
    },
    {
      icon: Binary,
      title: '32-bit Status Tracking',
      description: 'Real-time onboarding progress with bitmask status system'
    },
    {
      icon: Zap,
      title: 'Dynamic Onboarding',
      description: 'Role-based flows tailored for your business type'
    },
    {
      icon: Lock,
      title: 'Compliance Ready',
      description: 'AIS and ITR data fetch with proper consent management'
    }
  ];

  const roles = [
    { name: 'Individual', icon: Users, desc: 'Personal tax filing' },
    { name: 'Sole Proprietor', icon: FileCheck, desc: 'Single-owner business' },
    { name: 'OPC', icon: Building2, desc: 'One Person Company' },
    { name: 'Private Limited', icon: Building2, desc: 'Multi-director company' }
  ];

  return (
    <div className="min-h-screen bg-white" data-testid="landing-page">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
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
              onClick={() => navigate('/login')}
              data-testid="nav-login-btn"
              className="text-[#0A0A0A] hover:bg-gray-100"
            >
              Login
            </Button>
            <Button 
              onClick={() => navigate('/register')}
              data-testid="nav-register-btn"
              className="bg-[#002FA7] hover:bg-[#002482] text-white rounded-sm"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6" data-testid="hero-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#002FA7]/5 border border-[#002FA7]/20 rounded-full mb-6">
                <span className="w-2 h-2 bg-[#059669] rounded-full"></span>
                <span className="text-sm font-medium text-[#002FA7]">Compliance Made Simple</span>
              </div>
              
              <h1 className="font-['Cabinet_Grotesk'] text-5xl lg:text-6xl font-bold text-[#0A0A0A] tracking-tight leading-tight mb-6">
                Automate Your<br />
                <span className="text-[#002FA7]">CA Onboarding</span>
              </h1>
              
              <p className="text-lg text-[#4B5563] leading-relaxed mb-8 max-w-lg">
                Streamline compliance verification with our 32-bit status tracking system. 
                PAN, GST, CIN verification — all in one secure platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  onClick={() => navigate('/register')}
                  data-testid="hero-get-started-btn"
                  className="bg-[#002FA7] hover:bg-[#002482] text-white rounded-sm px-8 py-6 text-base"
                >
                  Start Onboarding
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/login')}
                  data-testid="hero-login-btn"
                  className="border-gray-200 text-[#0A0A0A] rounded-sm px-8 py-6 text-base hover:bg-gray-50"
                >
                  Already registered? Login
                </Button>
              </div>
            </div>
            
            {/* Status Display Demo */}
            <div className="hidden lg:block">
              <div className="bg-white border border-gray-200 rounded-sm p-8">
                <div className="mb-6">
                  <span className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider">
                    Live Status Preview
                  </span>
                </div>
                
                {/* Binary Display */}
                <div className="mb-8">
                  <div className="flex gap-1 mb-2">
                    {['1', '0', '0', '0', '1', '0', '1'].map((bit, i) => (
                      <div 
                        key={i}
                        className={`w-10 h-10 font-mono text-sm flex items-center justify-center border transition-all duration-200 ${
                          bit === '1' 
                            ? 'bg-[#002FA7] text-white border-[#002FA7]' 
                            : 'bg-gray-100 text-gray-400 border-gray-200'
                        }`}
                      >
                        {bit}
                      </div>
                    ))}
                  </div>
                  <p className="font-mono text-sm text-[#9CA3AF]">
                    Status Code: 69 (0b1000101)
                  </p>
                </div>
                
                {/* Status Items */}
                <div className="space-y-3">
                  {[
                    { name: 'PAN Verified', active: true },
                    { name: 'GST Verified', active: false },
                    { name: 'CIN Verified', active: true },
                    { name: 'Consent Given', active: false },
                    { name: 'Account Created', active: true }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-[#4B5563]">{item.name}</span>
                      <div className={`w-3 h-3 rounded-full ${item.active ? 'bg-[#059669]' : 'bg-gray-300'}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-[#F9FAFB]" data-testid="features-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-['Cabinet_Grotesk'] text-3xl lg:text-4xl font-bold text-[#0A0A0A] mb-4">
              Built for Compliance
            </h2>
            <p className="text-[#4B5563] max-w-2xl mx-auto">
              Every feature designed to make CA onboarding seamless and secure
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="p-6 bg-white border border-gray-200 rounded-sm hover:border-[#002FA7] transition-all duration-300"
                data-testid={`feature-card-${i}`}
              >
                <div className="w-12 h-12 bg-[#002FA7]/5 rounded-sm flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#002FA7]" />
                </div>
                <h3 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#4B5563] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 px-6" data-testid="roles-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-['Cabinet_Grotesk'] text-3xl lg:text-4xl font-bold text-[#0A0A0A] mb-4">
              Tailored for Every Business
            </h2>
            <p className="text-[#4B5563] max-w-2xl mx-auto">
              Select your entity type for a customized onboarding experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role, i) => (
              <div 
                key={i}
                className="p-6 bg-white border border-gray-200 rounded-sm text-center hover:border-[#002FA7] hover:shadow-sm transition-all duration-300"
                data-testid={`role-card-${i}`}
              >
                <div className="w-16 h-16 bg-[#F9FAFB] rounded-sm flex items-center justify-center mx-auto mb-4">
                  <role.icon className="w-8 h-8 text-[#002FA7]" />
                </div>
                <h3 className="font-['Cabinet_Grotesk'] font-bold text-lg text-[#0A0A0A] mb-1">
                  {role.name}
                </h3>
                <p className="text-sm text-[#4B5563]">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-[#0A0A0A]" data-testid="cta-section">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-['Cabinet_Grotesk'] text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Streamline Your Compliance?
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses using CA Automate for seamless verification and onboarding.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/register')}
            data-testid="cta-get-started-btn"
            className="bg-[#002FA7] hover:bg-[#002482] text-white rounded-sm px-8 py-6 text-base"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#002FA7] rounded-sm flex items-center justify-center">
              <Binary className="w-4 h-4 text-white" />
            </div>
            <span className="font-['Cabinet_Grotesk'] font-bold text-[#0A0A0A]">
              CA Automate
            </span>
          </div>
          <p className="text-sm text-[#9CA3AF]">
            2024 CA Automation System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
