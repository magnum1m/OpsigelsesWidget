// widgetafdelinger.js
// Place this file in your GitHub repo and load it via <script type="module" src=".../widgetafdelinger.js"></script>

// --- Helper functions for dates and holidays ---
function parseDate(dateStr) {
  const [dd, mm, yyyy] = dateStr.split('.').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isHoliday(date, holidays = []) {
  return holidays.some(h =>
    h.getFullYear() === date.getFullYear() &&
    h.getMonth() === date.getMonth() &&
    h.getDate() === date.getDate()
  );
}

function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

async function hentHelligdage(startYear, endYear) {
  const helligdage = [];
  for (let y = startYear; y <= endYear; y++) {
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/DK`);
      if (res.ok) {
        const list = await res.json();
        list.forEach(h => {
          if (h.localName !== 'Banklukkedag') {
            helligdage.push(new Date(h.date));
          }
        });
      }
    } catch (e) {
      console.error(`Fejl ved hentning for ${y}:`, e);
    }
    // Always add May 1st
    helligdage.push(new Date(y, 4, 1));
  }
  return helligdage;
}

function findDatoer() {
  const today = new Date();
  today.setDate(1);
  const datoer = [];
  for (let i = 0; i < 25; i++) {
    const d1 = new Date(today);
    const d15 = new Date(today);
    d1.setMonth(today.getMonth() + i);
    d1.setDate(1);
    d15.setMonth(today.getMonth() + i);
    d15.setDate(15);
    datoer.push(formatDate(d1), formatDate(d15));
  }
  return datoer;
}

async function findDatoerOgHelligdage() {
  const datoer = findDatoer();
  const year = new Date().getFullYear();
  const helligdage = await hentHelligdage(year - 1, year + 2);
  return { datoer, helligdage };
}

function findFraflytRaTk(dato, helligdage) {
  let d = parseDate(dato);
  while (!isWeekday(d) || isHoliday(d, helligdage)) {
    d = addDays(d, 1);
  }
  let count = 7;
  while (count > 0) {
    d = addDays(d, -1);
    if (isWeekday(d) && !isHoliday(d, helligdage)) count--;
  }
  return formatDate(d);
}

function skrivTabel(datoer, helligdage) {
  const container = document.getElementById('resultat');
  if (!container) return;
  container.innerHTML = '';
  const table = document.createElement('table');

  // Main header row with only two columns
  const headerRow = table.insertRow();
  ['For genudlejning til den:', 'Fraflyt din bolig senest kl. 9.00 den:']
    .forEach(text => {
      const th = document.createElement('th');
      th.className = 'main-header';
      th.textContent = text;
      headerRow.appendChild(th);
    });

  // Data rows
  datoer.forEach((d, i) => {
    const row = table.insertRow();
    row.className = i % 2 === 0 ? 'row-colored' : 'row-white';
    const vacateBy = findFraflytRaTk(d, helligdage);
    [d, vacateBy].forEach((val, ci) => {
      const cell = row.insertCell();
      cell.textContent = val;
      if (ci === 0) cell.className = 'date-column';
    });
  });

  container.appendChild(table);
}

// Entry point
export async function initWidget() {
  const { datoer, helligdage } = await findDatoerOgHelligdage();
  skrivTabel(datoer, helligdage);
}

// Auto-run on DOMContentLoaded
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initWidget().catch(console.error);
  });
}
