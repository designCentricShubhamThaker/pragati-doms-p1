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

// Simple vehicle status check
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

// SIMPLIFIED: Glass edit check - only what's needed
export const canGlassBeEdited = (component, team) => {
  if (!component) {
    return { canEdit: false, reason: 'No component' };
  }

  // Must be decoration approved
  if (!component.is_deco_approved) {
    return { canEdit: false, reason: 'Decoration not approved' };
  }

  // Check vehicle requirements for first team
  if (isFirstTeamInSequence(component, team)) {
    const vehicleStatus = getVehicleApprovalStatus(component);
    if (vehicleStatus === 'NO_VEHICLES') {
      return { canEdit: false, reason: 'No vehicle details received' };
    }
    if (vehicleStatus === 'PENDING') {
      return { canEdit: false, reason: 'Vehicles not delivered' };
    }
  } else {
    // For non-first teams, check previous team is dispatched
    const sequence = parseDecorationSequence(component.deco_sequence);
    const teamPosition = getTeamSequencePosition(sequence, team);
    
    if (teamPosition > 0) {
      const previousTeam = sequence[teamPosition - 1];
      const previousTeamStatus = component.decorations?.[previousTeam]?.status;
      
      if (previousTeamStatus !== 'DISPATCHED') {
        return { canEdit: false, reason: `Waiting for ${previousTeam} to dispatch` };
      }
    }
  }

  return { canEdit: true, reason: 'Ready to edit' };
};

// SIMPLIFIED: Team status message for UI display
export const getSequenceWaitingMessage = (component, team) => {
  if (!component) {
    return 'No component';
  }

  const teamStatus = component.decorations?.[team]?.status;

  // Show current team status first
  if (teamStatus === 'DISPATCHED') {
    return 'Dispatched';
  } else if (teamStatus === 'READY_TO_DISPATCH') {
    return 'Ready to dispatch';
  } else if (teamStatus === 'IN_PROGRESS') {
    return 'In progress';
  }

  // Check requirements for starting
  if (!component.is_deco_approved) {
    return 'Awaiting decoration approval';
  }

  if (isFirstTeamInSequence(component, team)) {
    const vehicleStatus = getVehicleApprovalStatus(component);
    if (vehicleStatus === 'NO_VEHICLES') {
      return 'No vehicle details received';
    }
    if (vehicleStatus === 'PENDING') {
      return 'Awaiting vehicle delivery';
    }
    return 'Ready to start';
  }

  // Check previous team for non-first teams
  const sequence = parseDecorationSequence(component.deco_sequence);
  const teamPosition = getTeamSequencePosition(sequence, team);
  
  if (teamPosition > 0) {
    const previousTeam = sequence[teamPosition - 1];
    const previousTeamStatus = component.decorations?.[previousTeam]?.status;
    
    if (previousTeamStatus !== 'DISPATCHED') {
      return `Waiting ${previousTeam}`;
    }
  }

  return 'Ready to start';
};

export const getDecorationStatus = (component, team) => {
  return component?.decorations?.[team]?.status ?? 'N/A';
};

export const hasDecorationForTeam = (component, team) => {
  return component?.decorations?.[team] &&
    component?.deco_sequence?.includes(team);
};

export const canTeamMarkVehiclesDelivered = (component, teamName) => {
  if (!component || !teamName) return false;
  return isFirstTeamInSequence(component, teamName);
};

// Item edit check
export const canItemBeEdited = (item, team) => {
  if (!item?.components) {
    return { canEdit: false, reason: 'No components found' };
  }

  const teamGlasses = item.components.filter(component =>
    component.component_type === "glass" &&
    hasDecorationForTeam(component, team)
  );

  if (teamGlasses.length === 0) {
    return { canEdit: false, reason: 'No team components found' };
  }

  const editableGlasses = teamGlasses.filter(glass => {
    const { canEdit } = canGlassBeEdited(glass, team);
    return canEdit;
  });

  if (editableGlasses.length > 0) {
    return { 
      canEdit: true, 
      reason: `${editableGlasses.length} of ${teamGlasses.length} glasses ready`,
      editableCount: editableGlasses.length,
      totalCount: teamGlasses.length
    };
  }

  return { 
    canEdit: false, 
    reason: 'No glasses ready to edit',
    editableCount: 0,
    totalCount: teamGlasses.length
  };
};