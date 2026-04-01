let ALL_BUILDINGS = [], CITY_DATA = null;
let renderer, scene, camera;
let keys = {}, yaw = 0, pitch = 0, pointerLocked = false;

const LANG_COLORS = {
  "JavaScript":"#f0db4f","TypeScript":"#3178c6","Python":"#3572A5",
  "Go":"#00ADD8","Rust":"#dea584","Ruby":"#701516","Java":"#b07219",
  "C++":"#f34b7d","C":"#555555","C#":"#178600","PHP":"#4F5D95",
  "Swift":"#F05138","Kotlin":"#A97BFF","HTML":"#e34c26","CSS":"#563d7c",
  "Shell":"#89e051","Unknown":"#444c56",
};



window.addEventListener('DOMContentLoaded', async () => {
  animateLoadingBars();
  try {
    if (USERNAME) await loadGithubCity(USERNAME);
    else if (SEED !== null) await loadSeedCity(SEED);
  } catch (err) { showError(err.message || 'Erro inesperado.'); }
});

function animateLoadingBars() {
  const anim = document.getElementById('loading-anim');
  const colors = Object.values(LANG_COLORS).slice(0, 9);
  for (let i = 0; i < 9; i++) {
    const bar = document.createElement('div');
    bar.className = 'loading-bar';
    bar.style.cssText = `height:${16 + Math.random()*32}px;background:${colors[i]};animation-delay:${i*0.13}s`;
    anim.appendChild(bar);
  }
}

async function loadGithubCity(username) {
  setLoadingText('Buscando repositórios...', `@${username}`);
  const res = await fetch(`/api/city/${username}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  ALL_BUILDINGS = json.data.buildings;
  initScene(json.data);
}

async function loadSeedCity(seed) {
  setLoadingText('Gerando cidade aleatória...', `seed #${seed}`);
  const res = await fetch(`/api/seed?s=${seed}&n=24`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  ALL_BUILDINGS = json.data.buildings;
  initScene(json.data);
}

function initScene(data) {
  const container = document.getElementById('city-viewport');

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050a12);
  scene.fog = new THREE.FogExp2(0x050a12, 0.016);

  camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 600);
  camera.position.set(0, 14, 55);


  scene.add(new THREE.AmbientLight(0x1a2a4a, 2.2));
  const moon = new THREE.DirectionalLight(0x6699cc, 1.4);
  moon.position.set(-30, 80, 40);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = moon.shadow.camera.bottom = -150;
  moon.shadow.camera.right = moon.shadow.camera.top = 150;
  moon.shadow.camera.far = 300;
  scene.add(moon);


  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(1800 * 3);
  for (let i = 0; i < 1800; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 450;
    starPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    starPos[i*3+1] = Math.abs(r * Math.cos(phi));
    starPos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 })));


  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshLambertMaterial({ color: 0x080c12 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  scene.add(new THREE.GridHelper(500, 80, 0x111e2e, 0x0d1520));


  buildCity(data.buildings);


  showCityUI(data);
  setupControls(container);
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  (function loop() {
    requestAnimationFrame(loop);
    handleMovement();

    const t = performance.now() * 0.001;
    scene.traverse(o => {
      if (o.userData.blink !== undefined)
        o.visible = Math.sin(t * 2.5 + o.userData.blink) > 0;
    });
    renderer.render(scene, camera);
  })();
}



function buildCity(buildings) {
  const sorted = [...buildings].sort((a, b) => b.height - a.height);
  const positions = spiralLayout(sorted.length);
  sorted.forEach((b, i) => placeBuilding(b, positions[i][0], positions[i][1]));
}

function spiralLayout(n) {
  const pos = [], SPACING = 10;
  let placed = 0;
  for (let ring = 0; placed < n; ring++) {
    if (ring === 0) { pos.push([0, 0]); placed++; continue; }
    const count = ring * 8;
    for (let i = 0; i < count && placed < n; i++) {
      const angle = (i / count) * Math.PI * 2;
      const jitter = () => (Math.random() - 0.5) * 3;
      pos.push([Math.cos(angle) * ring * SPACING + jitter(), Math.sin(angle) * ring * SPACING + jitter()]);
      placed++;
    }
  }
  return pos;
}

function placeBuilding(b, bx, bz) {
  const h  = b.height * 0.06;
  const wx = b.width  * 0.06;
  const wz = wx * (0.6 + Math.random() * 0.8);
  const color = new THREE.Color(b.color);


  const body = new THREE.Mesh(
    new THREE.BoxGeometry(wx, h, wz),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.set(bx, h / 2, bz);
  body.castShadow = body.receiveShadow = true;
  scene.add(body);


  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(wx + 0.15, 0.12, wz + 0.15),
    new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.55) })
  );
  roof.position.set(bx, h + 0.06, bz);
  scene.add(roof);


  addWindowFace(bx, h, bz + wz/2 + 0.01, wx, h, 0, b.windows);
  addWindowFace(bx, h, bz - wz/2 - 0.01, wx, h, Math.PI, b.windows);
  addWindowFace(bx + wx/2 + 0.01, h, bz, wz, h, Math.PI/2, b.windows);
  addWindowFace(bx - wx/2 - 0.01, h, bz, wz, h, -Math.PI/2, b.windows);


  if (b.antenna) {
    const ah = b.antenna_height * 0.09;
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, ah, 5),
      new THREE.MeshLambertMaterial({ color: 0x556677 })
    );
    ant.position.set(bx, h + ah / 2, bz);
    scene.add(ant);

    const blink = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 5, 5),
      new THREE.MeshBasicMaterial({ color: 0xff2211 })
    );
    blink.position.set(bx, h + ah + 0.1, bz);
    blink.userData.blink = Math.random() * Math.PI * 2;
    scene.add(blink);
  }


  addLabel(b.name, bx, h + 1.0, bz);
}

function addWindowFace(x, h, z, faceW, faceH, ry, wins) {
  if (!wins || !wins.cols) return;
  const cols = Math.max(1, wins.cols);
  const rows = Math.max(1, wins.rows);
  const wW = (faceW * 0.65) / cols;
  const wH = (faceH * 0.80) / rows;

  wins.lit.slice(0, cols * rows).forEach((lit, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(wW - 0.02, wH - 0.03),
      new THREE.MeshBasicMaterial({
        color: lit ? 0xffe884 : 0x0d1520,
        opacity: lit ? 0.88 : 0.5,
        transparent: true,
      })
    );
    mesh.rotation.y = ry;
    const ox = (col - (cols - 1) / 2) * wW;
    const oy = (row - (rows - 1) / 2) * wH + faceH * 0.05;

    if (Math.abs(ry) < 0.1 || Math.abs(ry - Math.PI) < 0.1) {
      mesh.position.set(x + ox, oy + h / 2, z);
    } else {
      mesh.position.set(x, oy + h / 2, z + ox);
    }
    scene.add(mesh);
  });
}

function addLabel(text, x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 26px monospace';
  ctx.fillStyle = '#7a9abb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 30), 256, 32);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, opacity: 0.8, depthWrite: false })
  );
  sprite.scale.set(4.5, 0.6, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);
}



function setupControls(container) {
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup',   e => { keys[e.code] = false; });

  container.addEventListener('click', () => container.requestPointerLock());

  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === container;
    const hint = document.getElementById('control-hint');
    if (hint) hint.style.display = pointerLocked ? 'none' : 'flex';
  });

  document.addEventListener('mousemove', e => {
    if (!pointerLocked) return;
    yaw   -= e.movementX * 0.0018;
    pitch -= e.movementY * 0.0018;
    pitch  = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, pitch));
  });
}

function handleMovement() {
  const speed = 0.20 * ((keys.ShiftLeft || keys.ShiftRight) ? 3.5 : 1);
  const dir   = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const up    = new THREE.Vector3(0, 1, 0);

  if (keys.KeyW || keys.ArrowUp)    camera.position.addScaledVector(dir,   speed);
  if (keys.KeyS || keys.ArrowDown)  camera.position.addScaledVector(dir,  -speed);
  if (keys.KeyA || keys.ArrowLeft)  camera.position.addScaledVector(right,-speed);
  if (keys.KeyD || keys.ArrowRight) camera.position.addScaledVector(right, speed);
  if (keys.KeyE || keys.Space)      camera.position.addScaledVector(up,    speed);
  if (keys.KeyQ)                    camera.position.addScaledVector(up,   -speed);

  camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
}



function showCityUI(data) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('city-viewport').style.display = 'block';
  document.getElementById('header-sub').textContent =
    `${data.buildings.length} repos · ${data.total_commits.toLocaleString('pt-BR')} commits`;
  const legend = document.getElementById('lang-legend');
  (data.languages || []).slice(0, 4).forEach(lang => {
    const d = document.createElement('div');
    d.className = 'lang-dot';
    d.innerHTML = `<div class="lang-dot-circle" style="background:${lang.color}"></div>${lang.name}`;
    legend.appendChild(d);
  });
}

function setLoadingText(t, s = '') {
  document.getElementById('loading-text').textContent = t;
  document.getElementById('loading-sub').textContent = s;
}

function showError(msg) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error-screen').style.display = 'flex';
  document.getElementById('error-text').textContent = msg;
}

function newSeed() {
  window.location.href = `/seed?s=${Math.floor(Math.random() * 999999)}`;
}
