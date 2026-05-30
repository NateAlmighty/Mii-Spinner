// ─── DATA ──────────────────────────────────────────────────────────────────
const KEY = 'mii-spinner-v1';
const DEFAULTS = {
  miis: ['Aang', 'Katara', 'Zuko', 'Toph', 'Sokka'],
  categories: ['Clothing', 'Food', 'Treasures', 'Interior/Exterior', 'Objects', 'Landscaping'],
  subcategories: {
    Treasures:   [' Books', 'Music', 'Videos', 'Video Games', 'Pets'],
    Clothing: ['Hat','Shirt','Pants','Cape','Shoes'],
    Food:     ['Fruit','Meat','Bread', 'Candy'],
    'Interior/Exterior': [],
    Objects: [],
    Landscaping: []
  },
  items: {
    'Aang|Clothing|Hat': []
  }
};

let D = (() => { 
  try { 
    // Try localStorage first (works on GitHub Pages with user scripts)
    const s = localStorage.getItem(KEY);
    if (s) return JSON.parse(s);
    
    // Try URL parameters for GitHub Pages persistence
    const urlParams = new URLSearchParams(window.location.search);
    const urlData = urlParams.get('data');
    if (urlData) {
      try {
        return JSON.parse(atob(urlData)); // Base64 decode
      } catch (e) {
        console.warn('Failed to parse URL data:', e);
      }
    }
    
    // Try to load from localStorage again as fallback
    const fallback = localStorage.getItem(KEY);
    if (fallback) return JSON.parse(fallback);
    
    return structuredClone(DEFAULTS); 
  } catch { 
    return structuredClone(DEFAULTS); 
  } 
})();

const save = () => {
  localStorage.setItem(KEY, JSON.stringify(D));
  
  // Also save to URL for GitHub Pages persistence
  try {
    const encodedData = btoa(JSON.stringify(D));
    const url = new URL(window.location);
    url.searchParams.set('data', encodedData);
    window.history.replaceState({}, '', url);
  } catch (e) {
    console.warn('Failed to save to URL:', e);
  }
};

// ─── STATE ─────────────────────────────────────────────────────────────────
let   busy   = false;
let   wheelCount = 4;
const chosen = [null, null, null, null];
const rots = [0, 0, 0, 0]; // ← FIXED: Removed trailing semicolon

function getItems(i) {
  if (i === 0) return [...D.miis];
  if (i === 1) return [...D.categories];
  if (i === 2) {
    if (!chosen[1]) return []; // ← FIXED: Check chosen[1] (category)
    return [...(D.subcategories[chosen[1]] || [])];
  }
  if (i === 3) {
    if (!chosen[0] || !chosen[1] || !chosen[2]) return []; // ← FIXED: Check specific indices
    const k = `${chosen[0]}|${chosen[1]}|${chosen[2]}`; // ← FIXED: Use specific indices
    return [...(D.items[k] || [])];
  }
  return [];
}

// ─── PALETTE ───────────────────────────────────────────────────────────────
const PAL=['#7c3aed','#4f46e5','#0891b2','#0d9488','#059669','#d97706','#dc2626','#db2777','#6d28d9','#1d4ed8','#b45309','#065f46'];

// ─── CREATE WHEELS ─────────────────────────────────────────────────────────
function createWheels() {
  const container = document.getElementById('wheels-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  for (let i = 0; i < wheelCount; i++) {
    const wheelHTML = `
      <div class="wheel-section ${i === 0 ? 'active' : 'locked'}" id="sec${i}">
        <div class="wheel-label">${i === 0 ? '① Mii' : i === 1 ? '② Category' : i === 2 ? '③ Subcategory' : i === 3 ? '④ Item' : `① Wheel ${i + 1}`}</div>
        <div class="wheel-wrapper"><div class="pointer"></div><canvas id="c${i}" width="200" height="200"></canvas></div>
        <div class="wheel-result" id="r${i}">—</div>
        <div class="wheel-btns">
          <button class="btn-spin" id="s${i}" onclick="spin(${i})" ${i === 0 ? '' : 'disabled'}>Spin</button>
          <button class="btn-respin" id="rs${i}" onclick="respin(${i})" style="display:none">Respin</button>
          <button class="btn-back" id="b${i}" onclick="goBack(${i})" ${i === 0 ? 'style="display:none"' : 'style="display:none"'}>← Back</button>
          <button class="btn-gear" onclick="openModal(${i})" title="Manage">⚙</button>
        </div>
      </div>
    `;
    
    container.innerHTML += wheelHTML;
    
    if (i < wheelCount - 1) {
      container.innerHTML += '<div class="arrow-sep">→</div>';
    }
  }
}

