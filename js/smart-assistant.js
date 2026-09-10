/*
 * Free, private, rule-based trip assistant.
 * It runs entirely in the browser using the destination data already in TouriSense.
 * No generative-AI provider, secret key, Cloud Function, or paid service is used.
 */
(function(){
  const money = n => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const title = text => text.replace(/\b\w/g, letter => letter.toUpperCase());
  // Kept here (rather than relying on expense.js) because this page loads independently.
  const destinationCostIndex = id => ({taj:1.1, jaipur:1.0, bhopal:0.9, goa:1.25, kerala:1.15, manali:1.05, varanasi:0.85}[id] || 1);
  function explicitDestination(text){
    const query = text.toLowerCase();
    return destinations.find(d => query.includes(d.id) || query.includes(d.name.toLowerCase()) || query.includes(d.name.split(',')[0].toLowerCase()))
      || null;
  }
  function findDestination(text, profile, history){
    const fromMessage = explicitDestination(text);
    if(fromMessage) return fromMessage;
    const previousUserText = (history || []).filter(item => item.role === 'user').map(item => item.text).reverse();
    for(const previous of previousUserText){ const found = explicitDestination(previous); if(found) return found; }
    const saved = [...(profile.trips || []), ...(profile.expenses || [])].map(x => x.destinationId);
    return destinations.find(d => saved.includes(d.id)) || destinations.find(d => d.id === getCurrentDest());
  }
  function numberAfter(text, patterns, fallback){
    for(const pattern of patterns){ const match = text.match(pattern); if(match) return Number(match[1].replace(/,/g,'')); }
    return fallback;
  }
  function priorUserText(history){ return (history || []).filter(item => item.role === 'user').map(item => item.text).reverse().join(' '); }
  function tripCost(d, days, people, style){ return Math.round(3200 * {budget:.75, balanced:1, comfort:1.4}[style] * destinationCostIndex(d.id) * days * people); }
  function budgetAnswer(d, days, people, budget, style){
    const standard = tripCost(d, days, people, style);
    const isTight = budget && budget < standard;
    const revisedStyle = isTight ? 'budget' : style;
    const revised = tripCost(d, days, people, revisedStyle);
    const perPerson = Math.round((budget || revised) / people);
    const stay = Math.round((budget || revised) * d.baseCost.stay), travel = Math.round((budget || revised) * d.baseCost.travel), food = Math.round((budget || revised) * d.baseCost.food), activities = Math.round((budget || revised) * d.baseCost.activities);
    return `BUDGET UPDATE — ${d.name.toUpperCase()}\n\n`+
      `I have kept your existing trip context: ${days} day${days===1?'':'s'} · ${people} traveller${people===1?'':'s'}.\n\n`+
      `Target budget: ${money(budget)} (${money(perPerson)} per traveller)\n`+
      `Normal ${title(style)} estimate: ${money(standard)}\n`+
      `Best low-cost version: ${money(revised)} using ${title(revisedStyle)} style.\n\n`+
      `Suggested allocation for a ${money(budget)} cap:\nStay ${money(stay)} · Travel ${money(travel)} · Food ${money(food)} · Activities ${money(activities)}\n\n`+
      `${isTight ? `To reach the target, prefer ${d.travelOptions.find(x=>x.mode==='Train')?.mode || 'shared transport'}, book stays early, choose local meals, and focus on 1–2 key attractions. If ${money(budget)} is strict, shorten the trip or increase the budget because the practical low-cost estimate is ${money(revised)}.` : 'This budget is workable. Keep a 10% contingency rather than spending every rupee.'}\n\n`+
      `Tell me “make it 3 days”, “for 4 people”, or “show transport options” and I will revise this same trip.`;
  }
  function focusedAnswer(intent, d, days, people, budget, style){
    if(intent === 'transport') return `TRAVEL OPTIONS FOR ${d.name.toUpperCase()}\n\n${d.travelOptions.map((option, index) => `${index+1}. ${option.mode}: ${option.duration} · ${option.cost}\n${option.desc}`).join('\n\n')}\n\nFor your ${days}-day trip, choose the option that preserves the most sightseeing time while staying within ${budget ? money(budget) : 'your budget'}.`;
    if(intent === 'places') return `TOP PLACES FOR ${d.name.toUpperCase()}\n\n${d.connecting.map((place, index) => `${index+1}. ${place.name} — ${place.dist} · allow ${place.time}\n${place.desc}`).join('\n\n')}\n\nFor ${days} day${days===1?'':'s'}, prioritise the first ${Math.min(days, d.connecting.length)} place${days===1?'':'s'} and leave buffer time for travel.`;
    if(intent === 'weather') return `WEATHER & TIMING — ${d.name.toUpperCase()}\n\nCurrent destination read: ${d.weather.temp}°C, ${d.weather.cond}; rain chance ${d.weather.rain}%. ${d.weather.advice === 'warn' ? 'Plan a flexible indoor alternative, carry rain protection, and leave extra transfer time.' : 'Start outdoor sightseeing early and carry water/sun protection.'}\n\nBest travel season in TouriSense: ${d.bestTime}. Check the Weather Advisory page just before travel for the live API update.`;
    if(intent === 'packing') return `PACKING FOR ${d.name.toUpperCase()}\n\nEssentials: government ID, booking copies, charger/power bank, payment backup, reusable bottle, comfortable footwear and basic medicines.\n\nDestination tip: ${d.weather.advice === 'warn' ? 'pack a rain jacket/waterproof cover and a warm layer if travelling in the evening.' : 'pack a light layer, sunscreen/cap and breathable clothing.'}\n\nFor a ${days}-day trip, pack outfits for ${days} days plus one flexible layer instead of overpacking.`;
    if(intent === 'crowd') return `CROWD ADVICE — ${d.name.toUpperCase()}\n\nThe historical pattern suggests the quietest period is around ${String(d.hourly.indexOf(Math.min(...d.hourly))).padStart(2,'0')}:00. Do not treat that as a live reading. Open Crowd & Peak Hours before leaving to see recent traveller reports, then plan your visit around the live status.`;
    return tripAnswer('', d, days, people, budget, style);
  }
  function tripAnswer(message, d, days, people, budget, style){
    const multiplier = {budget:.75, balanced:1, comfort:1.4}[style];
    const cost = Math.round(3200 * multiplier * destinationCostIndex(d.id) * days * people);
    const places = d.connecting.slice(0, Math.min(3, days)).map(x => x.name);
    const transport = d.travelOptions[0];
    const avg = d.weather;
    const budgetNote = budget ? (cost <= budget ? `This fits within your ${money(budget)} budget, leaving about ${money(budget-cost)}.` : `This is about ${money(cost-budget)} above your ${money(budget)} budget; select Budget style, reduce days, or use a lower-cost travel option.`) : `A realistic ${title(style)} estimate is ${money(cost)}.`;
    const stay = Math.round(cost*d.baseCost.stay), travel = Math.round(cost*d.baseCost.travel), food = Math.round(cost*d.baseCost.food), activities = Math.round(cost*d.baseCost.activities);
    return `YOUR ${days}-DAY ${d.name.toUpperCase()} ROADMAP\n\n`+
`Travellers: ${people} · Style: ${title(style)} · Best season: ${d.bestTime}\n\n`+
`1. GETTING THERE\nRecommended: ${transport.mode} — ${transport.duration} (${transport.cost}). ${transport.desc}\n\n`+
`2. DAY-BY-DAY PLAN\n`+
Array.from({length:days}, (_, i) => {
  if(i===0) return `Day 1: Arrive, check in, and keep the first evening relaxed. Review local transport and your return plan.`;
  const place = places[(i-1)%places.length]; const info = d.connecting.find(x=>x.name===place);
  if(i===days-1 && days>2) return `Day ${i+1}: Keep time for local shopping/relaxation, check out, and leave with a buffer for the return journey.`;
  return `Day ${i+1}: Visit ${place} (${info.time}). ${info.desc}`;
}).join('\n') + `\n\n3. ESTIMATED BUDGET\nTotal: ${money(cost)}\nStay: ${money(stay)} · Travel: ${money(travel)} · Food: ${money(food)} · Activities: ${money(activities)}\n${budgetNote}\n\n`+
`4. WEATHER & TIMING\nTypical current local read: ${avg.temp}°C, ${avg.cond}. ${avg.advice==='warn' ? 'Keep a flexible indoor backup, rain protection, and extra transfer time.' : 'Conditions are generally suitable for sightseeing; start outdoor visits early.'}\nUse the Crowd page for recent community reports before leaving.\n\n`+
`5. PACKING CHECKLIST\nGovernment ID, booking copies, power bank, reusable water bottle, comfortable footwear, basic medicines, weather-appropriate layer/rain cover, and cash plus digital payment backup.\n\n`+
`Note: This is a free rule-based planning recommendation based on TouriSense’s destination data and estimates. Confirm live prices, operating hours, weather, permits, and safety guidance before travel.`;
  }
  function reply(message, profile, history){
    const text = message.toLowerCase();
    const prior = priorUserText(history);
    const d = findDestination(text, profile, history);
    const savedExpense = (profile.expenses || []).find(x => x.destinationId === d.id);
    const savedTrip = (profile.trips || []).find(x => x.destinationId === d.id);
    const days = Math.min(30, Math.max(1, numberAfter(text, [/(\d+)\s*(?:day|days|din)/], numberAfter(prior, [/(\d+)\s*(?:day|days|din)/], savedExpense?.days || 4))));
    const people = Math.min(20, Math.max(1, numberAfter(text, [/(?:for|with)\s*(\d+)(?:\s*(?:people|person|travellers?|travelers?))?\s*(?:under|within|budget|₹|rs|rupees|$)/, /(\d+)\s*(?:people|person|travellers?|travelers?)/], numberAfter(prior, [/(?:for|with)\s*(\d+)(?:\s*(?:people|person|travellers?|travelers?))?\s*(?:under|within|budget|₹|rs|rupees|$)/, /(\d+)\s*(?:people|person|travellers?|travelers?)/], savedExpense?.people || 2))));
    const budget = numberAfter(text, [/(?:under|budget(?: of| is)?|within|make it(?: in| under)?)\s*(?:₹|rs\.?\s*)?([\d,]+)(?:k|000)?(?:\s*(?:rupees|rs\.?))?/, /(?:₹|rs\.?\s*)([\d,]+)/, /([\d,]+)\s*rupees/], numberAfter(prior, [/(?:under|budget(?: of| is)?|within|make it(?: in| under)?)\s*(?:₹|rs\.?\s*)?([\d,]+)(?:k|000)?(?:\s*(?:rupees|rs\.?))?/, /(?:₹|rs\.?\s*)([\d,]+)/, /([\d,]+)\s*rupees/], savedExpense?.budget || 0));
    const normalBudget = budget && /\d+k\b/.test(`${text} ${prior}`) ? budget*1000 : budget;
    const style = /comfort|luxury|premium/.test(text) ? 'comfort' : /budget|cheap|low.cost/.test(text) ? 'budget' : savedExpense?.style || 'balanced';
    if(/hello|hi|help|what can you do/.test(text) && text.length < 80) return `I can create a complete trip roadmap, budget estimate, transport recommendation, packing checklist, and destination advice. Try: “Plan a 4-day Goa trip for 2 under ₹40,000” or “Use my saved Jaipur budget.”`;
    if(/saved|my plan|my trip|my budget/.test(text) && !savedExpense && !savedTrip) return `You do not have a saved plan or budget for ${d.name} yet. I can create one now—tell me your days, travellers, budget, and travel style.`;
    if(/pack|carry|luggage/.test(text)) return focusedAnswer('packing', d, days, people, normalBudget, style);
    if(/weather|rain|temperature|season/.test(text)) return focusedAnswer('weather', d, days, people, normalBudget, style);
    if(/crowd|busy|peak|quiet/.test(text)) return focusedAnswer('crowd', d, days, people, normalBudget, style);
    if(/place|visit|attraction|sightseeing|see/.test(text)) return focusedAnswer('places', d, days, people, normalBudget, style);
    if(/travel|transport|train|flight|reach|go there/.test(text)) return focusedAnswer('transport', d, days, people, normalBudget, style);
    if(/budget|cost|expense|afford|make it|₹|rupees|rs\.?/.test(text) && !/(?:plan|itinerary|roadmap)/.test(text)) return budgetAnswer(d, days, people, normalBudget || tripCost(d, days, people, style), style);
    return tripAnswer(message, d, days, people, normalBudget, style);
  }
  window.rahiSmartAssistant = { reply };
})();
