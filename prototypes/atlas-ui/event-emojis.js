/* Presentation only: event dates, categories, filtering and navigation stay in the original atlas. */
(() => {
  const medical = {
    Penicillin: '💊', Artemisinin: '🌿', Insulin: '💉', Stethoscope: '🩺',
    'X-ray': '🩻', ABO_blood_group_system: '🩸', CT_scan: '🩻', Magnetic_resonance_imaging: '🧲',
    Ether_Dome: '😴', Kidney_transplantation: '🏥', Artificial_cardiac_pacemaker: '🫀',
    Heart_transplantation: '🫀', In_vitro_fertilisation: '🧫',
    Molecular_Structure_of_Nucleic_Acids: '🧬', Ignaz_Semmelweis: '🧼', Antiseptic_surgery: '🧼',
    Eradication_of_smallpox: '🌍', 'RTS,S': '💉',
  };
  const categories = { power: '👑', war: '⚔️', ideas: '🔭', culture: '🎨', nature: '🌿', fashion: '🧵' };
  window.AtlasEventEmojis = {
    get(event) {
      if (!event || event.kind !== 'event' || event.cat === 'dinosaurs') return '';
      if (medical[event.wiki]) return medical[event.wiki];
      if (/vaccine/i.test(event.wiki)) return '💉';
      const text = `${event.wiki} ${event.title} ${(event.aliases || []).join(' ')}`.toLowerCase();
      if (/pandemic|epidemic|plague|black.death|disease history/.test(text)) return '🦠';
      if (/medical history|medicine/.test(text)) return '🩺';
      if (/apollo|chandrayaan|artemis|sputnik|space|moon landing/.test(text)) return '🚀';
      if (/railway|locomotive/.test(text)) return '🚂';
      if (/wright|aviation|first flight/.test(text)) return '✈️';
      if (/printing.press|printed bible/.test(text)) return '📖';
      if (/world.wide.web|internet|computer/.test(text)) return '💻';
      if (/earthquake/.test(text)) return '🏚️';
      if (/volcano|eruption|tambora/.test(text)) return '🌋';
      return categories[event.cat] || '📍';
    },
  };
})();