// ─── DRAW ──────────────────────────────────────────────────────────────────
function draw(i, rot) {
  try {
    const cv = document.getElementById(`c${i}`);
    if (!cv) {
      console.warn(`Canvas c${i} not found, retrying...`);
      // Retry after a short delay
      setTimeout(() => draw(i, rot), 50);
      return;
    }
    
    const ctx = cv.getContext('2d');
    if (!ctx) {
      console.warn(`Canvas context for c${i} not available`);
      return;
    }
       
    const W = 200, cx = W/2, r = W/2-4;
    ctx.clearRect(0,0,W,W);
    const items = getItems(i);

    if (!items || items.length === 0) {
      ctx.beginPath(); ctx.arc(cx,cx,r,0,Math.PI*2);
      ctx.fillStyle='#1a1a2e'; ctx.fill();
      ctx.strokeStyle='#374151'; ctx.lineWidth=3; ctx.stroke();
      ctx.fillStyle='#4b5563'; ctx.font='13px Segoe UI';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('No options added',cx,cx-8);
      ctx.fillText('Use ⚙ to add',cx,cx+10);
      return;
    }

    const seg = Math.PI*2/items.length;
    items.forEach((label,j) => {
      if (!label) return;
      
      const a0=rot+j*seg, a1=a0+seg;
      ctx.beginPath(); ctx.moveTo(cx,cx); ctx.arc(cx,cx,r,a0,a1); ctx.closePath();
      ctx.fillStyle=PAL[j%PAL.length]; ctx.fill();
      ctx.strokeStyle='#0f0e17'; ctx.lineWidth=2; ctx.stroke();
      ctx.save(); ctx.translate(cx,cx); ctx.rotate(a0+seg/2);
      ctx.textAlign='right'; ctx.textBaseline='middle';
      ctx.fillStyle='#fff';
      const fs = items.length>10?9:items.length>6?11:13;
      ctx.font=`600 ${fs}px Segoe UI`;
      const lbl = label.length>15?label.slice(0,14)+'…':label;
      ctx.shadowColor='rgba(0,0,0,.4)'; ctx.shadowBlur=4;
      ctx.fillText(lbl, r-8, 0);
      ctx.restore();
    });

    // Center hub
    ctx.beginPath(); ctx.arc(cx,cx,16,0,Math.PI*2);
    ctx.fillStyle='#0f0e17'; ctx.fill();
    ctx.strokeStyle='#7c3aed'; ctx.lineWidth=3; ctx.stroke();
  } catch (error) {
    console.error('Error in draw function for wheel', i, ':', error);
  }
}

// ─── SPIN ──────────────────────────────────────────────────────────────────
function spin(i) {
  if (busy) return;
  const items=getItems(i);
  if (!items || items.length === 0) { 
    alert('No options in this wheel!\nUse ⚙ to add some.'); 
    return; 
  }
  busy=true;
  
  const spinButton = document.getElementById(`s${i}`);
  if (spinButton) {
    spinButton.disabled=true;
  }

  const n=items.length, seg=Math.PI*2/n;
  const target=Math.floor(Math.random()*n);
  // pointer at top = -PI/2; want center of target slice there
  const tAngle = -Math.PI/2 - target*seg - seg/2;
  const minFinal = rots[i] + 5*Math.PI*2;
  const k = Math.ceil((minFinal-tAngle)/(Math.PI*2));
  const finalRot = tAngle + k*Math.PI*2;
  const startRot = rots[i];
  const dur = 3200 + Math.random()*900;
  const t0  = performance.now();
  const ease = t => 1-Math.pow(1-t,4);

  (function frame(now) {
    const t=Math.min((now-t0)/dur,1);
    rots[i]=startRot+(finalRot-startRot)*ease(t);
    draw(i,rots[i]);
    if (t<1) { requestAnimationFrame(frame); return; }
    rots[i]=finalRot;
    chosen[i]=items[target];
    
    const resultElement = document.getElementById(`r${i}`);
    if (resultElement) {
      resultElement.textContent=items[target];
    }
    
    busy=false;
    onDone(i);
  })(t0);
}

function onDone(i) {
  // Show Respin button for the wheel that was just spun
  const respinButton = document.getElementById(`rs${i}`);
  if (respinButton) {
    respinButton.style.display='inline-block';
    respinButton.disabled=false;
  }
  
  // Show Back button for wheels that have been spun (except the first one)
  if (i > 0) {
    const backButton = document.getElementById(`b${i}`);
    if (backButton) {
      backButton.style.display='inline-block';
    }
  }
  
  if (i < wheelCount - 1) {
    const next=i+1;
    const nextSection = document.getElementById(`sec${next}`);
    const nextButton = document.getElementById(`s${next}`);
    if (nextSection) {
      nextSection.classList.remove('locked');
      nextSection.classList.add('active');
    }
    if (nextButton) {
      nextButton.disabled=false;
    }
    draw(next, rots[next]);
  }
  
  const allChosen = chosen.every(v => v!==null);
  if (allChosen) {
    const labels=['Mii','Category','Subcategory','Item'];
    const resultChips = document.getElementById('result-chips');
    if (resultChips) {
      resultChips.innerHTML=
        chosen.map((v,j)=>`<div class="chip"><em>${j < labels.length ? labels[j] : `Wheel ${j + 1}`}:</em>${v}</div>`).join('');
      const resultCard = document.getElementById('result-card');
      if (resultCard) {
        resultCard.classList.add('show');
      }
    }
  }
}

