// app.js (verified)
(function(){
  const sameOrigin = (location.protocol === 'http:' || location.protocol === 'https:');
  const API_BASE = sameOrigin ? `${window.location.origin}/api` : `http://localhost:3000/api`;

  const el = {
    totalWorkouts: document.getElementById('totalWorkouts'),
    totalMinutes: document.getElementById('totalMinutes'),
    totalCalories: document.getElementById('totalCalories'),
    form: document.getElementById('workoutForm'),
    date: document.getElementById('date'),
    type: document.getElementById('type'),
    duration: document.getElementById('duration'),
    calories: document.getElementById('calories'),
    notes: document.getElementById('notes'),
    tableBody: document.querySelector('#workoutsTable tbody'),
    filterType: document.getElementById('filterType'),
    filterFrom: document.getElementById('filterFrom'),
    filterTo: document.getElementById('filterTo'),
    applyFilters: document.getElementById('applyFilters'),
    clearFilters: document.getElementById('clearFilters'),
    chart: document.getElementById('chart'),
    btnCheck: document.getElementById('btnCheck'),
    healthBadge: document.getElementById('healthBadge'),
    toast: document.getElementById('toast')
  };

  function showToast(msg){
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    setTimeout(()=>el.toast.classList.remove('show'), 2200);
  }

  el.date.valueAsDate = new Date();

  async function api(path, options = {}){
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) {
      let err = 'Request failed';
      try { const j = await res.json(); err = j.error || j.pathTried || res.statusText; } catch {}
      throw new Error(`${res.status} ${err}`);
    }
    return res.json();
  }

  async function checkHealth(){
    try {
      const data = await api('/health');
      el.healthBadge.textContent = `OK :${data.port}`;
      el.healthBadge.style.color = '#7bffca';
      showToast('API connected ✔');
      return true;
    } catch (e) {
      el.healthBadge.textContent = 'Offline';
      el.healthBadge.style.color = '#ff6b6b';
      showToast('API not reachable. Make sure server is running.');
      return false;
    }
  }

  el.btnCheck.addEventListener('click', checkHealth);

  async function loadStats(){
    try{
      const stats = await api('/stats');
      el.totalWorkouts.textContent = stats.totals.totalWorkouts || 0;
      el.totalMinutes.textContent = stats.totals.totalMinutes || 0;
      el.totalCalories.textContent = stats.totals.totalCalories || 0;
      drawChart(stats.last7 || []);
    }catch(e){ console.error(e); showToast(e.message); }
  }

  function rowTemplate(w){
    return `<tr data-id="${w.id}">
      <td><input type="date" value="${w.date}" data-field="date"/></td>
      <td>
        <select data-field="type">
          ${['Running','Walking','Cycling','Gym','Yoga','Other'].map(t=>`<option ${t===w.type?'selected':''}>${t}</option>`).join('')}
        </select>
      </td>
      <td><input type="number" value="${w.duration}" min="1" data-field="duration"/></td>
      <td><input type="number" value="${w.calories||0}" min="0" data-field="calories"/></td>
      <td><input type="text" value="${(w.notes||'').replace(/"/g,'&quot;')}" data-field="notes"/></td>
      <td class="action">
        <button class="icon-btn edit" data-action="save">Save</button>
        <button class="icon-btn delete" data-action="delete">Delete</button>
      </td>
    </tr>`;
  }

  async function loadWorkouts(){
    const q = new URLSearchParams();
    if (el.filterType.value && el.filterType.value !== 'All') q.set('type', el.filterType.value);
    if (el.filterFrom.value) q.set('from', el.filterFrom.value);
    if (el.filterTo.value) q.set('to', el.filterTo.value);
    const workouts = await api(`/workouts?${q.toString()}`);
    el.tableBody.innerHTML = workouts.map(rowTemplate).join('');
  }

  el.applyFilters.addEventListener('click', () => loadWorkouts().then(loadStats));
  el.clearFilters.addEventListener('click', () => {
    el.filterType.value = 'All';
    el.filterFrom.value = '';
    el.filterTo.value = '';
    loadWorkouts().then(loadStats);
  });

  el.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      date: el.date.value,
      type: el.type.value,
      duration: Number(el.duration.value),
      calories: el.calories.value ? Number(el.calories.value) : 0,
      notes: el.notes.value
    };
    try {
      await api('/workouts', { method: 'POST', body: JSON.stringify(body) });
      el.form.reset();
      el.date.valueAsDate = new Date();
      await loadWorkouts();
      await loadStats();
      showToast('Workout saved!');
    } catch (err) {
      showToast(err.message);
    }
  });

  el.tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const tr = e.target.closest('tr');
    const id = tr?.dataset?.id;
    if (!id) return;

    if (btn.dataset.action === 'delete') {
      if (!confirm('Delete this workout?')) return;
      try {
        await api(`/workouts/${id}`, { method: 'DELETE' });
        await loadWorkouts();
        await loadStats();
        showToast('Deleted.');
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    if (btn.dataset.action === 'save') {
      const data = {};
      tr.querySelectorAll('[data-field]').forEach(input => {
        const key = input.dataset.field;
        data[key] = input.type === 'number' ? Number(input.value) : input.value;
      });
      try {
        await api(`/workouts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        await loadWorkouts();
        await loadStats();
        showToast('Saved.');
      } catch (err) {
        showToast(err.message);
      }
      return;
    }
  });

  function drawChart(points){
    const ctx = el.chart.getContext('2d');
    const w = el.chart.width = el.chart.clientWidth * (window.devicePixelRatio || 1);
    const h = el.chart.height = 200 * (window.devicePixelRatio || 1);
    ctx.clearRect(0,0,w,h);

    const today = new Date();
    const last7 = [...Array(7)].map((_,i)=>{
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const iso = d.toISOString().slice(0,10);
      const match = points.find(p => (p.date||'').slice(0,10) === iso);
      return { date: iso, minutes: match ? (match.minutes||0) : 0 };
    });

    const maxVal = Math.max(60, ...last7.map(p=>p.minutes));
    const padding = 40;
    const chartW = w - padding*2;
    const chartH = h - padding*2;
    const stepX = chartW / last7.length;
    const barW = stepX * 0.6;

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.moveTo(padding, h - padding);
    ctx.lineTo(padding, padding);
    ctx.stroke();

    last7.forEach((p, i) => {
      const x = padding + i * stepX + (stepX - barW)/2;
      const barH = (p.minutes / maxVal) * chartH;
      const y = h - padding - barH;
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, 'rgba(124,161,255,0.9)');
      grad.addColorStop(1, 'rgba(124,161,255,0.2)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW, barH);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `${12 * (window.devicePixelRatio || 1)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.date.slice(5).replace('-', '/'), x + barW/2, h - padding + 16 * (window.devicePixelRatio || 1));
    });
  }

  (async function init(){
    await checkHealth();
    await loadWorkouts();
    await loadStats();
  })();

})();