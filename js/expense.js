/* ============================================================
   expense.js
   Logic for expense.html (Expense Calculator page) only.
   Load AFTER data.js, nav.js and common.js.
   ============================================================ */

/* ============ EXPENSE CALCULATOR ============ */
function initExpenseForm(){
  const sel = document.getElementById('dest-select');
  sel.innerHTML = destinations.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  sel.value = getCurrentDest();
  const budget = document.getElementById('budget-input');
  const budgetDisplay = document.getElementById('budget-display');
  budget.addEventListener('input', ()=>{ budgetDisplay.textContent = '₹' + Number(budget.value).toLocaleString('en-IN'); });
  calculateExpense();
}
function calculateExpense(){
  const d = destinations.find(x=>x.id===document.getElementById('dest-select').value);
  const days = Math.max(1, Number(document.getElementById('days-input').value) || 1);
  const people = Math.max(1, Number(document.getElementById('people-input').value) || 1);
  const budget = Number(document.getElementById('budget-input').value);
  const style = document.getElementById('style-select').value;
  const styleMultiplier = {budget:0.75, balanced:1, comfort:1.4}[style];
  const estimatedDailyPerPerson = 3200 * styleMultiplier * destCostIndex(d.id);
  const estimatedCost = Math.round(estimatedDailyPerPerson * days * people);
  const over = estimatedCost > budget;
  const cats = d.baseCost;
  const rows = [
    {lbl:'Stay', pct:cats.stay, color:'#0a3fa3'},
    {lbl:'Travel', pct:cats.travel, color:'#0f9d78'},
    {lbl:'Food', pct:cats.food, color:'#e0432e'},
    {lbl:'Activities', pct:cats.activities, color:'#e08a1e'}
  ];
  document.getElementById('expense-result').innerHTML = `
    <h4>Estimated trip cost</h4>
    <div class="result-total"><span class="amt">₹${estimatedCost.toLocaleString('en-IN')}</span></div>
    <div class="result-sub">${d.name} · ${days} day${days>1?'s':''} · ${people} traveller${people>1?'s':''} · ${style} style</div>
    <div class="budget-flag ${over?'over':'ok'}">
      ${over ? `This runs ₹${(estimatedCost-budget).toLocaleString('en-IN')} over your ₹${budget.toLocaleString('en-IN')} budget. Try the "Budget" travel style or trim a day.`
             : `Within your ₹${budget.toLocaleString('en-IN')} budget, with ₹${(budget-estimatedCost).toLocaleString('en-IN')} to spare.`}
    </div>
    ${rows.map(r=>`<div class="breakdown-row"><span class="lbl">${r.lbl}</span><div class="bar-track"><div class="bar-fill" style="width:${r.pct*100}%;background:${r.color};"></div></div><span class="amt">₹${Math.round(estimatedCost*r.pct).toLocaleString('en-IN')}</span></div>`).join('')}
  `;
}
function destCostIndex(id){ const idx = {taj:1.1, jaipur:1.0, goa:1.25, kerala:1.15, manali:1.05, varanasi:0.85}; return idx[id] || 1; }