function resetAll() {
  chosen.fill(null); 
  rots.fill(0); 
  busy=false;
  
  for (let i=0;i<wheelCount;i++) {
    const resultElement = document.getElementById(`r${i}`);
    const spinButton = document.getElementById(`s${i}`);
    const section = document.getElementById(`sec${i}`);
    const respinButton = document.getElementById(`rs${i}`);
    const backButton = document.getElementById(`b${i}`);
    
    if (resultElement) resultElement.textContent='—';
    if (spinButton) spinButton.disabled=(i!==0);
    if (respinButton) respinButton.style.display='none';
    if (backButton) backButton.style.display='none';
    if (section) {
      section.className='wheel-section '+(i===0?'active':'locked');
    }
    draw(i,0);
  }
  
  const resultCard = document.getElementById('result-card');
  if (resultCard) {
    resultCard.classList.remove('show');
  }
}

function respin(i) {
  if (busy) return;
  const items=getItems(i);
  if (!items || items.length === 0) { 
    alert('No options in this wheel!\nUse ⚙ to add some.'); 
    return; 
  }
  busy=true;
  
  const spinButton = document.getElementById(`s${i}`);
  const respinButton = document.getElementById(`rs${i}`);
  if (spinButton) spinButton.disabled=true;
  if (respinButton) respinButton.disabled=true;

  const n=items.length, seg=Math.PI*2/n;
  const target=Math.floor(Math.random()*n);
  const tAngle = -Math.PI/2 - target*seg - seg/2;
  const minFinal = rots[i] + 5*Math.PI*2;
  const k = Math.ceil((minFinal-tAngle)/(Math.PI*2));
  const finalRot = tAngle + k*Math.PI*2;
  const startRot = rots[i];
  const dur = 3200 + Math.random()*900;
  const t0  = performance.now();
  const ease = t => 1-Math.pow(1-t,4);

  (function frame(now) {
    const t=Math.min((now-t0)/dur,1);
    rots[i]=startRot+(finalRot-startRot)*ease(t);
    draw(i,rots[i]);
    if (t<1) { requestAnimationFrame(frame); return; }
    rots[i]=finalRot;
    chosen[i]=items[target];
    
    const resultElement = document.getElementById(`r${i}`);
    if (resultElement) {
      resultElement.textContent=items[target];
    }
    
    busy=false;
    if (respinButton) respinButton.disabled=false;
    onDone(i);
  })(t0);
}

function goBack(i) {
  // Reset this wheel and all subsequent wheels
  for (let j=i; j<wheelCount; j++) {
    chosen[j]=null;
    rots[j]=0;
    
    const resultElement = document.getElementById(`r${j}`);
    const spinButton = document.getElementById(`s${j}`);
    const section = document.getElementById(`sec${j}`);
    const respinButton = document.getElementById(`rs${j}`);
    const backButton = document.getElementById(`b${j}`);
    
    if (resultElement) resultElement.textContent='—';
    if (respinButton) respinButton.style.display='none';
    if (backButton) backButton.style.display='none';
    
    if (j === i) {
      // This is the wheel we're going back to
      if (spinButton) spinButton.disabled=false;
      if (section) {
        section.classList.remove('locked');
        section.classList.add('active');
      }
    } else {
      // Subsequent wheels should be locked
      if (spinButton) spinButton.disabled=true;
      if (section) {
        section.classList.remove('active');
        section.classList.add('locked');
      }
    }
    draw(j,0);
  }
  
  // Hide result card if any wheel was reset
  const resultCard = document.getElementById('result-card');
  if (resultCard) {
    resultCard.classList.remove('show');
  }
}

// ─── MODAL ─────────────────────────────────────────────────────────────────
let mIdx=-1;

