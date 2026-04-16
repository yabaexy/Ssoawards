
// Muse mission routing fixed version
// Key fix: correct tab navigation per mission

const handleMissionNavigation = (missionId: string) => {
  if (missionId === 'play_games') {
    setViewMode('arcade');
  } else if (missionId === 'lp_provide') {
    setViewMode('swap');
  } else if (missionId === 'market_vote') {
    setViewMode('markets');
  }
};

// Replace existing button handler:
// onClick={() => setViewMode(...)}

// WITH:
onClick={() => handleMissionNavigation(mission.id)}
