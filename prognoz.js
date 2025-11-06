const API_KEY = "8ed063c9-9b18-4848-ad96-5287dda8fb10";

const icons = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️", overcast: "🌥️",
  drizzle: "🌦️", light_rain: "🌦️", rain: "🌧️", heavy_rain: "⛈️",
  snow: "❄️", light_snow: "🌨️", heavy_snow: "❄️", thunderstorm: "⛈️",
  hail: "🌨️", wind: "💨", sleet: "🌨️", unknown: "❓"
};

function emojiFor(cond){
  if(!cond) return icons.unknown;
  const c = cond.toLowerCase();
  const norm = c.replace(/[-\s]+/g,"_");
  if(icons[norm]) return icons[norm];
  if(/rain|drizzle/.test(c)) return /light/.test(c) ? "🌦️" : /heavy/.test(c) ? "⛈️" : "🌧️";
  if(/snow|sleet/.test(c)) return /light/.test(c) ? "🌨️" : "❄️";
  if(/cloud|overcast/.test(c)) return /partly/.test(c) ? "⛅" : "☁️";
  if(/clear|sun/.test(c)) return "☀️";
  if(/storm/.test(c)) return "⛈️";
  if(/wind/.test(c)) return "💨";
  return icons.unknown;
}

function precipEmoji(mm){
  const m = Number(mm)||0;
  if(m===0) return "—";
  if(m<1) return "🌦️";
  if(m<15) return "🌧️";
  return "⛈️";
}

async function getCoords(city){
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
  const d = await r.json();
  if(!d.length) throw new Error("Город не найден");
  return {lat:d[0].lat, lon:d[0].lon};
}

async function loadWeather(city="Москва"){
  const fadeEls=document.querySelectorAll(".fade");
  fadeEls.forEach(el=>el.classList.add("hidden"));
  await new Promise(r=>setTimeout(r,300));
  document.getElementById("cityName").textContent=city;

  try{
    const {lat,lon}=await getCoords(city);
    const url=`https://api.weather.yandex.ru/v2/forecast?lat=${lat}&lon=${lon}&hours=true&limit=10`;
    const res=await fetch(url,{headers:{"X-Yandex-API-Key":API_KEY}});
    if(!res.ok) throw new Error("Ошибка запроса");
    const data=await res.json();
    const f=data.fact||{};
    document.getElementById("currentTemp").textContent=f.temp!==undefined?`${f.temp}°C сейчас`:"—";

    // карточки
    document.getElementById("descCard").innerHTML=`<div style="font-size:36px">${emojiFor(f.condition)}</div><div style="opacity:.8">сейчас</div>`;
    document.getElementById("uvCard").innerHTML=`<div style="font-size:22px">${f.uv_index??"—"}</div><div style="opacity:.8">УФ индекс</div>`;
    document.getElementById("windCard").innerHTML=`💨 ${f.wind_speed??"—"} м/с`;
    document.getElementById("humidityCard").innerHTML=`${f.humidity??"—"}% влажность`;
    document.getElementById("pressureCard").innerHTML=`${f.pressure_mm??"—"} мм`;
    document.getElementById("visibilityCard").innerHTML=`ощущается ${f.feels_like??"—"}°`;

    const forecasts=data.forecasts||[];
    const today=forecasts[0]||{};
    document.getElementById("sunCard").innerHTML=`🌅 ${today.sunrise??"—"} / 🌇 ${today.sunset??"—"}`;

    const precNow=f.prec_mm??0;
    const prob=f.prec_prob??(today.parts?.day_short?.prec_prob??"—");
    document.getElementById("rainCard").innerHTML=`${precipEmoji(precNow)} ${precNow} мм<br>${prob}%`;

    const moon=today.moon_code;
    if(moon!==undefined){
      const mIcons=["🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘"];
      document.getElementById("moonCard").innerHTML=mIcons[moon]||"—";
    }

    const hours=today.hours?.slice(0,24)||[];
    document.getElementById("hourly").innerHTML=hours.map(h=>`
      <div class="hour">
        <div>${String(h.hour).padStart(2,'0')}:00</div>
        <div style="font-size:24px">${emojiFor(h.condition)}</div>
        <div><b>${h.temp??'—'}°</b></div>
        <div style="font-size:13px">${precipEmoji(h.prec_mm)} ${h.prec_mm??0} мм • ${h.prec_prob??'—'}%</div>
      </div>
    `).join("")||"<div class='hour'>нет данных</div>";

    renderWeekTable(forecasts.slice(0,10));

    saveCity(city);
    renderSaved();

    fadeEls.forEach((el,i)=>setTimeout(()=>el.classList.remove("hidden"),i*50));

  }catch(e){alert(e.message);console.error(e);}
}