function openModal(i) {
  mIdx=i;
  const TITLES=['Manage Mii Names','Manage Categories','Manage Subcategories','Manage Items'];
  const HINTS =[
    'These names will appear on Wheel 1.',
    'These are the top-level item categories.',
    'Subcategories are grouped by category — select one below.',
    'Items are unique to each Mii + Category + Subcategory combination.'
  ];
  const titleElement = document.getElementById('m-title');
  const hintElement = document.getElementById('m-hint');
  if (titleElement) titleElement.textContent=TITLES[i];
  if (hintElement) hintElement.textContent=HINTS[i];

  const wrap=document.getElementById('m-sel-wrap');
  const sel =document.getElementById('m-sel');

  if (i===2) {
    if (wrap) wrap.style.display='block';
    const selLabel = document.getElementById('m-sel-label');
    if (selLabel) selLabel.textContent='Category:';
    if (sel) {
      sel.innerHTML=D.categories.map(c=>`<option>${c}</option>`).join('');
      if (chosen[1] && D.categories.includes(chosen[1])) {
        sel.value=chosen[1];
      }
    }
  } else if (i===3) {
    if (wrap) wrap.style.display='block';
    const selLabel = document.getElementById('m-sel-label');
    if (selLabel) selLabel.textContent='Mii → Category → Subcategory:';
    if (sel) {
      const combos=[];
      D.miis.forEach(m=>D.categories.forEach(c=>(D.subcategories[c]||[]).forEach(s=>combos.push(`${m}|${c}|${s}`))));
      sel.innerHTML=combos.length
        ? combos.map(k=>`<option value="${k}">${k.replace(/\|/g,' → ')}</option>`).join('')
        : '<option value="">— no combos yet (add Miis + subcategories first) —</option>';
      const cur=chosen.every(v=>v)&&`${chosen[0]}|${chosen[1]}|${chosen[2]}`;
      if (cur && combos.includes(cur)) sel.value=cur;
    }
  } else {
    if (wrap) wrap.style.display='none';
  }

  renderList();
  const overlay = document.getElementById('overlay');
  const input = document.getElementById('m-input');
  if (overlay) overlay.classList.add('open');
  if (input) input.focus();
}

function renderList() {
  const i=mIdx, list=document.getElementById('m-list');
  if (!list) return;
  
  let items=[];
  if (i===0) items=D.miis;
  else if (i===1) items=D.categories;
  else if (i===2) { 
    const sel = document.getElementById('m-sel');
    const c = sel ? sel.value : '';
    items=D.subcategories[c]||[]; 
  }
  else { 
    const sel = document.getElementById('m-sel');
    const k = sel ? sel.value : '';
    items=D.items[k]||[]; 
  }

  if (!items || items.length === 0) { 
    list.innerHTML='<div class="empty-msg">No options yet. Add one below!</div>'; 
    return; 
  }
  list.innerHTML=items.map((v,j)=>`
    <div class="list-item">
      <span>${v}</span>
      <button class="del" onclick="removeItem(${j})">✕</button>
    </div>`).join('');
}

function addItem() {
  const input = document.getElementById('m-input');
  const val = input ? input.value.trim() : '';
  if (!val) return;
  
  const i = mIdx;
  if (i < 0 || i >= wheelCount) return;
  
  try {
    if (i===0) { 
      if(!D.miis.includes(val)) D.miis.push(val); 
    }
    else if (i===1) { 
      if(!D.categories.includes(val)){ 
        D.categories.push(val); 
        if(!D.subcategories[val]) D.subcategories[val]=[]; 
      } 
    }
    else if (i===2) { 
      const sel = document.getElementById('m-sel');
      const c = sel ? sel.value : '';
      if(!D.subcategories[c]) D.subcategories[c]=[]; 
      if(!D.subcategories[c].includes(val)) D.subcategories[c].push(val); 
    }
    else { 
      const sel = document.getElementById('m-sel');
      const k = sel ? sel.value : '';
      if(!k) return; 
      if(!D.items[k]) D.items[k]=[]; 
      if(!D.items[k].includes(val)) D.items[k].push(val); 
    }
    
    save(); 
    if (input) input.value='';
    renderList(); 
    
    // Redraw the wheel for this index
    draw(i,rots[i]);
    
  } catch (error) {
    console.error('Error in addItem:', error);
  }
}

function removeItem(j) {
  const i = mIdx;
  if (i < 0 || i >= wheelCount) return;
  
  try {
    if (i===0) D.miis.splice(j,1);
    else if (i===1) { 
      const [c]=D.categories.splice(j,1); 
      delete D.subcategories[c]; 
    }
    else if (i===2) { 
      const sel = document.getElementById('m-sel');
      const c = sel ? sel.value : '';
      if (D.subcategories[c]) {
        D.subcategories[c].splice(j,1);
      }
    }
    else { 
      const sel = document.getElementById('m-sel');
      const k = sel ? sel.value : '';
      if (D.items[k]) {
        D.items[k].splice(j,1);
      }
    }
    
    save(); 
    renderList(); 
    draw(i,rots[i]);
    
  } catch (error) {
    console.error('Error in removeItem:', error);
  }
}

function closeModal() {
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.classList.remove('open');
}

// ─── EXPORT/IMPORT ─────────────────────────────────────────────────────────────
function toggleExportDropdown() {
  const dropdown = document.getElementById('export-dropdown');
  const importDropdown = document.getElementById('import-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
    if (importDropdown) importDropdown.classList.remove('show');
  }
}

function toggleImportDropdown() {
  const dropdown = document.getElementById('import-dropdown');
  const exportDropdown = document.getElementById('export-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
    if (exportDropdown) exportDropdown.classList.remove('show');
  }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.dropdown')) {
    const exportDropdown = document.getElementById('export-dropdown');
    const importDropdown = document.getElementById('import-dropdown');
    if (exportDropdown) exportDropdown.classList.remove('show');
    if (importDropdown) importDropdown.classList.remove('show');
  }
});

