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


export const canGlassBeEdited = (component, team) => {
  if (!component) {
    return { canEdit: false, reason: 'No component' };
  }

  if (!component.is_deco_approved) {
    return { canEdit: false, reason: 'Decoration not approved' };
  }

  if (isFirstTeamInSequence(component, team)) {
    const vehicleStatus = getVehicleApprovalStatus(component);
    if (vehicleStatus === 'NO_VEHICLES') {
      return { canEdit: false, reason: 'No vehicle details received' };
    }
    if (vehicleStatus === 'PENDING') {
      return { canEdit: false, reason: 'Vehicles not delivered' };
    }
  } else {

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


export const getSequenceWaitingMessage = (component, team) => {
  if (!component) return 'No component';

  const teamStatus = component.decorations?.[team]?.status;
  if (teamStatus === 'DISPATCHED') {
    return 'Completed';
  }
  const sequence = parseDecorationSequence(component.deco_sequence);
  const teamPosition = getTeamSequencePosition(sequence, team);
  if (teamPosition === 0) {
    return `Awaiting ${team}`;
  }

  const previousTeam = sequence[teamPosition - 1];
  const previousTeamStatus = component.decorations?.[previousTeam]?.status;

  if (previousTeamStatus !== 'DISPATCHED') {
    return `Awaiting ${previousTeam}`;
  }
  return `Awaiting ${team}`;
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

// UPDATED: Always allow opening the modal, but provide details about editable glasses
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

  // CHANGED: Always allow opening the modal if there are team glasses
  return { 
    canEdit: true, // Always true if there are team glasses
    reason: editableGlasses.length > 0 
      ? `${editableGlasses.length} of ${teamGlasses.length} glasses ready`
      : `0 of ${teamGlasses.length} glasses ready - individual restrictions apply`,
    editableCount: editableGlasses.length,
    totalCount: teamGlasses.length
  };
};