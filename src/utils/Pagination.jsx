import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({
  currentPage,
  totalPages,
  ordersPerPage,
  filteredOrders,
  orders,
  searchTerm,
  handlePageChange,
}) => {
  if (totalPages <= 1) return null;

  const pageNumbers = [];
  const maxVisiblePages = window.innerWidth < 640 ? 3 : 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
      <div className="text-sm text-gray-500 order-2 sm:order-1">
        Showing {indexOfFirstOrder + 1} to{" "}
        {Math.min(indexOfLastOrder, filteredOrders.length)} of{" "}
        {filteredOrders.length}
        {searchTerm ? " filtered" : ""} orders
        {orders.length !== filteredOrders.length && (
          <span className="text-orange-600 ml-1">
            (from {orders.length} total)
          </span>
        )}
      </div>

      <div className="flex items-center space-x-1 order-1 sm:order-2">
        {/* Prev */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Numbers */}
        {pageNumbers.map((number) => (
          <button
            key={number}
            onClick={() => handlePageChange(number)}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              currentPage === number
                ? "bg-orange-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {number}
          </button>
        ))}

        {/* Next */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