function exportData(format) {
  const data = D;
  let content = '';
  let filename = '';
  let mimeType = '';

  switch (format) {
    case 'json':
      content = JSON.stringify(data, null, 2);
      filename = 'mii-spinner-data.json';
      mimeType = 'application/json';
      break;
    case 'csv':
      content = dataToCSV(data);
      filename = 'mii-spinner-data.csv';
      mimeType = 'text/csv';
      break;
    case 'xml':
      content = dataToXML(data);
      filename = 'mii-spinner-data.xml';
      mimeType = 'application/xml';
      break;
    case 'yaml':
      content = dataToYAML(data);
      filename = 'mii-spinner-data.yaml';
      mimeType = 'text/yaml';
      break;
    case 'txt':
      content = dataToTXT(data);
      filename = 'mii-spinner-data.txt';
      mimeType = 'text/plain';
      break;
    case 'ini':
      content = dataToINI(data);
      filename = 'mii-spinner-data.ini';
      mimeType = 'text/plain';
      break;
    case 'toml':
      content = dataToTOML(data);
      filename = 'mii-spinner-data.toml';
      mimeType = 'text/plain';
      break;
    case 'csl':
      content = dataToCSL(data);
      filename = 'mii-spinner-data.csl';
      mimeType = 'application/json';
      break;
    default:
      alert('Unsupported format');
      return;
  }

  downloadFile(content, filename, mimeType);
  
  // Close dropdown
  const exportDropdown = document.getElementById('export-dropdown');
  if (exportDropdown) exportDropdown.classList.remove('show');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dataToCSV(data) {
  let csv = 'Type,Category,Subcategory,Item\n';
  
  // Miis
  data.miis.forEach(mii => {
    csv += `Mii,,,"${mii}"\n`;
  });
  
  // Categories
  data.categories.forEach(category => {
    csv += `Category,,"${category}",\n`;
  });
  
  // Subcategories
  Object.entries(data.subcategories).forEach(([category, subcategories]) => {
    subcategories.forEach(sub => {
      csv += `Subcategory,"${category}","${sub}",\n`;
    });
  });
  
  // Items
  Object.entries(data.items).forEach(([key, items]) => {
    const [mii, category, subcategory] = key.split('|');
    items.forEach(item => {
      csv += `Item,"${mii}|${category}|${subcategory}",,"${item}"\n`;
    });
  });
  
  return csv;
}

function dataToXML(data) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<MiiSpinnerData>\n';
  
  xml += '  <Miis>\n';
  data.miis.forEach(mii => {
    xml += `    <Mii>${escapeXML(mii)}</Mii>\n`;
  });
  xml += '  </Miis>\n';
  
  xml += '  <Categories>\n';
  data.categories.forEach(category => {
    xml += `    <Category>${escapeXML(category)}</Category>\n`;
  });
  xml += '  </Categories>\n';
  
  xml += '  <Subcategories>\n';
  Object.entries(data.subcategories).forEach(([category, subcategories]) => {
    xml += `    <Category name="${escapeXML(category)}">\n`;
    subcategories.forEach(sub => {
      xml += `      <Subcategory>${escapeXML(sub)}</Subcategory>\n`;
    });
    xml += '    </Category>\n';
  });
  xml += '  </Subcategories>\n';
  
  xml += '  <Items>\n';
  Object.entries(data.items).forEach(([key, items]) => {
    const [mii, category, subcategory] = key.split('|');
    xml += `    <Combination mii="${escapeXML(mii)}" category="${escapeXML(category)}" subcategory="${escapeXML(subcategory)}">\n`;
    items.forEach(item => {
      xml += `      <Item>${escapeXML(item)}</Item>\n`;
    });
    xml += '    </Combination>\n';
  });
  xml += '  </Items>\n';
  
  xml += '</MiiSpinnerData>';
  return xml;
}

function escapeXML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function dataToYAML(data) {
  let yaml = 'miis:\n';
  data.miis.forEach(mii => {
    yaml += `  - "${mii}"\n`;
  });
  
  yaml += '\ncategories:\n';
  data.categories.forEach(category => {
    yaml += `  - "${category}"\n`;
  });
  
  yaml += '\nsubcategories:\n';
  Object.entries(data.subcategories).forEach(([category, subcategories]) => {
    yaml += `  "${category}":\n`;
    subcategories.forEach(sub => {
      yaml += `    - "${sub}"\n`;
    });
  });
  
  yaml += '\nitems:\n';
  Object.entries(data.items).forEach(([key, items]) => {
    yaml += `  "${key}":\n`;
    items.forEach(item => {
      yaml += `    - "${item}"\n`;
    });
  });
  
  return yaml;
}

