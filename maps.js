ymaps.ready(() => {
  let map, layer;

  ymaps.geolocation.get().then(res => {
    const coords = res.geoObjects.get(0).geometry.getCoordinates();
    const city = res.geoObjects.get(0).properties.get('text').split(', ').pop();
    initMap(coords, city);
  }).catch(() => {
    initMap([55.7558, 37.6173], "Москва");
  });

  function initMap([lat, lon], cityName) {
    document.getElementById('info').innerHTML = `<b>${cityName}</b><div style="font-size:12px;">Готово!</div>`;

    map = new ymaps.Map('map', {
      center: [lat, lon],
      zoom: 9,
      controls: ['zoomControl']
    });

    const LAYERS = {
      radar:  'https://api.weather.yandex.ru/v2/radar?lang=ru',
      temp:   'https://api.weather.yandex.ru/v2/informers?lat={lat}&lon={lon}&lang=ru', 
      wind:   'https://api.weather.yandex.ru/v2/wind?lang=ru',
      press:  'https://api.weather.yandex.ru/v2/pressure?lang=ru'
    };

    function addLayer(type) {
      if (layer) map.layers.remove(layer);

      let url = '';
      if (type === 'radar') {
        url = 'https://api.weather.yandex.ru/v2/radar?lang=ru';
      } else if (type === 'temp') {
        url = 'https://api.weather.yandex.ru/v2/layer/?type=temperature&lang=ru';
      } else if (type === 'wind') {
        url = 'https://api.weather.yandex.ru/v2/layer/?type=wind&lang=ru';
      } else if (type === 'press') {
        url = 'https://api.weather.yandex.ru/v2/layer/?type=pressure&lang=ru';
      }

      layer = new ymaps.Layer(url, {
        tileTransparent: true,
        zIndex: 100
      });
      map.layers.add(layer);
    }

    addLayer('radar'); 

    document.querySelectorAll('.l').forEach(btn => {
      btn.onclick = () => {
        document.querySelector('.l.active').classList.remove('active');
        btn.classList.add('active');
        addLayer(btn.dataset.l);
      };
    });
  }


  const now = new Date().getHours();
  for (let i = 0; i < 24; i++) {
    const el = document.createElement('span');
    el.className = 't' + (i === now ? ' active' : '');
    el.textContent = i + ':00';
    document.getElementById('time').appendChild(el);
  }
});

window.addEventListener('resize', () => {
  const mapEl = document.getElementById('map');
  if (!mapEl || !window.map) return;
  try {
    const w = window.innerWidth;
    if (w < 480) window.map.setZoom(Math.max(7, Math.min(10, window.map.getZoom())));
  } catch(e){}
});
