
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

  if (teamPosition === 0) {
    return { canWork: true, reason: 'First team in sequence', waitingFor: null };
  }

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

export const getWaitingMessage = (component, team) => {
  const { canWork, waitingFor } = canTeamWork(component, team);
  
  if (canWork) return '';
  
  if (waitingFor) {
    const waitingStatus = getDecorationStatus(component, waitingFor);
    return `Awaiting ${waitingFor} (Status: ${waitingStatus})`;
  }

  return 'Cannot work on this component';
};