function dataToTXT(data) {
  let txt = 'MII SPINNER DATA\n';
  txt += '='.repeat(50) + '\n\n';
  
  txt += 'MIIS:\n';
  data.miis.forEach(mii => {
    txt += `  - ${mii}\n`;
  });
  
  txt += '\nCATEGORIES:\n';
  data.categories.forEach(category => {
    txt += `  - ${category}\n`;
  });
  
  txt += '\nSUBCATEGORIES:\n';
  Object.entries(data.subcategories).forEach(([category, subcategories]) => {
    txt += `  ${category}:\n`;
    subcategories.forEach(sub => {
      txt += `    - ${sub}\n`;
    });
  });
  
  txt += '\nITEMS:\n';
  Object.entries(data.items).forEach(([key, items]) => {
    txt += `  ${key}:\n`;
    items.forEach(item => {
      txt += `    - ${item}\n`;
    });
  });
  
  return txt;
}

function dataToINI(data) {
  let ini = '[Miis]\n';
  data.miis.forEach((mii, i) => {
    ini += `mii${i + 1}=${mii}\n`;
  });
  
  ini += '\n[Categories]\n';
  data.categories.forEach((category, i) => {
    ini += `category${i + 1}=${category}\n`;
  });
  
  ini += '\n[Subcategories]\n';
  Object.entries(data.subcategories).forEach(([category, subcategories]) => {
    const safeCategory = category.replace(/[^a-zA-Z0-9]/g, '_');
    ini += `${safeCategory}=${subcategories.join(',')}\n`;
  });
  
  ini += '\n[Items]\n';
  Object.entries(data.items).forEach(([key, items]) => {
    const safeKey = key.replace(/[^a-zA-Z0-9|]/g, '_');
    ini += `${safeKey}=${items.join(',')}\n`;
  });
  
  return ini;
}

function dataToTOML(data) {
  let toml = 'miis = [\n';
  data.miis.forEach(mii => {
    toml += `  "${mii}",\n`;
  });
  toml += ']\n\n';
  
  toml += 'categories = [\n';
  data.categories.forEach(category => {
    toml += `  "${category}",\n`;
  });
  toml += ']\n\n';
  
  toml += '[subcategories]\n';
  Object.entries(data.subcategories).forEach(([category, subcategories]) => {
    toml += `"${category}" = [\n`;
    subcategories.forEach(sub => {
      toml += `  "${sub}",\n`;
    });
    toml += ']\n';
  });
  
  toml += '\n[items]\n';
  Object.entries(data.items).forEach(([key, items]) => {
    toml += `"${key}" = [\n`;
    items.forEach(item => {
      toml += `  "${item}",\n`;
    });
    toml += ']\n';
  });
  
  return toml;
}

function dataToCSL(data) {
  // CSL (Citation Style Language) JSON format
  const csl = {
    schema: 'https://github.com/citation-style-language/schema',
    version: '1.0.0',
    type: 'dataset',
    title: 'Mii Spinner Data',
    author: data.miis.map(mii => ({
      given: mii.split(' ')[0] || mii,
      family: mii.split(' ').slice(1).join(' ') || ''
    })),
    categories: data.categories.map(category => ({
      id: category,
      type: 'category',
      title: category,
      subcategories: (data.subcategories[category] || []).map(sub => ({
        id: sub,
        type: 'subcategory',
        title: sub
      }))
    })),
    items: Object.entries(data.items).map(([key, items]) => {
      const [mii, category, subcategory] = key.split('|');
      return {
        id: key,
        type: 'item',
        mii: mii,
        category: category,
        subcategory: subcategory,
        title: items.join(', ')
      };
    })
  };
  
  return JSON.stringify(csl, null, 2);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    const filename = file.name.toLowerCase();
    let format = '';
    
    if (filename.endsWith('.json')) format = 'json';
    else if (filename.endsWith('.csv')) format = 'csv';
    else if (filename.endsWith('.xml')) format = 'xml';
    else if (filename.endsWith('.yaml') || filename.endsWith('.yml')) format = 'yaml';
    else if (filename.endsWith('.txt')) format = 'txt';
    else if (filename.endsWith('.ini')) format = 'ini';
    else if (filename.endsWith('.toml')) format = 'toml';
    else if (filename.endsWith('.csl')) format = 'csl';
    else {
      alert('Unsupported file format');
      return;
    }
    
    try {
      const data = parseData(content, format);
      if (data) {
        D = data;
        save();
        resetAll();
        alert('Data imported successfully!');
      }
    } catch (error) {
      alert('Error importing data: ' + error.message);
    }
  };
  
  reader.readAsText(file);
  
  // Reset file input
  event.target.value = '';
  
  // Close dropdown
  const importDropdown = document.getElementById('import-dropdown');
  if (importDropdown) importDropdown.classList.remove('show');
}

