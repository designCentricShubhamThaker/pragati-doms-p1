export const getStorageKeys = (team) => ({
  IN_PROGRESS: `${team}_inProgressOrder`,
  READY_TO_DISPATCH: `${team}_readyToDispatchOrder`,
  DISPATCHED: `${team}_dispatchedOrders`
});

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

export const splitOrdersByStatus = (orders, isOrderCompletedFn) => {
  console.log(isOrderCompletedFn, "Function Order")
  const pending = [];
  const completed = [];

  orders.forEach(order => {
    if (isOrderCompletedFn(order)) {
      completed.push(order);
    }
    else pending.push(order);
  });

  return { pendingOrders: pending, completedOrders: completed };
};

export const splitOrdersByTeamStatus = (orders, team) => {
  console.log("🔍 splitOrdersByTeamStatus called");
  console.log("📦 Orders received:", orders);
  console.log("👥 Team filter:", team);

  const inProgressOrders = [];
  const readyToDispatchOrders = [];
  const dispatchedOrders = [];

  orders.forEach((order, orderIndex) => {
    console.log(`\n➡️ Processing Order #${orderIndex + 1}:`, order.order_number);

    const inProgressItems = [];
    const readyToDispatchItems = [];
    const dispatchedItems = [];

    order.items.forEach((item, itemIndex) => {
      console.log(`  🛠 Item #${itemIndex + 1}:`, item.item_name);

      const inProgressComponents = [];
      const readyToDispatchComponents = [];
      const dispatchedComponents = [];

      item.components.forEach((component, compIndex) => {
        console.log(`    🔹 Component #${compIndex + 1}:`, component.name, "| Type:", component.component_type, "| Status:", component.status);

        if (component.component_type === team) {
          if (component.status === "IN_PROGRESS" || component.status === "PENDING") {
            console.log("      ✅ Added to IN_PROGRESS");
            inProgressComponents.push(component);
          } else if (component.status === "READY_TO_DISPATCH") {
            console.log("      📦 Added to READY_TO_DISPATCH");
            readyToDispatchComponents.push(component);
          } else if (component.status === "DISPATCHED") {
            console.log("      🚚 Added to DISPATCHED");
            dispatchedComponents.push(component);
          }
        }
      });

      if (inProgressComponents.length > 0) {
        inProgressItems.push({ ...item, components: inProgressComponents });
      }
      if (readyToDispatchComponents.length > 0) {
        readyToDispatchItems.push({ ...item, components: readyToDispatchComponents });
      }
      if (dispatchedComponents.length > 0) {
        dispatchedItems.push({ ...item, components: dispatchedComponents });
      }
    });

    if (inProgressItems.length > 0) {
      console.log("  ➕ Order added to IN_PROGRESS");
      inProgressOrders.push({ ...order, items: inProgressItems });
    }
    if (readyToDispatchItems.length > 0) {
      console.log("  ➕ Order added to READY_TO_DISPATCH");
      readyToDispatchOrders.push({ ...order, items: readyToDispatchItems });
    }
    if (dispatchedItems.length > 0) {
      console.log("  ➕ Order added to DISPATCHED");
      dispatchedOrders.push({ ...order, items: dispatchedItems });
    }
  });

  console.log("\n📊 Final Results:");
  console.log("  IN_PROGRESS Orders:", inProgressOrders);
  console.log("  READY_TO_DISPATCH Orders:", readyToDispatchOrders);
  console.log("  DISPATCHED Orders:", dispatchedOrders);

  return {
    inProgressOrders,
    readyToDispatchOrders,
    dispatchedOrders
  };
};

export const updateOrderInStorage = (team, updatedOrder, status) => {
  const key = getStorageKeys(team)[status.toUpperCase()];
  const orders = getLocalStorageData(key) || [];
  const index = orders.findIndex(order => order.order_number === updatedOrder.order_number);
  if (index !== -1) {
    orders[index] = updatedOrder;
    setLocalStorageData(key, orders);
  }
};

export const moveOrderInStorage = (team, orderNumber, fromStatus, toStatus) => {
  const fromKey = getStorageKeys(team)[fromStatus.toUpperCase()];
  const toKey = getStorageKeys(team)[toStatus.toUpperCase()];
  const fromOrders = getLocalStorageData(fromKey) || [];
  const toOrders = getLocalStorageData(toKey) || [];
  const index = fromOrders.findIndex(order => order.order_number === orderNumber);
  if (index === -1) return;
  const [movedOrder] = fromOrders.splice(index, 1);
  toOrders.push(movedOrder);
  setLocalStorageData(fromKey, fromOrders);
  setLocalStorageData(toKey, toOrders);
};


export const initializeLocalStorage = async (team, filterOrderFn) => {
  const keys = getStorageKeys(team);

  const response = await fetch('https://doms-k1fi.onrender.com/api/orders/');
  if (!response.ok) throw new Error('Failed to fetch orders');
  const allOrders = await response.json() || [];

  const filteredOrders = allOrders
    .map(order => {
      const filteredItems = filterOrderFn(order.items || []);
      return filteredItems.length > 0 ? { ...order, items: filteredItems } : null;
    })
    .filter(order => order !== null);


  const {
    inProgressOrders,
    readyToDispatchOrders,
    dispatchedOrders
  } = splitOrdersByTeamStatus(filteredOrders, team);

  // Save in local storage
  setLocalStorageData(keys.IN_PROGRESS, inProgressOrders);
  setLocalStorageData(keys.READY_TO_DISPATCH, readyToDispatchOrders);
  setLocalStorageData(keys.DISPATCHED, dispatchedOrders);

  return {
    inProgressOrders,
    readyToDispatchOrders,
    dispatchedOrders
  };
};
