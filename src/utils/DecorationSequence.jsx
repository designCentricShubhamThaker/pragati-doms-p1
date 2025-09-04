// DecorationSequence.js - Simplified logic

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

export const isFirstTeamInSequence = (component, team) => {
  if (!component.deco_sequence) return false;
  const sequence = parseDecorationSequence(component.deco_sequence);
  return sequence.length > 0 && sequence[0] === team;
};

export const canTeamApproveVehicles = (component, team) => {
  return isFirstTeamInSequence(component, team);
};

// SIMPLIFIED: Check vehicle approval status for UI
export const getVehicleApprovalStatus = (component, team) => {
  const isFirstTeam = isFirstTeamInSequence(component, team);

  if (!component.vehicle_details || component.vehicle_details.length === 0) {
    return isFirstTeam ? 'NO_VEHICLES' : 'NOT_RESPONSIBLE';
  }

  const allApproved = component.vehicle_details.every(v =>
    v.status === "DELIVERED" || v.received === true
  );

  if (isFirstTeam) {
    return allApproved ? 'APPROVED' : 'PENDING';
  } else {
    return allApproved ? 'APPROVED' : 'WAITING_FOR_FIRST_TEAM';
  }
};

// MAIN LOGIC: Simplified team work logic
export const canTeamWork = (component, team) => {
  if (!component.deco_sequence) {
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

  // First team can always work once decoration approved (vehicle approval is independent)
  if (teamPosition === 0) {
    return { canWork: true, reason: 'First team ready', waitingFor: null };
  }

  // Subsequent teams wait for previous team to dispatch
  const previousTeam = getPreviousTeam(sequence, team);
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

export const getDecorationStatus = (component, team) => {
  return component?.decorations?.[team]?.status ?? 'N/A';
};

// UTILITY: Check if component has decoration for team
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
    case null:
      return reason || 'Cannot work';
    default:
      return `Waiting for ${waitingFor}`;
  }
};