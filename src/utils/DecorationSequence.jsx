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

// SIMPLIFIED: Vehicle approval status - no complex team-specific logic
export const getVehicleApprovalStatus = (component) => {
  const vehicleDetails = component?.vehicle_details;
  
  if (!Array.isArray(vehicleDetails) || vehicleDetails.length === 0) {
    return 'NO_VEHICLES';
  }

  const allApproved = vehicleDetails.every(v => 
    v.approved || v.status === "DELIVERED"
  );
  
  return allApproved ? 'APPROVED' : 'PENDING';
};
// SIMPLIFIED: Only first team in sequence can approve vehicles
export const canTeamMarkVehiclesDelivered = (component, teamName) => {
  if (!component || !teamName) return false;
  return isFirstTeamInSequence(component, teamName);
};
// SIMPLIFIED: Main work logic - now checks vehicle approval for first team
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

  // First team can work once decoration approved, but needs vehicle approval if vehicles exist
  if (teamPosition === 0) {
    const vehicleStatus = getVehicleApprovalStatus(component);
    if (vehicleStatus === 'PENDING') {
      return { canWork: false, reason: 'Vehicles need approval', waitingFor: 'vehicle_approval' };
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
  const canApprove = canTeamApproveVehicles(component, team);
  const isFirstTeam = isFirstTeamInSequence(component, team);

  return {
    vehicles: vehicleDetails,
    count: vehicleDetails.length,
    status: approvalStatus,
    canApprove: canApprove,
    isResponsible: isFirstTeam,
    needsApproval: approvalStatus === 'PENDING' && vehicleDetails.length > 0,
    message: getVehicleStatusMessage(approvalStatus, canApprove, vehicleDetails.length)
  };
};

// Helper function for vehicle status messages
const getVehicleStatusMessage = (status, canApprove, vehicleCount) => {
  if (vehicleCount === 0) return 'No vehicles assigned';
  
  switch (status) {
    case 'APPROVED':
      return 'All vehicles approved';
    case 'PENDING':
      if (canApprove) {
        return `${vehicleCount} vehicle(s) need approval`;
      } else {
        return `Waiting for vehicle approval (${vehicleCount} vehicle(s))`;
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
    case 'vehicle_approval':
      return 'Vehicles need approval';
    case null:
      return reason || 'Cannot work';
    default:
      return `Waiting for ${waitingFor}`;
  }
};

// NEW: Check if component is relevant to team (for filtering)
export const isComponentRelevantToTeam = (component, team) => {
  if (!component || !component.deco_sequence) return false;
  const sequence = parseDecorationSequence(component.deco_sequence);
  return sequence.includes(team);
};