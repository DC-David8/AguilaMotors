// Aguila Motors · Arranque de la página (se carga el último, cuando ya están todos los módulos).

// Seguridad: si algo fallara al arrancar, que la pagina no se quede oculta.
setTimeout(() => document.documentElement.classList.remove("auth-pending"), 10000);
setupCopyFallbackModal();
setupTabs();
// Primero los datos publicados (si los hay); luego se arma la pagina con ellos.
Promise.allSettled([
  loadSharedData().catch(() => {
    SHARED_DATA = null;
  }),
  Promise.resolve().then(() => prodCloudLoad()),
  Promise.resolve()
    .then(() => authInit())
    .then(() => Promise.all([hasAccess() ? empCloudLoad() : null, canSeeStock() ? loadRankNames() : null, hasAccess() ? loadRankRules() : null, hasAccess() ? loadStrikeHist() : null, canSeeCv() ? loadCvMargins() : null, canSeeCv() ? loadCvAlias() : null, loadCatalogCloud()])),
])
  .finally(() => {
    setupCaja();
    setupContabilidad();
    setupSharedData();
    setupSorteo();
    setupCompraventa();
    setupAuthUI();
    if (typeof setupInformes === "function") setupInformes();
    if (typeof setupPanelJefe === "function") setupPanelJefe();
    setupSideRail();
    setupMobileNav();
  });

