import { useEffect, useState } from 'react';
import { getStats, getLowStockReport } from '../contexts/api';
import { Package, TrendingUp, AlertTriangle, FolderOpen, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, lowStock] = await Promise.all([
        getStats(),
        getLowStockReport()
      ]);
      setStats(statsData);
      setLowStockProducts(lowStock);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-state">
        <div className="text-stone-500">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Products',
      value: stats?.total_products || 0,
      icon: Package,
      color: 'text-[#00923F]',
      bg: 'bg-[#F2FCE2]',
      testId: 'total-products-stat'
    },
    {
      title: 'Total Stock Value',
      value: `₹${(stats?.total_stock_value || 0).toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      testId: 'total-value-stat'
    },
    {
      title: 'Low Stock Items',
      value: stats?.low_stock_items || 0,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      testId: 'low-stock-stat'
    },
    {
      title: 'Categories',
      value: stats?.total_categories || 0,
      icon: FolderOpen,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      testId: 'categories-stat'
    }
  ];

  const activityChartData = stats?.recent_activities?.slice(0, 10).reverse().map(activity => ({
    name: new Date(activity.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    value: Math.abs(activity.quantity_change),
    type: activity.action
  })) || [];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold font-heading text-stone-900 tracking-tight">Dashboard</h1>
        <p className="text-stone-600 mt-2">Welcome back! Here's your inventory overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              data-testid={card.testId}
              className="bg-white rounded-xl border border-stone-100 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{card.title}</p>
                  <p className="text-3xl font-bold text-stone-900 mt-2">{card.value}</p>
                </div>
                <div className={`${card.bg} ${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="bg-white rounded-xl border border-stone-100 p-6 shadow-sm" data-testid="activity-chart">
          <h2 className="text-xl font-semibold text-stone-900 mb-4">Recent Activity</h2>
          {activityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis dataKey="name" tick={{ fill: '#78716C', fontSize: 12 }} />
                <YAxis tick={{ fill: '#78716C', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E7E5E4', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {activityChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.type === 'stock_added' ? '#00923F' : '#F59E0B'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-stone-500 text-center py-12">No activity data available</p>
          )}
        </div>

        {/* Recent Activities List */}
        <div className="bg-white rounded-xl border border-stone-100 p-6 shadow-sm" data-testid="recent-activities">
          <h2 className="text-xl font-semibold text-stone-900 mb-4">Activity Log</h2>
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {stats?.recent_activities?.slice(0, 8).map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 pb-3 border-b border-stone-100 last:border-0">
                <div className={`p-2 rounded-lg ${
                  activity.action === 'created' ? 'bg-green-50' :
                  activity.action === 'stock_added' ? 'bg-blue-50' :
                  activity.action === 'stock_reduced' ? 'bg-amber-50' :
                  'bg-red-50'
                }`}>
                  {activity.action === 'stock_added' ? <ArrowUpRight className="w-4 h-4 text-blue-600" /> :
                   activity.action === 'stock_reduced' ? <ArrowDownRight className="w-4 h-4 text-amber-600" /> :
                   <Package className="w-4 h-4 text-stone-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{activity.product_name}</p>
                  <p className="text-xs text-stone-500">
                    {activity.action.replace('_', ' ')} • {activity.admin_email.split('@')[0]}
                  </p>
                </div>
                <span className="text-xs text-stone-400">
                  {new Date(activity.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-6 shadow-sm" data-testid="low-stock-alert">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-stone-900">Low Stock Alert</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left p-4 font-medium text-stone-500 uppercase tracking-wider text-xs">Product</th>
                  <th className="text-left p-4 font-medium text-stone-500 uppercase tracking-wider text-xs">SKU</th>
                  <th className="text-left p-4 font-medium text-stone-500 uppercase tracking-wider text-xs">Category</th>
                  <th className="text-right p-4 font-medium text-stone-500 uppercase tracking-wider text-xs">Stock</th>
                  <th className="text-right p-4 font-medium text-stone-500 uppercase tracking-wider text-xs">Threshold</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.slice(0, 5).map((product, idx) => (
                  <tr key={idx} className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
                    <td className="p-4 font-medium text-stone-900">{product.name}</td>
                    <td className="p-4 text-stone-600">{product.sku}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-stone-100 text-stone-700 rounded-md text-xs font-medium">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-amber-600 font-semibold">{product.quantity}</span>
                    </td>
                    <td className="p-4 text-right text-stone-600">{product.low_stock_threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;