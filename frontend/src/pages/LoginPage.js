import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold font-heading text-[#00923F] mb-2">Kuber</h1>
            <p className="text-stone-600 text-sm">Inventory Management System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-stone-700 font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@kuber.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="email-input"
                className="h-11 border-stone-200 focus:ring-2 focus:ring-[#00923F]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-stone-700 font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="password-input"
                className="h-11 border-stone-200 focus:ring-2 focus:ring-[#00923F]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="w-full h-11 bg-[#00923F] hover:bg-[#007A35] text-white font-medium transition-all"
            >
              {loading ? (
                <span>Logging in...</span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Login
                </span>
              )}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-stone-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#00923F] font-medium hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-4 text-center text-xs text-stone-500">
          <p>Demo: admin@kuber.com / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;