function renderWeekTable(days){
  const tb = document.getElementById("weekBody");
  if(!tb) return;
  if(!days || days.length === 0){
    tb.innerHTML = "<tr><td colspan='6'>Нет данных</td></tr>";
    return;
  }

  tb.innerHTML = days.map(d => {
    const parts = d.parts || {};
    const dayPart = parts.day_short || parts.day || {};
    const date = d.date ?? d.date_iso ?? "—";

    const tmin = (dayPart.temp_min ?? parts.day?.temp_min ?? parts.day_short?.temp_min ?? d.temp_min ?? d.temp?.min ?? "—");
    const tmax = (dayPart.temp_max ?? parts.day?.temp_max ?? parts.day_short?.temp_max ?? d.temp_max ?? d.temp?.max ?? "—");

    const cond = emojiFor(dayPart.condition ?? d.condition ?? '');
    const prec = (dayPart.prec_mm ?? parts.day?.prec_mm ?? 0);
    const precP = (dayPart.prec_prob ?? parts.day?.prec_prob ?? '—');
    const sunrise = d.sunrise ?? d.sunrise_ts ?? '—';
    const sunset  = d.sunset  ?? d.sunset_ts  ?? '—';

    return `<tr onclick="loadDayDetails('${date}')">
      <td>${date}</td>
      <td class="center">${cond}</td>
      <td>${tmin}° / ${tmax}°</td>
      <td>${prec} мм</td>
      <td>${precP !== null ? precP + '%' : '—'}</td>
      <td>${sunrise} / ${sunset}</td>
    </tr>`;
  }).join('');
}


function searchCity(){
  const c=document.getElementById("cityInput").value.trim();
  if(c) loadWeather(c);
}

function saveCity(c){
  let list=JSON.parse(localStorage.getItem("cities")||"[]");
  if(!list.includes(c)) list.push(c);
  localStorage.setItem("cities",JSON.stringify(list));
}

function renderSaved(){
  const list=JSON.parse(localStorage.getItem("cities")||"[]");
  document.getElementById("savedCities").innerHTML=list.map(c=>`<div class='city-item' onclick='loadWeather("${c}")'>${c}</div>`).join("");
}

function loadDayDetails(date){
  alert("Подробный прогноз на "+date);
}

renderSaved();
loadWeather();

(function(){
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.sidebar');
  if(!toggle || !sidebar) return;

  function updateBtn() {
    if(window.innerWidth <= 480) toggle.style.display = 'inline-block';
    else { toggle.style.display = 'none'; sidebar.style.display = ''; }
  }
  updateBtn();
  window.addEventListener('resize', updateBtn);

  toggle.addEventListener('click', () => {
    if(sidebar.style.display === 'block') {
      sidebar.style.display = 'none';
      toggle.textContent = 'Меню';
    } else {
      sidebar.style.display = 'block';
      sidebar.style.position = 'fixed';
      sidebar.style.bottom = '0';
      sidebar.style.left = '0';
      sidebar.style.right = '0';
      sidebar.style.zIndex = '50';
      sidebar.style.borderLeft = 'none';
      sidebar.style.borderTop = '1px solid rgba(255,255,255,0.06)';
      toggle.textContent = 'Закрыть';
    }
  });
})();
