// Simplified utility functions for decoration team logic

export const parseDecorationSequence = (decoSequence) => {
  if (!decoSequence || typeof decoSequence !== 'string') {
    return [];
  }
  return decoSequence.split('_').filter(Boolean);
};

export const getTeamSequencePosition = (sequence, team) => {
  return sequence.indexOf(team);
};

export const isFirstTeamInSequence = (component, team) => {
  if (!component || !component.deco_sequence) return false;
  const sequence = parseDecorationSequence(component.deco_sequence);
  return sequence.length > 0 && sequence[0] === team;
};

// SIMPLIFIED: Vehicle approval status
export const getVehicleApprovalStatus = (component) => {
  const vehicleDetails = component?.vehicle_details;
  
  if (!Array.isArray(vehicleDetails) || vehicleDetails.length === 0) {
    return 'NO_VEHICLES';
  }

  const allDelivered = vehicleDetails.every(v => 
    v.status === "DELIVERED" || v.received === true
  );
  
  return allDelivered ? 'APPROVED' : 'PENDING';
};

// SIMPLIFIED: Only first team in sequence can mark vehicles as delivered
export const canTeamMarkVehiclesDelivered = (component, teamName) => {
  if (!component || !teamName) return false;
  return isFirstTeamInSequence(component, teamName);
};

// SIMPLIFIED: Main work logic
export const canTeamWork = (component, team) => {
  if (!component || !component.deco_sequence) {
    return { canWork: true, reason: 'No decoration sequence', waitingFor: null };
  }

  const sequence = parseDecorationSequence(component.deco_sequence);
  const teamPosition = getTeamSequencePosition(sequence, team);

  // Team not in sequence
  if (teamPosition === -1) {
    return { canWork: false, reason: `${team} not in sequence`, waitingFor: null };
  }

  // Must be decoration approved first
  if (!component.is_deco_approved) {
    return { canWork: false, reason: 'Not decoration approved', waitingFor: 'decoration_approval' };
  }

  // First team can work once decoration approved, but needs vehicles delivered if vehicles exist
  if (teamPosition === 0) {
    const vehicleStatus = getVehicleApprovalStatus(component);
    if (vehicleStatus === 'PENDING') {
      return { canWork: false, reason: 'Vehicles need to be marked as delivered', waitingFor: 'vehicle_delivery' };
    }
    return { canWork: true, reason: 'First team ready', waitingFor: null };
  }

  // Subsequent teams wait for previous team to dispatch
  const previousTeam = sequence[teamPosition - 1];
  const previousTeamStatus = component.decorations?.[previousTeam]?.status;

  if (previousTeamStatus === 'DISPATCHED') {
    return { canWork: true, reason: `${previousTeam} completed`, waitingFor: null };
  }

  return {
    canWork: false,
    reason: `Waiting for ${previousTeam}`,
    waitingFor: previousTeam
  };
};

// SIMPLIFIED: Get vehicle info for UI display
export const getVehicleInfo = (component, team) => {
  const vehicleDetails = component?.vehicle_details || [];
  const approvalStatus = getVehicleApprovalStatus(component);
  const canMarkDelivered = canTeamMarkVehiclesDelivered(component, team);
  const isFirstTeam = isFirstTeamInSequence(component, team);

  return {
    vehicles: vehicleDetails,
    count: vehicleDetails.length,
    status: approvalStatus,
    canMarkDelivered: canMarkDelivered,
    isResponsible: isFirstTeam,
    needsDelivery: approvalStatus === 'PENDING' && vehicleDetails.length > 0,
    message: getVehicleStatusMessage(approvalStatus, canMarkDelivered, vehicleDetails.length)
  };
};

// Helper function for vehicle status messages
const getVehicleStatusMessage = (status, canMarkDelivered, vehicleCount) => {
  if (vehicleCount === 0) return 'No vehicles assigned';
  
  switch (status) {
    case 'APPROVED':
      return 'All vehicles delivered ✓';
    case 'PENDING':
      if (canMarkDelivered) {
        return `${vehicleCount} vehicle(s) need to be marked as delivered`;
      } else {
        return `Waiting for vehicle delivery confirmation (${vehicleCount} vehicle(s))`;
      }
    default:
      return 'Checking vehicle status...';
  }
};

export const getDecorationStatus = (component, team) => {
  return component?.decorations?.[team]?.status ?? 'N/A';
};

export const hasDecorationForTeam = (component, team) => {
  return component?.decorations?.[team] &&
    component?.deco_sequence?.includes(team);
};

// SIMPLIFIED: Get waiting message for UI
export const getWaitingMessage = (component, team) => {
  const { canWork, reason, waitingFor } = canTeamWork(component, team);

  if (canWork) return '';

  switch (waitingFor) {
    case 'decoration_approval':
      return 'Awaiting decoration approval';
    case 'vehicle_delivery':
      return 'Vehicles need to be marked as delivered';
    case null:
      return reason || 'Cannot work';
    default:
      return `Waiting for ${waitingFor}`;
  }
};

// Check if component is relevant to team (for filtering)
export const isComponentRelevantToTeam = (component, team) => {
  if (!component || !component.deco_sequence) return false;
  const sequence = parseDecorationSequence(component.deco_sequence);
  return sequence.includes(team);
};