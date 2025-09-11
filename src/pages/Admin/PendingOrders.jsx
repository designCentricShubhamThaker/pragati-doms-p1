import React, { useState, useEffect } from 'react'
import { FiEdit } from "react-icons/fi";
import { TbFileInvoice } from "react-icons/tb";
import { MdDeleteOutline } from "react-icons/md";
import { Eye, ChevronRight, ChevronDown, Menu, Settings, Plus, ChevronLeft, CheckCircle } from 'lucide-react';

const PendingOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(5);
  const [error, setError] = useState(null);
  // Fetch orders data
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://pg-backend-o05l.onrender.com/api/orders');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };


  const totalPages = Math.ceil(orders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const currentOrders = orders.slice(startIndex, startIndex + ordersPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleOrdersPerPageChange = (value) => {
    setOrdersPerPage(parseInt(value));
    setCurrentPage(1);
  };
  return (
    <div>
      <main className="p-3 sm:p-6" >
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px] sm:min-h-[570px] overflow-hidden p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <button
              onClick={fetchOrders}
              className="cursor-pointer bg-orange-700 text-white flex items-center gap-2 px-3 py-1.5 rounded-sm shadow-md transition-colors duration-200 font-medium hover:bg-red-900 hover:text-white w-fit text-sm"
            >
              <Plus size={16} /> Create Order
            </button>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Show:</label>
                <select
                  value={ordersPerPage}
                  onChange={(e) => handleOrdersPerPageChange(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                </select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading orders...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600">Error: {error}</p>
              <button
                onClick={fetchOrders}
                className="mt-2 text-red-700 underline hover:text-red-800"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-[#993300] via-[#FF6600] to-[#FFB84D] text-center font-bold text-sm text-white">
                      <th className="px-2 py-3 text-center font-medium w-16">Order #</th>
                      <th className="px-2 py-3 text-left font-medium w-24">Dispatcher</th>
                      <th className="px-2 py-3 text-left font-medium w-50">Customer</th>
                      <th className="px-2 py-3 text-center font-medium w-24">Created At</th>
                      <th className="px-2 py-3 text-center font-medium w-55">Progress</th>
                      <th className="px-2 py-3 text-center font-medium w-16">Status</th>
                      <th className="px-2 py-3 text-center font-medium w-16">Items</th>
                      <th className="px-2 py-3 text-center font-medium w-16">Completed</th>
                      <th className="px-2 py-3 text-center font-medium w-12">View</th>
                      <th className="px-2 py-3 text-center font-medium w-12">Edit</th>
                      <th className="px-2 py-3 text-center font-medium w-12">Invoice</th>
                      <th className="px-2 py-3 text-center font-medium w-12">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrders.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="text-center py-4 text-gray-500">No orders found</td>
                      </tr>
                    ) : (
                      currentOrders.map((order, idx) => {
                        const rowBgColor = idx % 2 === 0
                          ? 'bg-gradient-to-r from-[#FFFFFF] via-[#FFF5EC] to-[#FFEEE0]'
                          : 'bg-gradient-to-r from-[#FFF0E6] via-[#FFDAB3] to-[#FFE6CC]';

                        return (
                          <tr key={order.order_number} className={`${rowBgColor} transition-all duration-300`}>
                            <td className="px-2 py-3 text-center text-sm font-medium text-[#FF6900]">{order.order_number}</td>
                            <td className="px-2 py-3 text-left text-sm text-[#703800]">{order.dispatcher_name}</td>
                            <td className="px-2 py-3 text-left text-sm text-[#703800]">{order.customer_name}</td>
                            <td className="px-2 py-3 text-center text-sm text-gray-700">{formatDate(order.createdAt)}</td>
                            <td className="px-2 py-3 text-center text-sm">
                              <div className="w-full flex items-center space-x-2">
                                <div className="flex-1 p-[1px] rounded-full bg-gradient-to-r from-[#993300] via-[#FF6600] to-[#cc5500]">
                                  <div className="bg-white rounded-full h-4 px-1 flex items-center overflow-hidden">
                                    <div className="bg-[#FF6900] h-2.5 rounded-full transition-all duration-500 ease-out w-[10%]"></div>
                                  </div>
                                </div>
                                <span className="text-sm font-semibold text-red-800 whitespace-nowrap transition-all duration-300">10%</span>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-center">
                              {order.order_status === "Pending" && (
                                <div className="flex justify-center">
                                  <img src="./download.svg" alt="" className='w-5 filter drop-shadow-md' />
                                </div>
                              )}
                              {order.order_status === "Completed" && (
                                <div className="flex justify-center">
                                  <CheckCircle className="text-orange-500 w-4 h-4" />
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-3 text-center text-orange-600 text-sm">2</td>
                            <td className="px-2 py-3 text-center text-orange-600 text-sm transition-all duration-300">3</td>
                            <td className="px-2 py-3 text-center">
                              <button className="flex items-center justify-center cursor-pointer p-1.5 bg-orange-600 rounded-sm text-white hover:bg-orange-500 transition-colors duration-200 shadow-sm mx-auto">
                                <Eye size={16} />
                              </button>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button className="flex items-center cursor-pointer justify-center p-1.5 bg-orange-600 rounded-sm text-white hover:bg-orange-500 transition-colors duration-200 shadow-sm mx-auto">
                                <FiEdit size={16} />
                              </button>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button className="flex items-center cursor-pointer justify-center p-1.5 bg-red-600 rounded-sm text-white hover:bg-red-700 transition-colors duration-200 shadow-sm mx-auto" aria-label="Invoice">
                                <TbFileInvoice size={16} />
                              </button>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button className="flex items-center cursor-pointer justify-center p-1.5 bg-red-600 rounded-sm text-white hover:bg-red-700 transition-colors duration-200 shadow-sm mx-auto" aria-label="Delete order">
                                <MdDeleteOutline size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card Layout */}
              <div className="lg:hidden space-y-4">
                {currentOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No orders found</div>
                ) : (
                  currentOrders.map((order, idx) => (
                    <div key={order.order_number} className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
                      {/* Order Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-orange-600">#{order.order_number}</span>
                          <div className="flex items-center">
                            {order.order_status === "Pending" && (
                              <img src="./download.svg" alt="" className='w-4 filter drop-shadow-md' />
                            )}
                            {order.order_status === "Completed" && (
                              <CheckCircle className="text-orange-500 w-4 h-4" />
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-600">{formatDate(order.createdAt)}</span>
                      </div>

                      {/* Order Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Dispatcher</p>
                          <p className="text-sm font-medium text-gray-800">{order.dispatcher_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Customer</p>
                          <p className="text-sm font-medium text-gray-800">{order.customer_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Items</p>
                          <p className="text-sm font-medium text-orange-600">2</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
                          <p className="text-sm font-medium text-orange-600">3</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Progress</p>
                          <span className="text-sm font-semibold text-red-800">10%</span>
                        </div>
                        <div className="w-full p-[1px] rounded-full bg-gradient-to-r from-[#993300] via-[#FF6600] to-[#cc5500]">
                          <div className="bg-white rounded-full h-3 flex items-center overflow-hidden">
                            <div className="bg-[#FF6900] h-2 rounded-full transition-all duration-500 ease-out w-[10%]"></div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex gap-2">
                          <button className="flex items-center justify-center p-2 bg-orange-600 rounded text-white hover:bg-orange-500 transition-colors duration-200 shadow-sm">
                            <Eye size={16} />
                          </button>
                          <button className="flex items-center justify-center p-2 bg-orange-600 rounded text-white hover:bg-orange-500 transition-colors duration-200 shadow-sm">
                            <FiEdit size={16} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button className="flex items-center justify-center p-2 bg-red-600 rounded text-white hover:bg-red-700 transition-colors duration-200 shadow-sm" aria-label="Invoice">
                            <TbFileInvoice size={16} />
                          </button>
                          <button className="flex items-center justify-center p-2 bg-red-600 rounded text-white hover:bg-red-700 transition-colors duration-200 shadow-sm" aria-label="Delete order">
                            <MdDeleteOutline size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                  <div className="text-sm text-gray-700 text-center sm:text-left">
                    Showing {startIndex + 1} to {Math.min(startIndex + ordersPerPage, orders.length)} of {orders.length} entries
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1.5 border border-gray-300 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Previous</span>
                    </button>

                    <div className="flex gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        // Show only current page and adjacent pages on mobile
                        if (window.innerWidth < 640) {
                          if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                            return (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-2 sm:px-3 py-1.5 text-sm font-medium rounded ${currentPage === page
                                  ? 'bg-orange-600 text-white'
                                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="px-1 text-gray-400">...</span>;
                          }
                          return null;
                        } else {
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1.5 text-sm font-medium rounded ${currentPage === page
                                ? 'bg-orange-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                              {page}
                            </button>
                          );
                        }
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1.5 border border-gray-300 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main >
    </div>

  )
}

export default PendingOrders