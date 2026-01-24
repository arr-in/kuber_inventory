import { useEffect, useState } from 'react';
import { getInventoryReport, getLowStockReport, getActivityLogs } from '../contexts/api';
import { FileDown, FileText, AlertTriangle, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const ReportsPage = () => {
  const [inventoryReport, setInventoryReport] = useState(null);
  const [lowStockReport, setLowStockReport] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const [inventory, lowStock, activity] = await Promise.all([
        getInventoryReport(),
        getLowStockReport(),
        getActivityLogs(100)
      ]);
      setInventoryReport(inventory);
      setLowStockReport(lowStock);
      setActivityLogs(activity);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success('Excel file downloaded');
  };

  const exportToPDF = (title, data, columns) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 30);
    
    let yPos = 45;
    data.slice(0, 20).forEach((item, idx) => {
      if (yPos > 270) return;
      const line = columns.map(col => `${col}: ${item[col]}`).join(' | ');
      doc.text(line, 14, yPos);
      yPos += 10;
    });
    
    doc.save(`${title.replace(/\s/g, '_')}.pdf`);
    toast.success('PDF file downloaded');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-state">
        <p className="text-stone-500">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div>
        <h1 className="text-4xl font-bold font-heading text-stone-900 tracking-tight">Reports</h1>
        <p className="text-stone-600 mt-2">Generate and export inventory reports</p>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="bg-white border border-stone-200">
          <TabsTrigger value="inventory" data-testid="inventory-tab">Full Inventory</TabsTrigger>
          <TabsTrigger value="lowstock" data-testid="lowstock-tab">Low Stock</TabsTrigger>
          <TabsTrigger value="activity" data-testid="activity-tab">Activity Logs</TabsTrigger>
        </TabsList>

        {/* Full Inventory Report */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-stone-900">Complete Inventory Report</h2>
                <p className="text-sm text-stone-600 mt-1">
                  Total Products: <span className="font-semibold">{inventoryReport?.products?.length || 0}</span> | 
                  Total Value: <span className="font-semibold">₹{inventoryReport?.total_value?.toLocaleString('en-IN') || 0}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => exportToExcel(
                    inventoryReport?.products?.map(p => ({
                      Name: p.name,
                      SKU: p.sku,
                      Category: p.category,
                      Price: p.price,
                      Quantity: p.quantity,
                      Value: p.price * p.quantity
                    })),
                    'inventory_report'
                  )}
                  data-testid="export-inventory-excel"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
                <Button
                  onClick={() => exportToPDF(
                    'Inventory Report',
                    inventoryReport?.products || [],
                    ['name', 'sku', 'category', 'price', 'quantity']
                  )}
                  data-testid="export-inventory-pdf"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="text-left p-4 font-medium text-stone-500 uppercase text-xs">Product</th>
                    <th className="text-left p-4 font-medium text-stone-500 uppercase text-xs">SKU</th>
                    <th className="text-left p-4 font-medium text-stone-500 uppercase text-xs">Category</th>
                    <th className="text-right p-4 font-medium text-stone-500 uppercase text-xs">Price</th>
                    <th className="text-right p-4 font-medium text-stone-500 uppercase text-xs">Quantity</th>
                    <th className="text-right p-4 font-medium text-stone-500 uppercase text-xs">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryReport?.products?.map((product, idx) => (
                    <tr key={idx} className="border-b border-stone-100 hover:bg-stone-50/50">
                      <td className="p-4 font-medium text-stone-900">{product.name}</td>
                      <td className="p-4 text-stone-600 font-mono text-xs">{product.sku}</td>
                      <td className="p-4 text-stone-600">{product.category}</td>
                      <td className="p-4 text-right font-semibold">₹{product.price.toLocaleString('en-IN')}</td>
                      <td className="p-4 text-right">{product.quantity}</td>
                      <td className="p-4 text-right font-semibold text-[#00923F]">₹{(product.price * product.quantity).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Low Stock Report */}
        <TabsContent value="lowstock" className="space-y-4">
          <div className="bg-white rounded-xl border border-amber-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-stone-900">Low Stock Alert</h2>
                  <p className="text-sm text-stone-600 mt-1">
                    <span className="font-semibold text-amber-600">{lowStockReport.length}</span> products need restocking
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => exportToExcel(
                    lowStockReport.map(p => ({
                      Name: p.name,
                      SKU: p.sku,
                      Category: p.category,
                      'Current Stock': p.quantity,
                      Threshold: p.low_stock_threshold,
                      'Stock Needed': p.low_stock_threshold - p.quantity
                    })),
                    'low_stock_report'
                  )}
                  data-testid="export-lowstock-excel"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="text-left p-4 font-medium text-stone-500 uppercase text-xs">Product</th>
                    <th className="text-left p-4 font-medium text-stone-500 uppercase text-xs">SKU</th>
                    <th className="text-left p-4 font-medium text-stone-500 uppercase text-xs">Category</th>
                    <th className="text-right p-4 font-medium text-stone-500 uppercase text-xs">Current Stock</th>
                    <th className="text-right p-4 font-medium text-stone-500 uppercase text-xs">Threshold</th>
                    <th className="text-right p-4 font-medium text-stone-500 uppercase text-xs">Stock Needed</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockReport.map((product, idx) => (
                    <tr key={idx} className="border-b border-stone-100 hover:bg-amber-50/30">
                      <td className="p-4 font-medium text-stone-900">{product.name}</td>
                      <td className="p-4 text-stone-600 font-mono text-xs">{product.sku}</td>
                      <td className="p-4 text-stone-600">{product.category}</td>
                      <td className="p-4 text-right font-semibold text-amber-600">{product.quantity}</td>
                      <td className="p-4 text-right">{product.low_stock_threshold}</td>
                      <td className="p-4 text-right font-semibold text-red-600">{product.low_stock_threshold - product.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Activity Logs */}
        <TabsContent value="activity" className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-stone-900">Activity Logs</h2>
                  <p className="text-sm text-stone-600 mt-1">Recent inventory activities</p>
                </div>
              </div>
              <Button
                onClick={() => exportToExcel(
                  activityLogs.map(a => ({
                    Product: a.product_name,
                    Action: a.action,
                    'Quantity Change': a.quantity_change,
                    Admin: a.admin_email,
                    Timestamp: new Date(a.timestamp).toLocaleString('en-IN')
                  })),
                  'activity_logs'
                )}
                data-testid="export-activity-excel"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="text-left p-4 font-medium text-stone-500 uppercase text-xs">Product</th>
                    <th className="text-left p-4 font-medium text-stone-500 uppercase text-xs">Action</th>
                    <th className="text-right p-4 font-medium text-stone-500 uppercase text-xs">Quantity Change</th>
                    <th className="text-left p-4 font-medium text-stone-500 uppercase text-xs">Admin</th>
                    <th className="text-left p-4 font-medium text-stone-500 uppercase text-xs">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.map((log, idx) => (
                    <tr key={idx} className="border-b border-stone-100 hover:bg-stone-50/50">
                      <td className="p-4 font-medium text-stone-900">{log.product_name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          log.action === 'created' ? 'bg-green-50 text-green-700' :
                          log.action === 'stock_added' ? 'bg-blue-50 text-blue-700' :
                          log.action === 'stock_reduced' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold">{log.quantity_change > 0 ? '+' : ''}{log.quantity_change}</td>
                      <td className="p-4 text-stone-600">{log.admin_email}</td>
                      <td className="p-4 text-stone-600 text-xs">{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;