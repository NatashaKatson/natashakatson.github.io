/* Keep initialization failures distinct from dates without recorded events. */
(() => {
  let ready = false;
  function fail() {
    if (ready) return;
    document.body.dataset.atlasLoad = 'failed';
    document.getElementById('atlasLoadError').hidden = false;
    for (const selector of ['.head-tools', '.time', '.atlas-toolbar', '#mapToolsToggle', '.mobile-atlas-nav']) {
      document.querySelector(selector)?.setAttribute('inert', '');
    }
  }
  const timer = setTimeout(fail, 20000);
  window.AtlasLoadState = {
    fail,
    ready() {
      ready = true;
      clearTimeout(timer);
      delete document.body.dataset.atlasLoad;
      document.getElementById('atlasLoadError').hidden = true;
      document.querySelectorAll('[inert]').forEach(element => element.removeAttribute('inert'));
    },
  };
  window.addEventListener('error', event => {
    if (event.target instanceof HTMLScriptElement || event instanceof ErrorEvent) fail();
  }, true);
  window.addEventListener('load', () => { if (!ready) fail(); }, { once: true });
})();
