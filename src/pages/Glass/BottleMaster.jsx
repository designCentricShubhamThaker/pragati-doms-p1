
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Package, Layers, Hash, Circle, ChevronLeft, ChevronRight, MoreHorizontal, X, SlidersHorizontal, Tag, ChevronDown, Check, Plus } from 'lucide-react';
import MultiSelectDropdown from './components/MultiSelectDrowdown';

import AddGlassProductMaster from './components/AddGlassProductMaster';
import EditGlassMaster from './components/EditGlassMaster';

const ModernGlassProductDashboard = ({ allProducts, loading,
  error, setAllProducts, filterLoading }) => {
  const [showFilters, setShowFilters] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [filters, setFilters] = useState({
    search: '',
    categories: [],
    shapes: [],
    types: [],
    capacities: [],
    neckDiameters: [],
    weights: [],
    dataCodes: [],
    stock_status: 'all'
  });

  const filterOptions = useMemo(() => {
    const getUniqueOptions = (field) => {
      const counts = {};
      allProducts.forEach(product => {
        const value = product[field];
        if (value !== null && value !== undefined && value !== '') {
          const key = value.toString();
          counts[key] = (counts[key] || 0) + 1;
        }
      });

      return Object.entries(counts)
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => {
          const aNum = parseFloat(a.value);
          const bNum = parseFloat(b.value);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
          }
          return a.value.localeCompare(b.value);
        });
    };

    return {
      categories: getUniqueOptions('category'),
      shapes: getUniqueOptions('shape'),
      types: getUniqueOptions('type'),
      capacities: getUniqueOptions('capacity'),
      neckDiameters: getUniqueOptions('neck_diameter'),
      weights: getUniqueOptions('weight'),
      dataCodes: getUniqueOptions('data_code')
    };
  }, [allProducts]);

 
  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase().trim();
        const searchableFields = [
          product.name,
          product.data_code,
          product.category,
          product.shape,
          product.capacity?.toString(),
          product.neck_diameter?.toString()
        ];
        const matchesSearch = searchableFields.some(field => {
          if (!field) return false;
          return field.toString().toLowerCase().includes(searchTerm);
        });
        if (!matchesSearch) return false;
      }

      if (filters.stock_status === 'in_stock' && product.available_stock <= 0) return false;
      if (filters.stock_status === 'out_of_stock' && product.available_stock > 0) return false;

      const filterChecks = [
        { filterKey: 'categories', productKey: 'category' },
        { filterKey: 'shapes', productKey: 'shape' },
        { filterKey: 'types', productKey: 'type' }, // Added type filter
        { filterKey: 'capacities', productKey: 'capacity' },
        { filterKey: 'neckDiameters', productKey: 'neck_diameter' },
        { filterKey: 'weights', productKey: 'weight' },
        { filterKey: 'dataCodes', productKey: 'data_code' }
      ];
      return filterChecks.every(({ filterKey, productKey }) => {
        const selectedValues = filters[filterKey];
        if (selectedValues.length === 0) return true;
        const productValue = product[productKey];
        if (productValue === null || productValue === undefined) return false;
        return selectedValues.includes(productValue.toString());
      });
    });
  }, [allProducts, filters]);

  // Paginate filtered products
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const totalRecords = filteredProducts.length;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleDropdown = (dropdownName) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  const getActiveFilterCount = () => {
    const multiSelectCounts = Object.entries(filters)
      .filter(([key, value]) => Array.isArray(value))
      .reduce((sum, [, value]) => sum + value.length, 0);

    const otherFilters = [filters.search, filters.stock_status !== 'all' ? 1 : 0]
      .filter(Boolean).length;

    return multiSelectCounts + otherFilters;
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      categories: [],
      shapes: [],
      types: [], // Added type reset
      capacities: [],
      neckDiameters: [],
      weights: [],
      dataCodes: [],
      stock_status: 'all'
    });
  };

  const removeFilterGroup = (filterKey) => {
    if (filterKey === 'stock_status') {
      setFilters(prev => ({ ...prev, stock_status: 'all' }));
    } else {
      setFilters(prev => ({ ...prev, [filterKey]: [] }));
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleProductAdded = async () => {
    await fetchAllProducts();
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const getStockStatusOptions = () => [
    { value: 'all', label: 'all items' },
    { value: 'in_stock', label: 'in stock' },
    { value: 'out_of_stock', label: 'out of stock' }
  ];

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };


  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`https://doms-k1fi.onrender.com/api/masters/glass/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchAllProducts(); // Refresh the data
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting product');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-orange-800 font-medium">loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center border border-white/20">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">connection error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            retry
          </button>
        </div>
      </div>
    );
  }

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100 p-4">
      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-slate-600">active filters:</span>
            <div className="flex flex-wrap gap-2">
              {/* Multi-select filter tags */}
              {Object.entries(filters).map(([key, value]) => {
                if (!Array.isArray(value) || value.length === 0) return null;
                const displayName = key.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/s$/, '');
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-orange-800 text-white rounded-lg text-sm font-medium"
                  >
                    <Tag size={12} />
                    {displayName}: {value.length} selected
                    <button
                      onClick={() => removeFilterGroup(key)}
                      className="ml-1 hover:text-orange-300"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}

              {filters.stock_status !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-800 text-white rounded-lg text-sm font-medium">
                  <Tag size={12} />
                  stock: {getStockStatusOptions().find(s => s.value === filters.stock_status)?.label}
                  <button
                    onClick={() => removeFilterGroup('stock_status')}
                    className="ml-1 hover:text-orange-300"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {filters.search && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-800 text-white rounded-lg text-sm font-medium">
                  <Tag size={12} />
                  search: "{filters.search}"
                  <button
                    onClick={() => handleFilterChange('search', '')}
                    className="ml-1 hover:text-orange-300"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              <button
                onClick={clearAllFilters}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                clear all
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Filters Panel */}
        {showFilters && (
          <div className="w-80 space-y-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Filter Products</h3>
                <span className="text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                  {activeFilterCount} active
                </span>
              </div>

              {filterLoading && (
                <div className="flex items-center gap-2 mb-4 text-sm text-orange-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                  updating filters...
                </div>
              )}

              <div className="space-y-4">
                {/* Search Filter */}
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">search</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="search products..."
                    className="w-full px-3 py-2 placeholder-slate-500 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">stock status</label>
                  <select
                    value={filters.stock_status}
                    onChange={(e) => handleFilterChange('stock_status', e.target.value)}
                    className="w-full px-3 py-2 text-slate-500 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    {getStockStatusOptions().map(option => (
                      <option key={option.value} className="text-orange-800" value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <MultiSelectDropdown
                  label="category"
                  options={filterOptions.categories}
                  selectedValues={filters.categories}
                  onChange={(values) => handleFilterChange('categories', values)}
                  placeholder="select categories..."
                  isOpen={openDropdown === 'categories'}
                  onToggle={() => toggleDropdown('categories')}
                />

                <MultiSelectDropdown
                  label="shape"
                  options={filterOptions.shapes}
                  selectedValues={filters.shapes}
                  onChange={(values) => handleFilterChange('shapes', values)}
                  placeholder="select shapes..."
                  isOpen={openDropdown === 'shapes'}
                  onToggle={() => toggleDropdown('shapes')}
                />

                <MultiSelectDropdown
                  label="capacity (ml)"
                  options={filterOptions.capacities}
                  selectedValues={filters.capacities}
                  onChange={(values) => handleFilterChange('capacities', values)}
                  placeholder="select capacities..."
                  isOpen={openDropdown === 'capacities'}
                  onToggle={() => toggleDropdown('capacities')}
                />

                <MultiSelectDropdown
                  label="neck diameter (mm)"
                  options={filterOptions.neckDiameters}
                  selectedValues={filters.neckDiameters}
                  onChange={(values) => handleFilterChange('neckDiameters', values)}
                  placeholder="select neck diameters..."
                  isOpen={openDropdown === 'neckDiameters'}
                  onToggle={() => toggleDropdown('neckDiameters')}
                />

                <MultiSelectDropdown
                  label="weight (g)"
                  options={filterOptions.weights}
                  selectedValues={filters.weights}
                  onChange={(values) => handleFilterChange('weights', values)}
                  placeholder="select weights..."
                  isOpen={openDropdown === 'weights'}
                  onToggle={() => toggleDropdown('weights')}
                />

                <MultiSelectDropdown
                  label="type"
                  options={filterOptions.types}
                  selectedValues={filters.types}
                  onChange={(values) => handleFilterChange('types', values)}
                  placeholder="select types..."
                  isOpen={openDropdown === 'types'}
                  onToggle={() => toggleDropdown('types')}
                />

                <MultiSelectDropdown
                  label="data code"
                  options={filterOptions.dataCodes}
                  selectedValues={filters.dataCodes}
                  onChange={(values) => handleFilterChange('dataCodes', values)}
                  placeholder="select data codes..."
                  isOpen={openDropdown === 'dataCodes'}
                  onToggle={() => toggleDropdown('dataCodes')}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex-1">
          <div className="bg-white/80 backdrop-blur-sm rounded-t-2xl p-4 border border-white/20 border-b-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">
                  showing <span className="font-semibold text-sm text-slate-800">{paginatedProducts.length}</span> of{' '}
                  <span className="font-semibold text-sm text-slate-800">{totalRecords.toLocaleString()}</span> filtered products
                  {totalRecords !== allProducts.length && (
                    <span className="text-slate-500"> (from {allProducts.length.toLocaleString()} total)</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-2 bg-orange-700 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Product
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <SlidersHorizontal size={16} className="inline mr-1" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </button>
                {filterLoading && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                )}
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 border-t-0 rounded-b-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold">data code</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">name</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">category</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">shape</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">type</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">capacity</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">neck</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">weight</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">stock</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">Edit</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">Delete</th>

                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length > 0 ? (
                    paginatedProducts.map((product, index) => (
                      <tr
                        key={product._id}
                        className={`border-b border-slate-200 hover:bg-orange-50/50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white/50' : 'bg-slate-50/50'
                          }`}
                      >
                        <td className="px-3 py-2 text-sm font-mono font-medium text-orange-700">{product.data_code}</td>
                        <td className="px-3 py-2 text-sm font-mono font-medium text-slate-800">{product.name}</td>
                        <td className="px-3 py-2 text-sm font-mono font-medium text-orange-700">{product.category}</td>
                        <td className="px-3 py-2 text-sm font-mono text-slate-600">{product.shape}</td>
                        <td className="px-3 py-2 text-sm font-mono text-slate-600">{product.type}</td>
                        <td className="px-3 py-2 text-sm font-mono text-slate-600">{product.capacity}ml</td>
                        <td className="px-3 py-2 text-sm font-mono text-slate-600">{product.neck_diameter}mm</td>
                        <td className="px-3 py-2 text-sm font-mono text-slate-600">{product.weight}g</td>
                        <td className="px-3 py-2 text-sm font-mono">
                          <span
                            className={`px-2 py-1 rounded-full text-sm font-mono font-semibold ${product.available_stock > 0 ? 'text-green-800' : 'text-red-800'
                              }`}
                          >
                            {product.available_stock}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            title="Edit product"
                          >
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleDelete(product._id)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Delete product"
                          >
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                            </svg>
                          </button>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-6 py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center">
                          <Package size={48} className="text-slate-300 mb-4" />
                          <p className="text-lg font-medium">no products found</p>
                          <p className="text-sm">try adjusting your filters or search terms</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-sm">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600">
                  page <span className="font-semibold">{currentPage}</span> of{' '}
                  <span className="font-semibold">{totalPages}</span> •{' '}
                  <span className="font-semibold">{totalRecords.toLocaleString()}</span> filtered records
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      <React.Fragment key={index}>
                        {page === '...' ? (
                          <span className="px-3 py-2 text-slate-400">
                            <MoreHorizontal size={18} />
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 rounded-lg transition-colors ${currentPage === page
                              ? 'bg-orange-600 text-white shadow-lg'
                              : 'border border-slate-200 hover:bg-slate-50'
                              }`}
                          >
                            {page}
                          </button>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <EditGlassMaster
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingProduct(null);
          }}
          product={editingProduct}
          onProductUpdated={handleProductAdded}
        />
      )}

      <AddGlassProductMaster
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onProductAdded={handleProductAdded}
      />
    </div>
  );
};

export default ModernGlassProductDashboard;