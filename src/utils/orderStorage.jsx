
export const getStorageKey = (team) => `${team}_allOrders`;

export const getLocalStorageData = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setLocalStorageData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {

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

// Helper to check if team is a decoration team
const isDecorationTeam = (team) => {
  return ['printing', 'coating', 'frosting', 'foiling', 'metalized'].includes(team);
};

export const splitOrdersByTeamStatus = (orders, team) => {
  const inProgressOrders = [];
  const readyToDispatchOrders = [];
  const dispatchedOrders = [];

  orders.forEach(order => {
    const inProgressItems = [];
    const readyToDispatchItems = [];
    const dispatchedItems = [];

    order.items.forEach(item => {
      const inProgressComponents = [];
      const readyToDispatchComponents = [];
      const dispatchedComponents = [];

      item.components.forEach(component => {
        if (team === 'glass' && component.component_type === 'glass') {
          // For glass team, use component-level status
          if (component.status === "IN_PROGRESS" || component.status === "PENDING") {
            inProgressComponents.push(component);
          } else if (component.status === "READY_TO_DISPATCH") {
            readyToDispatchComponents.push(component);
          } else if (component.status === "DISPATCHED") {
            dispatchedComponents.push(component);
          }
        } else if (isDecorationTeam(team) && component.component_type === 'glass') {
          // For all decoration teams, check if component has respective decorations and use decoration status
          if (component.decorations?.[team]) {
            const decorationStatus = component.decorations[team].status;
            
            if (decorationStatus === "IN_PROGRESS" || decorationStatus === "PENDING") {
              inProgressComponents.push(component);
            } else if (decorationStatus === "READY_TO_DISPATCH") {
              readyToDispatchComponents.push(component);
            } else if (decorationStatus === "DISPATCHED") {
              dispatchedComponents.push(component);
            }
          }
        } else if (component.component_type === team) {
          // For other teams, use component-level status
          if (component.status === "IN_PROGRESS" || component.status === "PENDING") {
            inProgressComponents.push(component);
          } else if (component.status === "READY_TO_DISPATCH") {
            readyToDispatchComponents.push(component);
          } else if (component.status === "DISPATCHED") {
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
      inProgressOrders.push({ ...order, items: inProgressItems });
    }
    if (readyToDispatchItems.length > 0) {
      readyToDispatchOrders.push({ ...order, items: readyToDispatchItems });
    }
    if (dispatchedItems.length > 0) {
      dispatchedOrders.push({ ...order, items: dispatchedItems });
    }
  });

  return {
    inProgressOrders,
    readyToDispatchOrders,
    dispatchedOrders
  };
};

export const getOrdersByStatus = (team, status, forPrinting = false, allOrders = null) => {
  const storageKey = getStorageKey(team);
  const orders = allOrders || getLocalStorageData(storageKey) || [];
  
  return orders.filter(order => {
    return order.items?.some(item => 
      item.components?.some(component => {
        if (isDecorationTeam(team) && component.component_type === 'glass') {
          // For all decoration teams, check decoration status
          if (!component.decorations?.[team]) return false;
          
          const decorationStatus = component.decorations[team].status;
          return (
            (status === 'in_progress' && (decorationStatus === 'IN_PROGRESS' || decorationStatus === 'PENDING')) ||
            (status === 'ready_to_dispatch' && decorationStatus === 'READY_TO_DISPATCH') ||
            (status === 'dispatched' && decorationStatus === 'DISPATCHED')
          );
        } else {
          // For glass team and other teams, use component status
          return component.component_type === team && 
            (
              (status === 'in_progress' && (component.status === 'IN_PROGRESS' || component.status === 'PENDING')) ||
              (status === 'ready_to_dispatch' && component.status === 'READY_TO_DISPATCH') ||
              (status === 'dispatched' && component.status === 'DISPATCHED')
            );
        }
      })
    );
  }).map(order => {
    const filteredItems = order.items?.map(item => {
      const relevantComponents = item.components?.filter(component => {
        if (isDecorationTeam(team) && component.component_type === 'glass') {
          if (!component.decorations?.[team]) return false;
          
          const decorationStatus = component.decorations[team].status;
          return (
            (status === 'in_progress' && (decorationStatus === 'IN_PROGRESS' || decorationStatus === 'PENDING')) ||
            (status === 'ready_to_dispatch' && decorationStatus === 'READY_TO_DISPATCH') ||
            (status === 'dispatched' && decorationStatus === 'DISPATCHED')
          );
        } else {
          return component.component_type === team && 
            (
              (status === 'in_progress' && (component.status === 'IN_PROGRESS' || component.status === 'PENDING')) ||
              (status === 'ready_to_dispatch' && component.status === 'READY_TO_DISPATCH') ||
              (status === 'dispatched' && component.status === 'DISPATCHED')
            );
        }
      }) || [];
      
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
  
  setLolStorageData(storageKey, allOrders);
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

export const initializeLocalStorage = async (team, filterOrderFn, forPrinting = false) => {
  const storageKey = getStorageKey(team);
  
  try {
    const response = await fetch('https://doms-k1fi.onrender.com/api/orders/');
    if (!response.ok) throw new Error('Failed to fetch orders');
    const allOrders = await response.json() || [];
    
    const filteredOrders = allOrders.orders
      .map(order => {
        const filteredItems = filterOrderFn(order.items || []);
        return filteredItems.length > 0 ? { ...order, items: filteredItems } : null;
      })
      .filter(order => order !== null);
    
    setLocalStorageData(storageKey, filteredOrders);

    // Use the updated splitOrdersByTeamStatus with proper team handling
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
    throw error;
  }
};

// Generic function for all decoration teams
export const splitOrdersByDecorationStatus = (orders, decorationType) => {
  const inProgressOrders = [];
  const readyToDispatchOrders = [];
  const dispatchedOrders = [];

  orders.forEach(order => {
    const inProgressItems = [];
    const readyToDispatchItems = [];
    const dispatchedItems = [];

    order.items.forEach(item => {
      const inProgressComponents = [];
      const readyToDispatchComponents = [];
      const dispatchedComponents = [];

      item.components.forEach(component => {
        if (component.component_type === 'glass' && component.decorations?.[decorationType]) {
          const decorationStatus = component.decorations[decorationType].status;
          
          if (decorationStatus === "IN_PROGRESS" || decorationStatus === "PENDING") {
            inProgressComponents.push(component);
          } else if (decorationStatus === "READY_TO_DISPATCH") {
            readyToDispatchComponents.push(component);
          } else if (decorationStatus === "DISPATCHED") {
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
      inProgressOrders.push({ ...order, items: inProgressItems });
    }
    if (readyToDispatchItems.length > 0) {
      readyToDispatchOrders.push({ ...order, items: readyToDispatchItems });
    }
    if (dispatchedItems.length > 0) {
      dispatchedOrders.push({ ...order, items: dispatchedItems });
    }
  });

  return {
    inProgressOrders,
    readyToDispatchOrders,
    dispatchedOrders
  };
};

// Keep the existing function for backward compatibility
export const splitOrdersByTeamStatusForPrinting = (orders, team) => {
  return splitOrdersByDecorationStatus(orders, 'printing');
};

// New functions for other decoration teams
export const splitOrdersByTeamStatusForCoating = (orders) => {
  return splitOrdersByDecorationStatus(orders, 'coating');
};

export const splitOrdersByTeamStatusForFrosting = (orders) => {
  return splitOrdersByDecorationStatus(orders, 'frosting');
};

export const splitOrdersByTeamStatusForFoiling = (orders) => {
  return splitOrdersByDecorationStatus(orders, 'foiling');
};

export const splitOrdersByTeamStatusForMetalized = (orders) => {
  return splitOrdersByDecorationStatus(orders, 'metalized');
};

export const getAllOrdersForTeam = (team) => {
  const storageKey = getStorageKey(team);
  return getLocalStorageData(storageKey) || [];
};

export const updateOrderInLocalStorage = (team, updatedOrder) => {
  console.log("updated order",updatedOrder)
  try {
    const storageKey = getStorageKey(team);
    const stored = getLocalStorageData(storageKey);
    if (!stored) return;

    const allOrders = stored;

    const orderIndex = allOrders.findIndex(
      o => o.order_number === updatedOrder.order_number
    );

    if (orderIndex === -1) {
      return;
    }

    const currentOrder = allOrders[orderIndex];

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
    console.log(mergedOrder,"merged ")
    allOrders[orderIndex] = mergedOrder;
    setLocalStorageData(storageKey, allOrders);
  } catch {
 
  }
};