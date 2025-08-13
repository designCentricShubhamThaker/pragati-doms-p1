import React, { useState } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, Users, ShoppingCart, Printer, Droplets } from 'lucide-react';

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('January');

  // Sample data for different metrics
  const orderTrendData = [
    { month: 'Jan', glass: 120, aluminum: 89, plastic: 76, box: 145, pump: 67, deco: 43, foil: 89, frost: 34 },
    { month: 'Feb', glass: 98, aluminum: 110, plastic: 89, box: 123, pump: 78, deco: 56, foil: 76, frost: 45 },
    { month: 'Mar', glass: 134, aluminum: 87, plastic: 102, box: 167, pump: 89, deco: 67, foil: 98, frost: 56 },
    { month: 'Apr', glass: 145, aluminum: 123, plastic: 87, box: 189, pump: 76, deco: 45, foil: 87, frost: 43 },
    { month: 'May', glass: 167, aluminum: 145, plastic: 134, box: 201, pump: 98, deco: 78, foil: 123, frost: 67 },
    { month: 'Jun', glass: 189, aluminum: 167, plastic: 145, box: 234, pump: 110, deco: 89, foil: 145, frost: 78 }
  ];

  const productDistribution = [
    { name: 'Glass Team', value: 856, color: '#ff7f00' },
    { name: 'Aluminum Cap', value: 721, color: '#ff9500' },
    { name: 'Plastic Team', value: 633, color: '#ffab00' },
    { name: 'Box Team', value: 1059, color: '#ffc100' },
    { name: 'Pump Team', value: 518, color: '#ffd700' },
    { name: 'Deco Print', value: 378, color: '#ffed4e' },
    { name: 'Foil', value: 618, color: '#ff8f00' },
    { name: 'Frost Coat', value: 321, color: '#ffb74d' }
  ];

  const monthlyPerformance = [
    { category: 'Glass Team', jan: 120, feb: 98, mar: 134, apr: 145, may: 167, jun: 189 },
    { category: 'Aluminum Cap', jan: 89, feb: 110, mar: 87, apr: 123, may: 145, jun: 167 },
    { category: 'Plastic Team', jan: 76, feb: 89, mar: 102, apr: 87, may: 134, jun: 145 },
    { category: 'Box Team', jan: 145, feb: 123, mar: 167, apr: 189, may: 201, jun: 234 },
    { category: 'Pump Team', jan: 67, feb: 78, mar: 89, apr: 76, may: 98, jun: 110 },
    { category: 'Deco Print', jan: 43, feb: 56, mar: 67, apr: 45, may: 78, jun: 89 }
  ];

  const topProducts = [
    { name: 'Box Team Premium', orders: 234, growth: 12.5 },
    { name: 'Glass Team Standard', orders: 189, growth: 8.3 },
    { name: 'Aluminum Cap Pro', orders: 167, growth: 15.2 },
    { name: 'Plastic Team Eco', orders: 145, growth: -2.1 },
    { name: 'Foil Finish Plus', orders: 145, growth: 22.8 },
    { name: 'Pump Team Basic', orders: 110, growth: 6.7 }
  ];

  const kpiData = [
    { title: 'Total Orders', value: '4,104', change: '+12.5%', icon: ShoppingCart, trend: 'up' },
    { title: 'Product Lines', value: '8', change: 'Active', icon: Package, trend: 'neutral' },
    { title: 'Top Performer', value: 'Box Team', change: '234 orders', icon: TrendingUp, trend: 'up' },
    { title: 'Print Services', value: '756', change: '+18.2%', icon: Printer, trend: 'up' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-orange-900 mb-2">Order Management Analytics</h1>
          <p className="text-orange-700">Comprehensive overview of your product teams performance</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiData.map((kpi, index) => (
            <div key={index} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
                  <kpi.icon className="w-6 h-6 text-orange-600" />
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  kpi.trend === 'up' ? 'bg-green-100 text-green-800' : 
                  kpi.trend === 'down' ? 'bg-red-100 text-red-800' : 
                  'bg-orange-100 text-orange-800'
                }`}>
                  {kpi.change}
                </div>
              </div>
              <div className="text-2xl font-bold text-orange-900 mb-1">{kpi.value}</div>
              <div className="text-orange-600 text-sm">{kpi.title}</div>
            </div>
          ))}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Order Trends */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-200 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-orange-900">Order Trends</h3>
              <select 
                className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option>January</option>
                <option>February</option>
                <option>March</option>
                <option>April</option>
                <option>May</option>
                <option>June</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={orderTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                <XAxis dataKey="month" stroke="#ea580c" />
                <YAxis stroke="#ea580c" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #fed7aa',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Area type="monotone" dataKey="glass" stackId="1" stroke="#ff7f00" fill="url(#glassGradient)" />
                <Area type="monotone" dataKey="aluminum" stackId="1" stroke="#ff9500" fill="url(#aluminumGradient)" />
                <Area type="monotone" dataKey="plastic" stackId="1" stroke="#ffab00" fill="url(#plasticGradient)" />
                <Area type="monotone" dataKey="box" stackId="1" stroke="#ffc100" fill="url(#boxGradient)" />
                <defs>
                  <linearGradient id="glassGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff7f00" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ff7f00" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="aluminumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff9500" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ff9500" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="plasticGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffab00" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ffab00" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="boxGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffc100" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ffc100" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Product Distribution */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-200 shadow-lg">
            <h3 className="text-xl font-bold text-orange-900 mb-6">Product Distribution</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={productDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {productDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #fed7aa',
                      borderRadius: '12px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {productDistribution.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-orange-700 truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Monthly Performance */}
          <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-200 shadow-lg">
            <h3 className="text-xl font-bold text-orange-900 mb-6">Monthly Performance by Category</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={orderTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                <XAxis dataKey="month" stroke="#ea580c" />
                <YAxis stroke="#ea580c" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #fed7aa',
                    borderRadius: '12px'
                  }} 
                />
                <Bar dataKey="glass" fill="#ff7f00" radius={[2, 2, 0, 0]} />
                <Bar dataKey="aluminum" fill="#ff9500" radius={[2, 2, 0, 0]} />
                <Bar dataKey="plastic" fill="#ffab00" radius={[2, 2, 0, 0]} />
                <Bar dataKey="box" fill="#ffc100" radius={[2, 2, 0, 0]} />
                <Bar dataKey="pump" fill="#ffd700" radius={[2, 2, 0, 0]} />
                <Bar dataKey="deco" fill="#ffed4e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-200 shadow-lg">
            <h3 className="text-xl font-bold text-orange-900 mb-6">Top Products</h3>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                  <div className="flex-1">
                    <div className="font-semibold text-orange-900 mb-1">{product.name}</div>
                    <div className="text-sm text-orange-600">{product.orders} orders</div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.growth > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.growth > 0 ? '+' : ''}{product.growth}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Processing Services */}
        <div className="mt-8 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-200 shadow-lg">
          <h3 className="text-xl font-bold text-orange-900 mb-6">Processing Services Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <Printer className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-orange-900">378</div>
              <div className="text-sm text-orange-600">Deco Print Orders</div>
              <div className="text-xs text-green-600 mt-1">+15.2%</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <div className="w-8 h-8 bg-orange-300 rounded-full mx-auto mb-3 flex items-center justify-center">
                <div className="w-4 h-4 bg-orange-600 rounded-full"></div>
              </div>
              <div className="text-2xl font-bold text-orange-900">618</div>
              <div className="text-sm text-orange-600">Foil Applications</div>
              <div className="text-xs text-green-600 mt-1">+22.8%</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <Droplets className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-orange-900">321</div>
              <div className="text-sm text-orange-600">Frost Coatings</div>
              <div className="text-xs text-green-600 mt-1">+8.7%</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <Package className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-orange-900">1,317</div>
              <div className="text-sm text-orange-600">Total Processed</div>
              <div className="text-xs text-green-600 mt-1">+18.2%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;