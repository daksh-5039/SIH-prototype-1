/* ============================================================
   data.js
   Shared data + small utilities used by every page.
   Load this file BEFORE any other Rahi script on a page.
   ============================================================ */

/* ============ DATA ============ */
const destinations = [
  {id:'taj', name:'Taj Mahal, Agra', region:'Uttar Pradesh', coords:{lat:27.1751,lon:78.0421}, bestTime:'Oct – Mar', modes:['Train','Flight','Road'],
    travelNote:'2h from Delhi by Gatimaan Express, or a 3.5h drive via Yamuna Expressway.',
    travelOptions:[
      {mode:'Flight', duration:'55 min from Delhi', cost:'₹3,800 – 6,500', desc:'Nearest airport is Agra (Kheria), ~13 km from the Taj. Fastest option but pricier for such a short hop.'},
      {mode:'Train', duration:'1h 40m – 3h', cost:'₹750 – 1,800', desc:'Gatimaan Express is the quickest rail link from Delhi. Agra Cantt station is 6 km from the monument.'},
      {mode:'Road', duration:'3.5 – 4h from Delhi', cost:'₹1,500 – 3,500', desc:'Yamuna Expressway is a smooth, scenic drive — good if you want to stop at other towns en route.'}
    ],
    connecting:[
      {name:'Agra Fort',dist:'2.5 km',coords:{lat:27.1795,lon:78.0211},time:'1.5 – 2 hrs',desc:'A red-sandstone Mughal fort overlooking the Yamuna, with a clear view of the Taj from its ramparts.'},
      {name:'Fatehpur Sikri',dist:'40 km',coords:{lat:27.0945,lon:77.6678},time:'2.5 – 3 hrs',desc:'A perfectly preserved Mughal ghost city — best combined as a half-day trip on the way out of Agra.'},
      {name:'Mehtab Bagh',dist:'1 km',coords:{lat:27.1750,lon:78.0400},time:'45 min',desc:'A garden directly across the river from the Taj — the spot for sunset photos without the crowd.'}
    ],
    crowd:'high', crowdReason:'Weekend + peak season overlap',
    hourly:[20,15,35,55,70,85,95,90,80,88,92,85,70,60,45,30,20,15,10,10,15,20,20,20],
    weather:{temp:19,cond:'Hazy, mild',rain:10,advice:'good'},
    baseCost:{stay:0.38,travel:0.22,food:0.22,activities:0.18}},
  {id:'jaipur', name:'Jaipur', region:'Rajasthan', coords:{lat:26.9124,lon:75.7873}, bestTime:'Nov – Feb', modes:['Train','Flight','Road'],
    travelNote:'Well connected by air and rail from all major metros; 4.5h drive from Delhi.',
    travelOptions:[
      {mode:'Flight', duration:'1h 15m from Delhi', cost:'₹3,200 – 6,000', desc:'Jaipur International Airport (Sanganer) is 13 km from the city centre — frequent daily flights.'},
      {mode:'Train', duration:'4.5 – 5.5h', cost:'₹500 – 1,600', desc:'Multiple daily trains from Delhi, including the Shatabdi. Jaipur Junction is central.'},
      {mode:'Road', duration:'4.5 – 5h from Delhi', cost:'₹1,800 – 3,000', desc:'A well-maintained highway drive; buses and self-drive are both comfortable options.'}
    ],
    connecting:[
      {name:'Amber Fort',dist:'11 km',coords:{lat:26.9855,lon:75.8513},time:'2 – 3 hrs',desc:'A hilltop fort-palace with mirrored halls — arrive early to beat both heat and tour groups.'},
      {name:'Nahargarh Fort',dist:'8 km',coords:{lat:26.9373,lon:75.8157},time:'1.5 hrs',desc:'Best for a golden-hour view over the whole Pink City.'},
      {name:'Chokhi Dhani',dist:'20 km',coords:{lat:26.7730,lon:75.8689},time:'3 – 4 hrs (evening)',desc:'A recreated Rajasthani village with folk performances and a traditional thali dinner.'}
    ],
    crowd:'medium', crowdReason:'Steady weekday footfall',
    hourly:[10,8,20,40,55,65,75,72,68,74,78,70,55,48,40,30,22,18,12,10,8,8,8,10],
    weather:{temp:24,cond:'Clear skies',rain:0,advice:'good'},
    baseCost:{stay:0.34,travel:0.20,food:0.24,activities:0.22}},
  {id:'bhopal', name:'Bhopal', region:'Madhya Pradesh', coords:{lat:23.2599,lon:77.4126}, bestTime:'Oct – Mar', modes:['Train','Flight','Road'],
    travelNote:'A central Indian city with direct rail links, a domestic airport, lakes and easy access to UNESCO-listed Sanchi.',
    travelOptions:[
      {mode:'Flight', duration:'1h 20m from Delhi', cost:'₹3,000 – 6,000', desc:'Raja Bhoj Airport is about 15 km from the city centre and connects Bhopal with major Indian cities.'},
      {mode:'Train', duration:'7 – 9h from Delhi', cost:'₹650 – 2,000', desc:'Bhopal Junction and Rani Kamlapati station have frequent long-distance trains and convenient city access.'},
      {mode:'Road', duration:'12 – 14h from Delhi', cost:'₹2,500 – 4,500', desc:'A longer road journey best suited to self-drive travellers or an itinerary that includes nearby Madhya Pradesh destinations.'}
    ],
    connecting:[
      {name:'Upper Lake (Bhojtal)',dist:'3 km',coords:{lat:23.2461,lon:77.3544},time:'1 – 2 hrs',desc:'Bhopal’s signature lakefront—ideal for a relaxed sunset walk, boating and views across the water.'},
      {name:'Van Vihar National Park',dist:'6 km',coords:{lat:23.2393,lon:77.3665},time:'2 – 3 hrs',desc:'An urban national park beside Upper Lake, best visited in the cooler morning hours for its open wildlife enclosures.'},
      {name:'Sanchi Stupa',dist:'48 km',coords:{lat:23.4793,lon:77.7391},time:'Half day',desc:'A UNESCO World Heritage Buddhist complex with ancient stupas and carvings; combine it with an early departure from Bhopal.'}
    ],
    crowd:'medium', crowdReason:'Steady city and weekend sightseeing footfall',
    hourly:[8,6,8,12,20,35,48,55,60,64,68,62,52,45,38,32,28,25,30,36,28,18,12,10],
    weather:{temp:26,cond:'Warm, partly cloudy',rain:8,advice:'good'},
    baseCost:{stay:0.32,travel:0.23,food:0.24,activities:0.21}},
  {id:'goa', name:'Goa', region:'Goa', coords:{lat:15.2993,lon:74.1240}, bestTime:'Nov – Feb', modes:['Flight','Train','Road'],
    travelNote:'Direct flights from every major city; overnight trains from Mumbai and Bengaluru.',
    travelOptions:[
      {mode:'Flight', duration:'1h 30m – 2h30m', cost:'₹4,000 – 9,000', desc:'Dabolim and the newer Mopa airport both connect to most major Indian cities directly.'},
      {mode:'Train', duration:'8 – 12h overnight', cost:'₹800 – 2,500', desc:'Konkan Railway route from Mumbai is scenic and a popular overnight option to save on a hotel night.'},
      {mode:'Road', duration:'10 – 12h from Mumbai/Bengaluru', cost:'₹2,000 – 4,000', desc:'Long but doable by sleeper bus or self-drive if you want the coastal route.'}
    ],
    connecting:[
      {name:'Baga Beach',dist:'—',coords:{lat:15.5553,lon:73.7517},time:'Half day',desc:'The liveliest beach strip — water sports by day, beach shacks and markets by night.'},
      {name:'Old Goa Churches',dist:'10 km',coords:{lat:15.5009,lon:73.9116},time:'2 hrs',desc:'UNESCO-listed Portuguese-era churches, including the Basilica of Bom Jesus.'},
      {name:'Dudhsagar Falls',dist:'60 km',coords:{lat:15.3144,lon:74.3145},time:'Full day',desc:'A four-tiered waterfall inside a national park — needs a jeep safari to reach, best in monsoon/post-monsoon.'}
    ],
    crowd:'high', crowdReason:'Peak tourist season',
    hourly:[15,10,10,15,25,35,45,50,55,60,65,72,80,85,88,85,80,75,78,82,70,50,30,20],
    weather:{temp:31,cond:'Humid, isolated showers',rain:55,advice:'warn'},
    baseCost:{stay:0.36,travel:0.18,food:0.22,activities:0.24}},
  {id:'kerala', name:'Kerala Backwaters', region:'Kerala', coords:{lat:9.4981,lon:76.3388}, bestTime:'Sep – Mar', modes:['Flight','Train','Road'],
    travelNote:'Fly into Kochi, then a 1.5h drive to Alleppey for houseboat departure.',
    travelOptions:[
      {mode:'Flight', duration:'to Kochi, then 1.5h road', cost:'₹4,500 – 8,000', desc:'Cochin International Airport connects to all major cities; Alleppey is a short drive away.'},
      {mode:'Train', duration:'to Alleppey/Ernakulam', cost:'₹700 – 2,200', desc:'Direct trains from Chennai, Bengaluru and Mumbai run into Ernakulam Junction.'},
      {mode:'Road', duration:'Varies by origin', cost:'₹2,000 – 4,500', desc:'Good for combining with a wider Kerala coastal itinerary — roads along the coast are scenic.'}
    ],
    connecting:[
      {name:'Alleppey Beach',dist:'4 km',coords:{lat:9.4908,lon:76.3116},time:'1 – 2 hrs',desc:'A quieter beach to unwind before or after your houseboat stay.'},
      {name:'Kumarakom Sanctuary',dist:'16 km',coords:{lat:9.6182,lon:76.4271},time:'Half day',desc:'A bird sanctuary on Vembanad Lake — best visited early morning for sightings.'},
      {name:'Vembanad Lake',dist:'—',coords:{lat:9.5916,lon:76.4138},time:'Full day (houseboat)',desc:'The heart of the backwaters experience — most houseboat routes run through here.'}
    ],
    crowd:'low', crowdReason:'Off-peak weekday',
    hourly:[10,8,10,15,20,28,35,40,38,42,45,40,32,28,22,18,15,12,10,8,8,8,8,10],
    weather:{temp:27,cond:'Overcast, light rain',rain:65,advice:'warn'},
    baseCost:{stay:0.42,travel:0.20,food:0.20,activities:0.18}},
  {id:'manali', name:'Manali', region:'Himachal Pradesh', coords:{lat:32.2432,lon:77.1892}, bestTime:'Mar – Jun, Dec – Jan', modes:['Road','Flight (via Bhuntar)'],
    travelNote:'12h overnight bus from Delhi, or fly to Bhuntar and drive 50 min.',
    travelOptions:[
      {mode:'Flight', duration:'to Bhuntar, then 50 min road', cost:'₹5,500 – 10,000', desc:'Kullu-Manali Airport (Bhuntar) has limited daily flights from Delhi — book early, seats fill fast.'},
      {mode:'Train', duration:'to Chandigarh, then 8h road', cost:'₹600 – 2,000 + cab', desc:'Nearest broad-gauge station is Chandigarh; the onward drive is the longer leg.'},
      {mode:'Road', duration:'12 – 14h overnight from Delhi', cost:'₹1,200 – 3,000', desc:'Volvo overnight buses are the most popular budget option, saves a hotel night too.'}
    ],
    connecting:[
      {name:'Solang Valley',dist:'14 km',coords:{lat:32.3152,lon:77.1555},time:'Half day',desc:'Adventure sports hub — paragliding and zorbing in summer, skiing in winter.'},
      {name:'Old Manali',dist:'3 km',coords:{lat:32.2564,lon:77.1791},time:'2 – 3 hrs',desc:'Cafés, river walks and a slower pace than the main market.'},
      {name:'Rohtang Pass',dist:'51 km',coords:{lat:32.3711,lon:77.2465},time:'Full day',desc:'High-altitude pass with snow most of the year — permits required, and it closes in heavy snow.'}
    ],
    crowd:'medium', crowdReason:'Weekday, shoulder season',
    hourly:[5,5,8,15,25,38,50,58,60,55,50,52,55,50,42,35,28,20,15,10,8,5,5,5],
    weather:{temp:8,cond:'Snow flurries',rain:40,advice:'warn'},
    baseCost:{stay:0.32,travel:0.28,food:0.20,activities:0.20}},
  {id:'varanasi', name:'Varanasi', region:'Uttar Pradesh', coords:{lat:25.3176,lon:82.9739}, bestTime:'Oct – Mar', modes:['Train','Flight','Road'],
    travelNote:'Direct flights and trains from Delhi (~1h flight, ~10h train).',
    travelOptions:[
      {mode:'Flight', duration:'1h 10m from Delhi', cost:'₹3,500 – 6,500', desc:'Lal Bahadur Shastri Airport is about 25 km from the ghats — the fastest way in.'},
      {mode:'Train', duration:'9 – 12h', cost:'₹450 – 1,800', desc:'Well connected to Delhi, Mumbai and Kolkata; Varanasi Junction is close to the old city.'},
      {mode:'Road', duration:'10 – 12h from Delhi', cost:'₹1,500 – 3,200', desc:'A long drive best broken up with a stop — not the most time-efficient option here.'}
    ],
    connecting:[
      {name:'Dashashwamedh Ghat',dist:'—',coords:{lat:25.3064,lon:83.0107},time:'1 – 2 hrs (evening)',desc:'The main ghat — come for the evening Ganga Aarti ceremony, arrive early for a good spot.'},
      {name:'Sarnath',dist:'10 km',coords:{lat:25.3811,lon:83.0220},time:'2 – 3 hrs',desc:'Where Buddha gave his first sermon — a calm counterpoint to the busy ghats.'},
      {name:'Ramnagar Fort',dist:'14 km',coords:{lat:25.2875,lon:83.0494},time:'1.5 hrs',desc:'An 18th-century fort and museum across the Ganges, best reached by boat.'}
    ],
    crowd:'low', crowdReason:'Early week, pre-festival',
    hourly:[30,20,15,20,30,45,55,50,45,48,52,50,42,38,32,28,35,55,70,60,45,38,32,30],
    weather:{temp:21,cond:'Clear, cool mornings',rain:5,advice:'good'},
    baseCost:{stay:0.30,travel:0.20,food:0.24,activities:0.26}}
];