function parseData(content, format) {
  switch (format) {
    case 'json':
      return JSON.parse(content);
    case 'csv':
      return csvToData(content);
    case 'xml':
      return xmlToData(content);
    case 'yaml':
      return yamlToData(content);
    case 'txt':
      return txtToData(content);
    case 'ini':
      return iniToData(content);
    case 'toml':
      return tomlToData(content);
    case 'csl':
      return cslToData(content);
    default:
      throw new Error('Unsupported format');
  }
}

function csvToData(csv) {
  const lines = csv.split('\n').filter(line => line.trim());
  const data = {
    miis: [],
    categories: [],
    subcategories: {},
    items: {}
  };
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.replace(/^"|"$/g, '').trim());
    const [type, category, subcategory, item] = parts;
    
    if (type === 'Mii' && item) {
      data.miis.push(item);
    } else if (type === 'Category' && category) {
      data.categories.push(category);
      data.subcategories[category] = data.subcategories[category] || [];
    } else if (type === 'Subcategory' && category && subcategory) {
      if (!data.subcategories[category]) data.subcategories[category] = [];
      data.subcategories[category].push(subcategory);
    } else if (type === 'Item' && category && item) {
      const key = category;
      if (!data.items[key]) data.items[key] = [];
      data.items[key].push(item);
    }
  }
  
  return data;
}

function xmlToData(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  
  const data = {
    miis: [],
    categories: [],
    subcategories: {},
    items: {}
  };
  
  // Parse Miis
  const miiNodes = doc.querySelectorAll('Mii');
  miiNodes.forEach(node => {
    data.miis.push(node.textContent);
  });
  
  // Parse Categories
  const categoryNodes = doc.querySelectorAll('Categories > Category');
  categoryNodes.forEach(node => {
    data.categories.push(node.textContent);
    data.subcategories[node.textContent] = data.subcategories[node.textContent] || [];
  });
  
  // Parse Subcategories
  const subcategoryNodes = doc.querySelectorAll('Subcategories > Category');
  subcategoryNodes.forEach(node => {
    const categoryName = node.getAttribute('name');
    const subNodes = node.querySelectorAll('Subcategory');
    data.subcategories[categoryName] = [];
    subNodes.forEach(subNode => {
      data.subcategories[categoryName].push(subNode.textContent);
    });
  });
  
  // Parse Items
  const combinationNodes = doc.querySelectorAll('Items > Combination');
  combinationNodes.forEach(node => {
    const mii = node.getAttribute('mii');
    const category = node.getAttribute('category');
    const subcategory = node.getAttribute('subcategory');
    const key = `${mii}|${category}|${subcategory}`;
    
    const itemNodes = node.querySelectorAll('Item');
    data.items[key] = [];
    itemNodes.forEach(itemNode => {
      data.items[key].push(itemNode.textContent);
    });
  });
  
  return data;
}

function yamlToData(yaml) {
  const data = {
    miis: [],
    categories: [],
    subcategories: {},
    items: {}
  };
  
  const lines = yaml.split('\n');
  let currentSection = '';
  let currentKey = '';
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('miis:')) {
      currentSection = 'miis';
    } else if (trimmed.startsWith('categories:')) {
      currentSection = 'categories';
    } else if (trimmed.startsWith('subcategories:')) {
      currentSection = 'subcategories';
    } else if (trimmed.startsWith('items:')) {
      currentSection = 'items';
    } else if (trimmed.startsWith('- ')) {
      const value = trimmed.substring(2).replace(/^"|"$/g, '');
      
      if (currentSection === 'miis') {
        data.miis.push(value);
      } else if (currentSection === 'categories') {
        data.categories.push(value);
        data.subcategories[value] = data.subcategories[value] || [];
      } else if (currentSection === 'subcategories' && currentKey) {
        data.subcategories[currentKey].push(value);
      } else if (currentSection === 'items' && currentKey) {
        data.items[currentKey].push(value);
      }
    } else if (trimmed.match(/^"[^"]+":$/)) {
      currentKey = trimmed.substring(1, trimmed.length - 1);
      if (currentSection === 'subcategories') {
        data.subcategories[currentKey] = data.subcategories[currentKey] || [];
      } else if (currentSection === 'items') {
        data.items[currentKey] = data.items[currentKey] || [];
      }
    }
  });
  
  return data;
}

