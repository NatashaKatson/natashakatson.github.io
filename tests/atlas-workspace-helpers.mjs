// Drive the redesigned controls through their real buttons and disclosures.
export const workspaceSetup = `
window.AtlasTestUI = {
  settings(open = true) {
    const dialog = document.getElementById('mapSettings');
    if (dialog.open !== open) { const trigger = document.getElementById('mapToolsToggle'); trigger.focus({preventScroll:true}); trigger.click(); }
    return dialog;
  },
  filters(open = true) {
    const dialog = this.settings(open);
    if (open) document.getElementById('filtersPanel').parentElement.open = true;
    return dialog;
  },
  layers() {
    const dialog = this.settings();
    document.querySelector('.thematic-layers').parentElement.open = true;
    return dialog;
  },
  comparison() {
    this.settings();
    document.getElementById('compareToggle').parentElement.open = true;
  },
  journeys() {
    const button = [...document.querySelectorAll('button[data-workspace="journeys"]')].find(b => b.getBoundingClientRect().height > 0);
    button.click();
  }
};`;