/* ============ CURRENT DESTINATION (shared across pages) ============
   Selecting a destination on one page (e.g. Home) should carry over
   when the visitor is taken to another page (e.g. Trip Planner), so
   the chosen destination is kept in localStorage instead of a plain
   in-memory variable. */
const RAHI_DEST_KEY = 'rahi:currentDest';

function getCurrentDest(){
  return localStorage.getItem(RAHI_DEST_KEY) || destinations[0].id;
}
function setCurrentDest(id){
  localStorage.setItem(RAHI_DEST_KEY, id);
}

/* ============ SMALL SHARED UTILITIES ============ */
function starString(n){ return '★★★★★'.slice(0,n) + '☆☆☆☆☆'.slice(0, 5-n); }
function escapeHtml(s){ const div=document.createElement('div'); div.textContent=s; return div.innerHTML; }

/* Attraction crowd profiles are local historical estimates for this prototype.
   They intentionally vary by place, so a city centre and its attractions do not
   display the same peak-hour pattern. */
function getPlaceCrowdProfile(destination, place){
  const placeIndex = destination.connecting.findIndex(item => item.name === place.name);
  const shifts = [-2, 1, 3];
  const shift = shifts[placeIndex] || 0;
  const multiplier = [0.82, 0.67, 0.74][placeIndex] || 0.75;
  const hourly = destination.hourly.map((value, hour) => {
    const sourceHour = (hour - shift + 24) % 24;
    const adjusted = destination.hourly[sourceHour] * multiplier + (placeIndex === 0 && hour >= 16 && hour <= 19 ? 12 : 0);
    return Math.max(5, Math.min(96, Math.round(adjusted)));
  });
  return { id:`${destination.id}__${placeIndex}`, name:place.name, hourly, isPlace:true, place };
}
