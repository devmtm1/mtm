// MTM IMMOBILIER - Public Web Interactive Script
document.addEventListener('DOMContentLoaded', () => {

  // 1. Interactive Rental Management Fee Simulator
  const loyerRange = document.getElementById('loyerRange');
  const loyerVal = document.getElementById('loyerVal');
  const feeVal = document.getElementById('feeVal');
  const netVal = document.getElementById('netVal');

  function updateSimulation() {
    if (!loyerRange) return;
    const loyer = parseInt(loyerRange.value, 10);
    const fee = Math.round(loyer * 0.07);
    const net = loyer - fee;

    loyerVal.textContent = loyer.toLocaleString('fr-FR') + ' FCFA';
    feeVal.textContent = fee.toLocaleString('fr-FR') + ' FCFA';
    netVal.textContent = net.toLocaleString('fr-FR') + ' FCFA / mois';
  }

  if (loyerRange) {
    loyerRange.addEventListener('input', updateSimulation);
    updateSimulation();
  }

  // 2. Search Tabs Switcher
  const searchTabs = document.querySelectorAll('.search-tab');
  searchTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      searchTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // 3. Smooth Navigation helper
  window.scrollToSection = function(selector) {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 4. Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }
});
