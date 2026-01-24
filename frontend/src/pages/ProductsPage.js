import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, deleteProduct, getCategories } from '../contexts/api';
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct(productToDelete.id);
      toast.success('Product deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete product');
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
                         product.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6" data-testid="products-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-heading text-stone-900 tracking-tight">Products</h1>
          <p className="text-stone-600 mt-2">Manage your inventory products</p>
        </div>
        <Button
          onClick={() => navigate('/products/new')}
          data-testid="add-product-btn"
          className="bg-[#00923F] hover:bg-[#007A35] text-white h-11 px-6 font-medium transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-stone-100 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="search-input"
                className="pl-10 h-11 border-stone-200 focus:ring-2 focus:ring-[#00923F]"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger data-testid="category-filter" className="h-11 border-stone-200">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Products Grid/Table */}
      {loading ? (
        <div className="text-center py-12" data-testid="loading-state">
          <p className="text-stone-500">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-100 p-12 text-center" data-testid="empty-state">
          <Package className="w-12 h-12 mx-auto text-stone-300 mb-4" />
          <h3 className="text-lg font-semibold text-stone-900 mb-2">No products found</h3>
          <p className="text-stone-600 mb-6">Get started by adding your first product</p>
          <Button
            onClick={() => navigate('/products/new')}
            className="bg-[#00923F] hover:bg-[#007A35] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="products-table">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left p-4 font-medium text-stone-500 uppercase tracking-wider text-xs">Product</th>
                  <th className="text-left p-4 font-medium text-stone-500 uppercase tracking-wider text-xs">SKU</th>
                  <th className="text-left p-4 font-medium text-stone-500 uppercase tracking-wider text-xs">Category</th>
                  <th className="text-right p-4 font-medium text-stone-500 uppercase tracking-wider text-xs">Price</th>
                  <th className="text-right p-4 font-medium text-stone-500 uppercase tracking-wider text-xs">Stock</th>
                  <th className="text-center p-4 font-medium text-stone-500 uppercase tracking-wider text-xs">Status</th>
                  <th className="text-center p-4 font-medium text-stone-500 uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const isLowStock = product.quantity <= product.low_stock_threshold;
                  return (
                    <tr key={product.id} className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover border border-stone-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center">
                              <Package className="w-6 h-6 text-stone-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-stone-900">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-stone-500 truncate max-w-xs">{product.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-stone-600 font-mono text-xs">{product.sku}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-stone-100 text-stone-700 rounded-md text-xs font-medium">
                          {product.category}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold text-stone-900">₹{product.price.toLocaleString('en-IN')}</td>
                      <td className="p-4 text-right font-semibold text-stone-900">{product.quantity}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isLowStock ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {isLowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/products/edit/${product.id}`)}
                            data-testid={`edit-product-${product.id}`}
                            className="h-8 w-8 p-0 hover:bg-[#F2FCE2] hover:text-[#00923F]"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setProductToDelete(product);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`delete-product-${product.id}`}
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="confirm-delete-btn"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductsPage;