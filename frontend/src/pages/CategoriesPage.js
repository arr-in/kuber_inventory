import { useEffect, useState } from 'react';
import { getCategories, createCategory, deleteCategory } from '../contexts/api';
import { Plus, Trash2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCategory(formData);
      toast.success('Category created successfully');
      setDialogOpen(false);
      setFormData({ name: '', description: '' });
      loadCategories();
    } catch (error) {
      toast.error('Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory(categoryToDelete.id);
      toast.success('Category deleted successfully');
      loadCategories();
    } catch (error) {
      toast.error('Failed to delete category');
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="categories-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-heading text-stone-900 tracking-tight">Categories</h1>
          <p className="text-stone-600 mt-2">Organize your products into categories</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="add-category-btn"
              className="bg-[#00923F] hover:bg-[#007A35] text-white h-11 px-6 font-medium transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Add a new category to organize your products
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-name">Category Name *</Label>
                  <Input
                    id="cat-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    data-testid="category-name-input"
                    placeholder="Jewellery"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-desc">Description</Label>
                  <Textarea
                    id="cat-desc"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="category-description-input"
                    placeholder="Enter category description..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} data-testid="submit-category-btn" className="bg-[#00923F] hover:bg-[#007A35]">
                  {submitting ? 'Creating...' : 'Create Category'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12" data-testid="loading-state">
          <p className="text-stone-500">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-100 p-12 text-center" data-testid="empty-state">
          <FolderOpen className="w-12 h-12 mx-auto text-stone-300 mb-4" />
          <h3 className="text-lg font-semibold text-stone-900 mb-2">No categories yet</h3>
          <p className="text-stone-600 mb-6">Create your first category to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-xl border border-stone-100 p-6 shadow-sm hover:shadow-md transition-shadow"
              data-testid={`category-card-${category.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-[#F2FCE2] rounded-lg">
                  <FolderOpen className="w-6 h-6 text-[#00923F]" />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCategoryToDelete(category);
                    setDeleteDialogOpen(true);
                  }}
                  data-testid={`delete-category-${category.id}`}
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <h3 className="text-lg font-semibold text-stone-900 mb-1">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-stone-600 mb-3">{category.description}</p>
              )}
              <div className="pt-3 border-t border-stone-100">
                <p className="text-xs text-stone-500">
                  <span className="font-semibold text-[#00923F]">{category.product_count}</span> products
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? Products in this category will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="confirm-delete-category-btn"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoriesPage;