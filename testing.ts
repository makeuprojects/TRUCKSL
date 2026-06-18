import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:3000/api/viajes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer mock-local-session-placeholder'
    },
    body: JSON.stringify({
      id_camion: 'CAM-01',
      id_chofer: 'CH-03',
      id_ruta: 'RUT-01'
    })
  });
  const data = await res.json();
  console.log(data);
}
test();
