export const getStorageKey = (team) => `${team}_orders`;

export const getLocalStorageData = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return null;
  }
};

export const setLocalStorageData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
};

export const filterOrdersByType = (orders, orderType, team) => {
  if (!orders || !Array.isArray(orders)) return [];

  return orders
    .map(order => {
      const filteredItems = order.items
        ?.map(item => {
          const filteredComponents = item.components?.filter(component => {
            if (component.component_type !== team) return false;
            
            switch (orderType) {
              case 'in_progress':
                return component.status === "IN_PROGRESS" || component.status === "PENDING";
              case 'ready_to_dispatch':
                return component.status === "READY_TO_DISPATCH";
              case 'dispatched':
                return component.status === "DISPATCHED";
              default:
                return false;
            }
          }) || [];

          return filteredComponents.length > 0 ? { ...item, components: filteredComponents } : null;
        })
        .filter(item => item !== null) || [];

      return filteredItems.length > 0 ? { ...order, items: filteredItems } : null;
    })
    .filter(order => order !== null);
};

export const splitOrdersByTeamStatus = (orders, team) => {
  console.log("🔍 splitOrdersByTeamStatus called");
  console.log("📦 Orders received:", orders);
  console.log("👥 Team filter:", team);

  const processedOrders = [];

  orders.forEach((order, orderIndex) => {
    console.log(`\n➡️ Processing Order #${orderIndex + 1}:`, order.order_number);

    const teamItems = [];

    order.items.forEach((item, itemIndex) => {
      console.log(`  🛠 Item #${itemIndex + 1}:`, item.item_name);

      const teamComponents = item.components.filter(component => {
        console.log(`    🔹 Component:`, component.name, "| Type:", component.component_type, "| Status:", component.status);
        return component.component_type === team;
      });

      if (teamComponents.length > 0) {
        teamItems.push({ ...item, components: teamComponents });
        console.log("      ✅ Added to team items");
      }
    });

    if (teamItems.length > 0) {
      console.log("  ➕ Order added to processed orders");
      processedOrders.push({ ...order, items: teamItems });
    }
  });

  console.log("\n📊 Final Results:");
  console.log("  Processed Orders:", processedOrders);

  return processedOrders;
};

export const updateOrderInStorage = (team, updatedOrder) => {
  const key = getStorageKey(team);
  const orders = getLocalStorageData(key) || [];
  const index = orders.findIndex(order => order.order_number === updatedOrder.order_number);
  
  if (index !== -1) {
    orders[index] = updatedOrder;
    setLocalStorageData(key, orders);
  }
  
  return orders;
};

export const initializeLocalStorage = async (team, filterOrderFn) => {
  const key = getStorageKey(team);

  const response = await fetch('https://doms-k1fi.onrender.com/api/orders/');
  if (!response.ok) throw new Error('Failed to fetch orders');
  const allOrders = await response.json() || [];

  const filteredOrders = allOrders
    .map(order => {
      const filteredItems = filterOrderFn(order.items || []);
      return filteredItems.length > 0 ? { ...order, items: filteredItems } : null;
    })
    .filter(order => order !== null);

  const processedOrders = splitOrdersByTeamStatus(filteredOrders, team);

  // Save in single storage key
  setLocalStorageData(key, processedOrders);

  return processedOrders;
};