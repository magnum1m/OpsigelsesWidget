
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
  
  function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }
  
  function isHoliday(date, holidays = []) {
    return holidays.some(h =>
      h.getFullYear() === date.getFullYear() &&
      h.getMonth() === date.getMonth() &&
      h.getDate() === date.getDate()
    );
  }
  
  function isWeekday(date) {
    return !isWeekend(date);
  }
  
  function findDatoer() {
    const today = new Date();
    today.setDate(1);
    const datoer = [];
    for (let i = 0; i < 25; i++) {
      const first = new Date(today);
      const fifteenth = new Date(today);
      first.setDate(1);
      fifteenth.setDate(15);
      first.setMonth(today.getMonth() + i);
      fifteenth.setMonth(today.getMonth() + i);
      datoer.push(formatDate(first), formatDate(fifteenth));
    }
    return { today, datoer };
  }
  
  async function hentHelligdage(startYear, endYear) {
    const helligdage = [];
    for (let year = startYear; year <= endYear; year++) {
      try {
        const res = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${year}/DK`
        );
        if (res.ok) {
          const list = await res.json();
          list.forEach(h => {
            if (h.localName !== 'Banklukkedag') {
              helligdage.push(new Date(h.date));
            }
          });
        }
      } catch (e) {
        console.error(`Kunne ikke hente helligdage for ${year}:`, e);
      }
      // Tilføj 1. maj manuelt
      helligdage.push(new Date(year, 4, 1));
    }
    return helligdage;
  }
  
  async function findDatoerOgHelligdage() {
    const { today, datoer } = findDatoer();
    const helligdage = await hentHelligdage(
      today.getFullYear() - 1,
      today.getFullYear() + 2
    );
    return { datoer, helligdage };
  }
  
  function findSenesteOpsigelseSelvejende(dato, helligdage = []) {
    let d = parseDate(dato);
    while (isWeekend(d) || isHoliday(d, helligdage)) {
      d = addDays(d, 1);
    }
    d = addDays(d, -42);
    while (isWeekend(d) || isHoliday(d, helligdage)) {
      d = addDays(d, 1);
    }
    return formatDate(d);
  }
  
  function findFraflytningsDatoerRaTkAfdelinger(dato, helligdage = []) {
    let d = parseDate(dato);
    while (!isWeekday(d) || isHoliday(d, helligdage)) {
      d = addDays(d, 1);
    }
    let working = 7;
    while (working > 0) {
      d = addDays(d, -1);
      if (isWeekday(d) && !isHoliday(d, helligdage)) {
        working--; 
      }
    }
    return formatDate(d);
  }
  
  function findFraflytningsDatoerSkjVk(dato, helligdage = []) {
    let d = parseDate(dato);
    d = addDays(d, -14);
    while (isWeekend(d) || isHoliday(d, helligdage)) {
      d = addDays(d, 1);
    }
    return formatDate(d);
  }
  
  // --- Core widget logic ---
  let fetchedData = null;
  let currentLanguage = 'danish';
  
  const translations = {
    danish: {
      pageTitle: 'Opsigelsesoversigt',
      college: {
        ratk: 'Ravnsbjerg Kollegiet<br>Tandlæge Kollegiet',
        skjvk: 'Skjoldhøjkollegiet<br>Vilh. Kiers Kollegium'
      },
      tableHeaders: [
        'Termination date:',
        'Submit your termination by:',
        'Moving out no later than 8.00 on:',
        'Moving out no later than 8.00 on:'
      ],
      toggleText: 'English'
    },
    english: {
      pageTitle: 'Termination Overview',
      college: {
        ratk: 'Ravnsbjerg Kollegiet<br>Tandlæge Kollegiet',
        skjvk: 'Skjoldhøjkollegiet<br>Vilh. Kiers Kollegium'
      },
      tableHeaders: [
        'Termination date:',
        'Submit your termination by:',
        'Vacate your residence by 8:00 AM on:',
        'Vacate your residence by 8:00 AM on:'
      ],
      toggleText: 'Dansk'
    }
  };
  
  
  function setupLanguageToggle() {
    const btn = document.getElementById('languageToggle');
    btn.addEventListener('click', () => {
      currentLanguage = currentLanguage === 'danish' ? 'english' : 'danish';
      updateLanguage();
    });
  }
  
  function updateLanguage() {
    document.getElementById('pageTitle').innerHTML = translations[currentLanguage].pageTitle;
    document.getElementById('languageToggle').textContent = translations[currentLanguage].toggleText;
    if (fetchedData) {
      document.getElementById('resultat').innerHTML = '';
      skrivTabel(fetchedData.datoer, fetchedData.helligdage);
    }
  }
  
  function skrivTabel(datoer, helligdage) {
    const table = document.createElement('table');
    // College header row
    const colRow = table.insertRow();
    for (let i = 0; i < 2; i++) {
      const c = colRow.insertCell();
      c.className = 'college-header';
      c.innerHTML = '';
    }
    let c = colRow.insertCell();
    c.className = 'college-header';
    c.innerHTML = translations[currentLanguage].college.ratk;
    c = colRow.insertCell();
    c.className = 'college-header';
    c.innerHTML = translations[currentLanguage].college.skjvk;
  
    // Main header
    const hdr = table.insertRow();
    translations[currentLanguage].tableHeaders.forEach(text => {
      const th = document.createElement('th');
      th.className = 'main-header';
      th.textContent = text;
      hdr.appendChild(th);
    });
  
    // Data rows
    datoer.forEach((dStr, i) => {
      const row = table.insertRow();
      row.className = i % 2 === 0 ? 'row-colored' : 'row-white';
      const ops = dStr;
      const sen = findSenesteOpsigelseSelvejende(dStr, helligdage);
      const rt  = findFraflytningsDatoerRaTkAfdelinger(dStr, helligdage);
      const sk  = findFraflytningsDatoerSkjVk(dStr, helligdage);
      [ops, sen, rt, sk].forEach((val, idx) => {
        const cell = row.insertCell();
        cell.textContent = val;
        if (idx === 0) cell.className = 'date-column';
      });
    });
  
    document.getElementById('resultat').appendChild(table);

      // expose a single entry-point that does everything

  }

export async function initWidget() {
  const { datoer, helligdage } = await findDatoerOgHelligdage();
  fetchedData = { datoer, helligdage };
  skrivTabel(datoer, helligdage);
  setupLanguageToggle();
}

  
