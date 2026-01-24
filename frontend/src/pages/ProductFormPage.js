import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProduct, createProduct, updateProduct, getCategories, uploadImage } from '../contexts/api';
import { ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const ProductFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    quantity: '',
    category: '',
    low_stock_threshold: '10',
    images: []
  });

  useEffect(() => {
    loadCategories();
    if (isEdit) {
      loadProduct();
    }
  }, [id]);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
    }
  };

  const loadProduct = async () => {
    try {
      const product = await getProduct(id);
      setFormData({
        name: product.name,
        sku: product.sku,
        description: product.description || '',
        price: product.price.toString(),
        quantity: product.quantity.toString(),
        category: product.category,
        low_stock_threshold: product.low_stock_threshold.toString(),
        images: product.images || []
      });
    } catch (error) {
      toast.error('Failed to load product');
      navigate('/products');
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => uploadImage(file));
      const results = await Promise.all(uploadPromises);
      const imageUrls = results.map(r => r.url);
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...imageUrls]
      }));
      toast.success('Images uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        category: formData.category,
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        images: formData.images
      };

      if (isEdit) {
        await updateProduct(id, productData);
        toast.success('Product updated successfully');
      } else {
        await createProduct(productData);
        toast.success('Product created successfully');
      }
      navigate('/products');
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} product`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="product-form-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/products')}
          data-testid="back-btn"
          className="hover:bg-stone-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold font-heading text-stone-900 tracking-tight">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-stone-600 mt-2">
            {isEdit ? 'Update product information' : 'Fill in the details to create a new product'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-100 shadow-sm">
        <div className="p-6 space-y-6">
          {/* Images Section */}
          <div className="space-y-3">
            <Label className="text-stone-700 font-medium">Product Images</Label>
            
            {/* Image Preview Grid */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`Product ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-stone-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-stone-300 rounded-lg hover:border-[#00923F] hover:bg-[#F2FCE2] transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  data-testid="image-upload-input"
                />
                {uploading ? (
                  <span className="text-sm text-stone-600">Uploading...</span>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-stone-600" />
                    <span className="text-sm text-stone-600">Upload Images</span>
                  </>
                )}
              </label>
              <p className="text-xs text-stone-500">Upload multiple images (JPG, PNG)</p>
            </div>
          </div>

          {/* Product Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-stone-700 font-medium">
                Product Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                data-testid="product-name-input"
                placeholder="Gold Necklace"
                className="h-11 border-stone-200 focus:ring-2 focus:ring-[#00923F]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku" className="text-stone-700 font-medium">
                SKU *
              </Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                required
                data-testid="product-sku-input"
                placeholder="KBR-GN-001"
                className="h-11 border-stone-200 focus:ring-2 focus:ring-[#00923F]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-stone-700 font-medium">
                Price (₹) *
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                required
                data-testid="product-price-input"
                placeholder="25000"
                className="h-11 border-stone-200 focus:ring-2 focus:ring-[#00923F]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-stone-700 font-medium">
                Quantity *
              </Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                required
                data-testid="product-quantity-input"
                placeholder="50"
                className="h-11 border-stone-200 focus:ring-2 focus:ring-[#00923F]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-stone-700 font-medium">
                Category *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                required
              >
                <SelectTrigger data-testid="product-category-select" className="h-11 border-stone-200">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold" className="text-stone-700 font-medium">
                Low Stock Threshold *
              </Label>
              <Input
                id="threshold"
                type="number"
                value={formData.low_stock_threshold}
                onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                required
                data-testid="product-threshold-input"
                placeholder="10"
                className="h-11 border-stone-200 focus:ring-2 focus:ring-[#00923F]"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-stone-700 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              data-testid="product-description-input"
              placeholder="Enter product description..."
              rows={4}
              className="border-stone-200 focus:ring-2 focus:ring-[#00923F] resize-none"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="border-t border-stone-200 p-6 flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
            data-testid="cancel-btn"
            className="border-stone-200 hover:bg-stone-50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            data-testid="submit-product-btn"
            className="bg-[#00923F] hover:bg-[#007A35] text-white px-8"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductFormPage;
