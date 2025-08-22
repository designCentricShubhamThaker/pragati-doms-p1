export const getStorageKey = (team) => `${team}_allOrders`;

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
  const pending = [];
  const completed = [];

  orders.forEach(order => {
    if (isOrderCompletedFn(order)) {
      completed.push(order);
    } else {
      pending.push(order);
    }
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

  return {
    inProgressOrders,
    readyToDispatchOrders,
    dispatchedOrders
  };
};

export const getOrdersByStatus = (team, status) => {
  const storageKey = getStorageKey(team);
  const allOrders = getLocalStorageData(storageKey) || [];
  
  return allOrders.filter(order => {
    return order.items?.some(item => 
      item.components?.some(component => 
        component.component_type === team && 
        (
          (status === 'in_progress' && (component.status === 'IN_PROGRESS' || component.status === 'PENDING')) ||
          (status === 'ready_to_dispatch' && component.status === 'READY_TO_DISPATCH') ||
          (status === 'dispatched' && component.status === 'DISPATCHED')
        )
      )
    );
  }).map(order => {

    const filteredItems = order.items?.map(item => {
      const relevantComponents = item.components?.filter(component => 
        component.component_type === team && 
        (
          (status === 'in_progress' && (component.status === 'IN_PROGRESS' || component.status === 'PENDING')) ||
          (status === 'ready_to_dispatch' && component.status === 'READY_TO_DISPATCH') ||
          (status === 'dispatched' && component.status === 'DISPATCHED')
        )
      ) || [];
      
      return relevantComponents.length > 0 ? { ...item, components: relevantComponents } : null;
    }).filter(Boolean) || [];
    
    return filteredItems.length > 0 ? { ...order, items: filteredItems } : null;
  }).filter(Boolean);
};

export const updateOrderInStorage = (team, updatedOrder) => {
  const storageKey = getStorageKey(team);
  const allOrders = getLocalStorageData(storageKey) || [];
  
  const index = allOrders.findIndex(order => order.order_number === updatedOrder.order_number);
  if (index !== -1) {
    allOrders[index] = updatedOrder;
  } else {
    allOrders.push(updatedOrder);
  }
  
  setLocalStorageData(storageKey, allOrders);
};

export const updateComponentStatus = (team, orderNumber, componentId, newStatus) => {
  const storageKey = getStorageKey(team);
  const allOrders = getLocalStorageData(storageKey) || [];
  
  const orderIndex = allOrders.findIndex(order => order.order_number === orderNumber);
  if (orderIndex === -1) return false;
  
  let updated = false;
  allOrders[orderIndex].items?.forEach(item => {
    item.components?.forEach(component => {
      if (component.id === componentId && component.component_type === team) {
        component.status = newStatus;
        updated = true;
      }
    });
  });
  
  if (updated) {
    setLocalStorageData(storageKey, allOrders);
  }
  
  return updated;
};

export const initializeLocalStorage = async (team, filterOrderFn) => {
  const storageKey = getStorageKey(team);
  
  try {
    const response = await fetch('https://doms-k1fi.onrender.com/api/orders/');
    if (!response.ok) throw new Error('Failed to fetch orders');
    const allOrders = await response.json() || [];
    
    console.log(allOrders, "ALL ORDERS");
    
    const filteredOrders = allOrders
      .map(order => {
        const filteredItems = filterOrderFn(order.items || []);
        return filteredItems.length > 0 ? { ...order, items: filteredItems } : null;
      })
      .filter(order => order !== null);
    
    setLocalStorageData(storageKey, filteredOrders);
    

    const {
      inProgressOrders,
      readyToDispatchOrders,
      dispatchedOrders
    } = splitOrdersByTeamStatus(filteredOrders, team);
    
    return {
      allOrders: filteredOrders,
      inProgressOrders,
      readyToDispatchOrders,
      dispatchedOrders
    };
  } catch (error) {
    console.error('Error initializing localStorage:', error);
    throw error;
  }
};

export const getAllOrdersForTeam = (team) => {
  const storageKey = getStorageKey(team);
  return getLocalStorageData(storageKey) || [];
};


 export const updateOrderInLocalStorage = (team ,updatedOrder) => {
  try {
    const storageKey = getStorageKey(team);
    const stored = getLocalStorageData(storageKey);
    if (!stored) return;

    console.log(stored,"stored")
    const allOrders = stored;

    const orderIndex = allOrders.findIndex(
      o => o._id === updatedOrder._id || o.order_number === updatedOrder.order_number
    );

    if (orderIndex === -1) {
      console.warn("Order not found in localStorage");
      return;
    }

    const currentOrder = allOrders[orderIndex];

    // Merge deeply only updated fields
    const mergedOrder = {
      ...currentOrder,
      ...updatedOrder,
      items: currentOrder.items.map(item => {
        const updatedItem = updatedOrder.items?.find(ui => ui.item_id === item.item_id);
        if (!updatedItem) return item;

        return {
          ...item,
          ...updatedItem,
          components: item.components.map(comp => {
            const updatedComp = updatedItem.components?.find(uc => uc.component_id === comp.component_id);
            return updatedComp ? { ...comp, ...updatedComp } : comp;
          })
        };
      })
    };

    allOrders[orderIndex] = mergedOrder;
    console.log(allOrders,"allOrder")
    setLocalStorageData(storageKey,allOrders);

    console.log("Order updated in localStorage:", mergedOrder);
  } catch (err) {
    console.error("Failed to update localStorage order", err);
  }
};