// DecorationSequence.js - Updated functions with simplified vehicle logic

export const parseDecorationSequence = (decoSequence) => {
  if (!decoSequence || typeof decoSequence !== 'string') {
    return [];
  }
  return decoSequence.split('_').filter(Boolean);
};

export const getTeamSequencePosition = (sequence, team) => {
  return sequence.indexOf(team);
};

export const getPreviousTeam = (sequence, currentTeam) => {
  const currentIndex = getTeamSequencePosition(sequence, currentTeam);
  if (currentIndex <= 0) return null;
  return sequence[currentIndex - 1];
};

export const getNextTeam = (sequence, currentTeam) => {
  const currentIndex = getTeamSequencePosition(sequence, currentTeam);
  if (currentIndex === -1 || currentIndex >= sequence.length - 1) return null;
  return sequence[currentIndex + 1];
};

// Check if team is first in decoration sequence
export const isFirstTeamInSequence = (component, team) => {
  if (!component.deco_sequence) return false;
  const sequence = parseDecorationSequence(component.deco_sequence);
  return sequence.length > 0 && sequence[0] === team;
};

// SIMPLIFIED: Only first team can approve vehicles
export const canTeamApproveVehicles = (component, team) => {
  return isFirstTeamInSequence(component, team);
};

// SIMPLIFIED: Check if vehicles are approved (only matters for first team)
export const areVehiclesApproved = (component) => {
  if (!component.vehicle_details || component.vehicle_details.length === 0) {
    return false;
  }
  
  return component.vehicle_details.every(v => 
    v.status === "DELIVERED" || v.received === true
  );
};

// UPDATED: Simplified canTeamWork logic
export const canTeamWork = (component, team) => {
  // If no decoration sequence, team can work
  if (!component.deco_sequence) {
    return { canWork: true, reason: 'No decoration sequence defined', waitingFor: null };
  }

  const sequence = parseDecorationSequence(component.deco_sequence);
  const teamPosition = getTeamSequencePosition(sequence, team);
  
  if (teamPosition === -1) {
    return { canWork: false, reason: `${team} not in decoration sequence`, waitingFor: null };
  }

  // Check decoration approval first
  if (!component.is_deco_approved) {
    return { canWork: false, reason: 'Not decoration approved', waitingFor: 'decoration_approval' };
  }

  // If first team in sequence, check vehicle approval
  if (teamPosition === 0) {
    if (!areVehiclesApproved(component)) {
      return { canWork: false, reason: 'Vehicles not approved', waitingFor: 'vehicle_approval' };
    }
    return { canWork: true, reason: 'First team - vehicles approved', waitingFor: null };
  }

  // For subsequent teams, check if previous team has dispatched
  const previousTeam = getPreviousTeam(sequence, team);
  const previousTeamStatus = component.decorations?.[previousTeam]?.status;

  if (previousTeamStatus === 'DISPATCHED') {
    return { canWork: true, reason: 'Previous team completed', waitingFor: null };
  }
  
  return { 
    canWork: false, 
    reason: `Waiting for ${previousTeam} to dispatch`, 
    waitingFor: previousTeam 
  };
};

// SIMPLIFIED: Vehicle approval status for display
export const getVehicleApprovalStatus = (component, team) => {
  if (!canTeamApproveVehicles(component, team)) {
    return 'NOT_RESPONSIBLE';
  }
  
  if (!component.vehicle_details || component.vehicle_details.length === 0) {
    return 'NO_VEHICLES';
  }
  
  return areVehiclesApproved(component) ? 'APPROVED' : 'PENDING';
};

export const getDecorationStatus = (component, team) => {
  return component?.decorations?.[team]?.status ?? 'N/A';
};

export const hasDecorationForTeam = (component, team) => {
  return component?.decorations?.[team] && 
         component?.deco_sequence?.includes(team);
};

export const getTeamsToNotify = (decoSequence, currentTeam) => {
  const sequence = parseDecorationSequence(decoSequence);
  const currentIndex = getTeamSequencePosition(sequence, currentTeam);
  const nextTeam = getNextTeam(sequence, currentTeam);
  return nextTeam ? [nextTeam] : [];
};

// UPDATED: Simplified waiting message
export const getWaitingMessage = (component, team) => {
  const { canWork, waitingFor } = canTeamWork(component, team);
  
  if (canWork) return '';
  
  if (waitingFor === 'decoration_approval') {
    return 'Awaiting decoration approval';
  }
  
  if (waitingFor === 'vehicle_approval') {
    return 'Awaiting vehicle approval';
  }
  
  if (waitingFor) {
    const waitingStatus = getDecorationStatus(component, waitingFor);
    return `Awaiting ${waitingFor} (Status: ${waitingStatus})`;
  }

  return 'Cannot work on this component';
};