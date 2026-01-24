import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold font-heading text-[#00923F] mb-2">Kuber</h1>
            <p className="text-stone-600 text-sm">Create Admin Account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="register-form">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-stone-700 font-medium">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="name-input"
                className="h-11 border-stone-200 focus:ring-2 focus:ring-[#00923F]"
              />
            </div>

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
              data-testid="register-submit-btn"
              className="w-full h-11 bg-[#00923F] hover:bg-[#007A35] text-white font-medium transition-all"
            >
              {loading ? (
                <span>Creating account...</span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Register
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-stone-600">
              Already have an account?{' '}
              <Link to="/login" className="text-[#00923F] font-medium hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;