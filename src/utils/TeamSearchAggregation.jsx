import React, { useState, useEffect, useMemo } from 'react';

const TeamSearchAggregation = ({
  teamType,
  searchTerm,
  setSearchTerm,
  aggregatedItems,
  setCurrentPage,
  onAddStock
}) => {

  const [glassMasterData, setGlassMasterData] = useState([]);

  const loadGlassMasterData = () => {
    try {
      const stored = localStorage.getItem("glassMaster");
      if (stored && stored !== 'undefined' && stored !== 'null') {
        const data = JSON.parse(stored);
        setGlassMasterData(data);
        // console.log('TeamSearchAggregation: glassMaster loaded/updated, count:', data.length);
      } else {
        setGlassMasterData([]);
      }
    } catch (error) {
      console.error('Error loading glassMaster data:', error);
      setGlassMasterData([]);
    }
  };

  useEffect(() => {
    loadGlassMasterData();

    // Listen for storage changes from other components
    const handleStorageChange = (e) => {
      if (e.key === 'glassMaster') {
        console.log('TeamSearchAggregation: glassMaster localStorage changed, reloading...');
        loadGlassMasterData();
      }
    };

    // Listen for custom storage events dispatched by AddGlassStock
    const handleCustomStorageChange = (e) => {
      if (e.key === 'glassMaster') {
        console.log('TeamSearchAggregation: glassMaster custom storage event received');
        loadGlassMasterData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('storage', handleCustomStorageChange);

    // Periodic check with reduced frequency for reliability
    const interval = setInterval(() => {
      loadGlassMasterData();
    }, 3000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage', handleCustomStorageChange);
    };
  }, []);

  // Also reload when aggregatedItems changes (indicates data refresh)
  useEffect(() => {
    if (Object.keys(aggregatedItems).length > 0) {
      loadGlassMasterData();
    }
  }, [aggregatedItems]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];

    // console.log('TeamSearchAggregation: Computing search results with glassMaster count:', glassMasterData.length);

    return Object.entries(aggregatedItems)
      .map(([key, item]) => {
        const nameKey = `${teamType}_name`;

        // Find matching glass from master data for current available stock
        const matchedGlass = glassMasterData.find(g =>
          g.name?.toLowerCase().trim() === item[nameKey]?.toLowerCase().trim() &&
          Number(g.capacity) === Number(item.capacity) &&
          Number(g.weight) === Number(item.weight) &&
          Number(g.neck_diameter) === Number(item.neck_diameter)
        );

        const availableStock = matchedGlass?.available_stock ?? 0;

        return [
          key,
          {
            ...item,
            available_stock: availableStock
          }
        ];
      })
      .filter(([key, item]) => {
        const nameKey = `${teamType}_name`;

        // Check if searchTerm is numeric
        if (!isNaN(searchTerm) && searchTerm.trim() !== "") {
          const numSearch = Number(searchTerm);

          return (
            item.capacity === numSearch ||
            item.weight === numSearch ||
            item.neck_diameter === numSearch ||
            item.available_stock === numSearch
          );
        }

        // String-based search (case-insensitive)
        const searchLower = searchTerm.toLowerCase();

        if (item[nameKey]?.toLowerCase().includes(searchLower)) return true;

        return item.orders.some(order =>
          order.customer_name?.toLowerCase().includes(searchLower) ||
          order.manager_name?.toLowerCase().includes(searchLower) ||
          order.order_number?.toLowerCase().includes(searchLower)
        );
      });

  }, [searchTerm, aggregatedItems, glassMasterData, teamType]);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative w-[90%]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={`Search by ${teamType} name, order number, customer or manager`}
            className="w-full px-3 py-2 pl-10 pr-12 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-red-800 placeholder-red-800 text-sm"
          />

          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="w-[10%]">
          <button
            onClick={() => {
              // Find the first exact match from searchResults
              if (searchResults.length > 0) {
                const [_, firstItem] = searchResults[0]; // firstItem contains capacity, weight, etc.
                const nameKey = `${teamType}_name`;

                onAddStock({
                  name: firstItem[nameKey],
                  capacity: firstItem.capacity,
                  weight: firstItem.weight,
                  neck_diameter: firstItem.neck_diameter
                });
              }
            }}
            className="w-full px-4 py-2 bg-orange-800 text-white text-sm font-medium rounded-md hover:bg-orange-600 focus:outline-none transition-colors duration-200"
          >
            Add Stock
          </button>
        </div>
      </div>

      {searchTerm.trim() && searchResults.length > 0 && (
        <div className="bg-[#FFF0E7] rounded-lg p-4">
          <h4 className="text-sm font-semibold text-orange-800 mb-3">
            Search Results for "{searchTerm}" (Stock data: {glassMasterData.length} items loaded)
          </h4>
          <div className="space-y-3">
            {searchResults.map(([key, item]) => (
              <div key={key} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Order Quantity :</span>
                    <p className="font-semibold text-orange-900">{item.total_quantity}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Remaining :</span>
                    <p className="font-semibold text-red-600">{item.total_remaining}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Available Stock :</span>
                    <p className="font-semibold text-green-600">{item.available_stock}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Orders Count :</span>
                    <p className="font-semibold text-blue-600">{item.orders.length}</p>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Stock vs Demand :</span>
                    <span
                      className={`font-semibold ${item.available_stock >= item.total_remaining
                        ? 'text-green-600'
                        : 'text-red-600'
                        }`}
                    >
                      {item.available_stock >= item.total_remaining
                        ? `✓ Sufficient (${item.available_stock - item.total_remaining} extra)`
                        : `⚠ Short by ${item.total_remaining - item.available_stock}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamSearchAggregation;