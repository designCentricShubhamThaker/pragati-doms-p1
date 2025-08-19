import { useCallback } from "react";

export const useInventoryCalculations = () => {
  const calculateTrackingTotals = useCallback((tracking) => {
    if (!tracking || !Array.isArray(tracking)) {
      return {
        totalProduced: 0,
        totalStockUsed: 0,
        totalCompleted: 0,
      };
    }

    const totals = tracking.reduce(
      (acc, entry) => {
        acc.totalProduced += entry.quantity_produced || 0;
        acc.totalStockUsed += entry.stock_used || 0;
        return acc;
      },
      { totalProduced: 0, totalStockUsed: 0 }
    );

    const latestEntry = tracking[tracking.length - 1];
    totals.totalCompleted = latestEntry?.total_completed || 0;

    return totals;
  }, []);

  const getCalculatedInventoryUsed = useCallback(
    (component) => {
      if (!component?.tracking) return 0;
      return calculateTrackingTotals(component.tracking).totalStockUsed;
    },
    [calculateTrackingTotals]
  );

  const getCalculatedQuantityProduced = useCallback(
    (component) => {
      if (!component?.tracking) return 0;
      return calculateTrackingTotals(component.tracking).totalProduced;
    },
    [calculateTrackingTotals]
  );

  return { calculateTrackingTotals, getCalculatedInventoryUsed, getCalculatedQuantityProduced };
};