function txtToData(txt) {
  const data = {
    miis: [],
    categories: [],
    subcategories: {},
    items: {}
  };
  
  const lines = txt.split('\n');
  let currentSection = '';
  let currentKey = '';
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    if (trimmed.toUpperCase() === 'MIIS:') {
      currentSection = 'miis';
    } else if (trimmed.toUpperCase() === 'CATEGORIES:') {
      currentSection = 'categories';
    } else if (trimmed.toUpperCase() === 'SUBCATEGORIES:') {
      currentSection = 'subcategories';
    } else if (trimmed.toUpperCase() === 'ITEMS:') {
      currentSection = 'items';
    } else if (trimmed.startsWith('- ')) {
      const value = trimmed.substring(2);
      
      if (currentSection === 'miis') {
        data.miis.push(value);
      } else if (currentSection === 'categories') {
        data.categories.push(value);
        data.subcategories[value] = data.subcategories[value] || [];
      } else if (currentSection === 'subcategories' && currentKey) {
        data.subcategories[currentKey].push(value);
      } else if (currentSection === 'items' && currentKey) {
        data.items[currentKey].push(value);
      }
    } else if (trimmed.endsWith(':') && !trimmed.toUpperCase().includes('MIIS') && !trimmed.toUpperCase().includes('CATEGORIES') && !trimmed.toUpperCase().includes('SUBCATEGORIES') && !trimmed.toUpperCase().includes('ITEMS')) {
      currentKey = trimmed.substring(0, trimmed.length - 1);
      if (currentSection === 'subcategories') {
        data.subcategories[currentKey] = data.subcategories[currentKey] || [];
      } else if (currentSection === 'items') {
        data.items[currentKey] = data.items[currentKey] || [];
      }
    }
  });
  
  return data;
}

function iniToData(ini) {
  const data = {
    miis: [],
    categories: [],
    subcategories: {},
    items: {}
  };
  
  const lines = ini.split('\n');
  let currentSection = '';
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('[Miis]')) {
      currentSection = 'miis';
    } else if (trimmed.startsWith('[Categories]')) {
      currentSection = 'categories';
    } else if (trimmed.startsWith('[Subcategories]')) {
      currentSection = 'subcategories';
    } else if (trimmed.startsWith('[Items]')) {
      currentSection = 'items';
    } else if (trimmed.includes('=')) {
      const [key, value] = trimmed.split('=');
      
      if (currentSection === 'miis') {
        data.miis.push(value);
      } else if (currentSection === 'categories') {
        data.categories.push(value);
        data.subcategories[value] = data.subcategories[value] || [];
      } else if (currentSection === 'subcategories') {
        const category = key.replace(/_/g, ' ');
        data.subcategories[category] = value.split(',').map(v => v.trim());
      } else if (currentSection === 'items') {
        const itemKey = key.replace(/_/g, ' ');
        data.items[itemKey] = value.split(',').map(v => v.trim());
      }
    }
  });
  
  return data;
}

function tomlToData(toml) {
  const data = {
    miis: [],
    categories: [],
    subcategories: {},
    items: {}
  };
  
  const lines = toml.split('\n');
  let currentSection = '';
  let currentKey = '';
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('miis = [')) {
      currentSection = 'miis';
    } else if (trimmed.startsWith('categories = [')) {
      currentSection = 'categories';
    } else if (trimmed.startsWith('[subcategories]')) {
      currentSection = 'subcategories';
    } else if (trimmed.startsWith('[items]')) {
      currentSection = 'items';
    } else if (trimmed.startsWith('"') && trimmed.endsWith('",')) {
      const value = trimmed.substring(1, trimmed.length - 2);
      
      if (currentSection === 'miis') {
        data.miis.push(value);
      } else if (currentSection === 'categories') {
        data.categories.push(value);
        data.subcategories[value] = data.subcategories[value] || [];
      } else if (currentSection === 'subcategories' && currentKey) {
        data.subcategories[currentKey].push(value);
      } else if (currentSection === 'items' && currentKey) {
        data.items[currentKey].push(value);
      }
    } else if (trimmed.match(/^"[^"]+" = \[$/)) {
      currentKey = trimmed.substring(1, trimmed.indexOf(' = ['));
      if (currentSection === 'subcategories') {
        data.subcategories[currentKey] = data.subcategories[currentKey] || [];
      } else if (currentSection === 'items') {
        data.items[currentKey] = data.items[currentKey] || [];
      }
    }
  });
  
  return data;
}

function cslToData(csl) {
  const parsed = JSON.parse(csl);
  const data = {
    miis: [],
    categories: [],
    subcategories: {},
    items: {}
  };
  
  // Parse authors as Miis
  if (parsed.author && Array.isArray(parsed.author)) {
    parsed.author.forEach(author => {
      const name = [author.given, author.family].filter(Boolean).join(' ');
      if (name) data.miis.push(name);
    });
  }
  
  // Parse categories
  if (parsed.categories && Array.isArray(parsed.categories)) {
    parsed.categories.forEach(cat => {
      data.categories.push(cat.id);
      if (cat.subcategories && Array.isArray(cat.subcategories)) {
        data.subcategories[cat.id] = cat.subcategories.map(sub => sub.id);
      }
    });
  }
  
  // Parse items
  if (parsed.items && Array.isArray(parsed.items)) {
    parsed.items.forEach(item => {
      const key = `${item.mii}|${item.category}|${item.subcategory}`;
      data.items[key] = item.title ? item.title.split(', ') : [];
    });
  }
  
  return data;
}

// ─── INIT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  createWheels();
  for (let i=0;i<wheelCount;i++) {
    draw(i,0);
  }
});
