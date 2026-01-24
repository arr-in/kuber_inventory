import { useEffect, useState } from 'react';
import { getAdmins } from '../contexts/api';
import { useAuth } from '../contexts/AuthContext';
import { Users, Shield, Mail, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';

const AdminsPage = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const data = await getAdmins();
      setAdmins(data);
    } catch (error) {
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(formData.email, formData.password, formData.name);
      toast.success('Admin created successfully');
      setDialogOpen(false);
      setFormData({ email: '', password: '', name: '' });
      loadAdmins();
    } catch (error) {
      toast.error('Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="admins-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-heading text-stone-900 tracking-tight">Admin Management</h1>
          <p className="text-stone-600 mt-2">Manage system administrators</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="add-admin-btn"
              className="bg-[#00923F] hover:bg-[#007A35] text-white h-11 px-6 font-medium transition-all"
            >
              <Users className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create New Admin</DialogTitle>
                <DialogDescription>
                  Add a new administrator to the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-name">Full Name *</Label>
                  <Input
                    id="admin-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    data-testid="admin-name-input"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email Address *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    data-testid="admin-email-input"
                    placeholder="admin@kuber.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password *</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    data-testid="admin-password-input"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  data-testid="submit-admin-btn"
                  className="bg-[#00923F] hover:bg-[#007A35]"
                >
                  {submitting ? 'Creating...' : 'Create Admin'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12" data-testid="loading-state">
          <p className="text-stone-500">Loading admins...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="bg-white rounded-xl border border-stone-100 p-6 shadow-sm hover:shadow-md transition-shadow"
              data-testid={`admin-card-${admin.id}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#00923F] flex items-center justify-center text-white font-semibold text-lg">
                  {admin.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-stone-900 truncate">{admin.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-stone-600 mt-1">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{admin.email}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Shield className="w-3 h-3" />
                  <span className="uppercase font-medium">{admin.role}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Calendar className="w-3 h-3" />
                  <span>Joined {new Date(admin.created_at).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminsPage;
