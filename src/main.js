import * as THREE from "three"

// ======================
// SCENE
// ======================
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x101018)
scene.fog = new THREE.Fog(0x101018, 20, 120)

// ======================
// CAMERA
// ======================
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 2, 5)

// ======================
// RENDERER
// ======================
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true

document.body.style.margin = "0"
document.body.style.overflow = "hidden"
document.body.appendChild(renderer.domElement)

// ======================
// UI
// ======================
const ui = document.createElement("div")
ui.style.position = "fixed"
ui.style.top = "10px"
ui.style.left = "10px"
ui.style.color = "white"
ui.style.fontFamily = "monospace"
ui.style.fontSize = "20px"
ui.style.zIndex = "100"
ui.style.textShadow = "1px 1px 3px #000"
document.body.appendChild(ui)

const crosshair = document.createElement("div")
crosshair.innerHTML = "+"
crosshair.style.position = "fixed"
crosshair.style.top = "50%"
crosshair.style.left = "50%"
crosshair.style.transform = "translate(-50%, -50%)"
crosshair.style.color = "white"
crosshair.style.fontSize = "32px"
crosshair.style.pointerEvents = "none"
document.body.appendChild(crosshair)

// ======================
// LIGHT
// ======================
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(10, 20, 10)
light.castShadow = true
scene.add(light)
scene.add(new THREE.AmbientLight(0xffffff, 0.35))

// ======================
// FLOOR
// ======================
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x333333 })
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

// ======================
// WALLS
// ======================
function createWall(x, z, w, h, d) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  )
  wall.position.set(x, h / 2, z)
  wall.castShadow = true
  wall.receiveShadow = true
  scene.add(wall)
}

createWall(0, -30, 60, 5, 2)
createWall(0, 30, 60, 5, 2)
createWall(-30, 0, 2, 5, 60)
createWall(30, 0, 2, 5, 60)

// ======================
// BOXES
// ======================
for (let i = 0; i < 20; i++) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(3, 3, 3),
    new THREE.MeshStandardMaterial({ color: 0x666666 })
  )
  box.position.set(
    (Math.random() - 0.5) * 50,
    1.5,
    (Math.random() - 0.5) * 50
  )
  box.castShadow = true
  box.receiveShadow = true
  scene.add(box)
}

// ======================
// GUN
// ======================
const gun = new THREE.Mesh(
  new THREE.BoxGeometry(0.3, 0.2, 1),
  new THREE.MeshStandardMaterial({ color: 0x111111 })
)
gun.position.set(0.45, -0.35, -1)
camera.add(gun)
scene.add(camera)

// ======================
// PLAYER
// ======================
const player = {
  health: 100,
  ammo: 30,
  reserveAmmo: 90,
  reloading: false,
  canShoot: true,
  score: 0,
  alive: false
}

// ======================
// MULTIPLAYER
// ======================
let myId = null
let gameReady = false

// Меш противника (синий)
const opponentMesh = new THREE.Group()

const opponentBody = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 1),
  new THREE.MeshStandardMaterial({ color: 0x0055ff })
)
opponentBody.position.y = 1

const opponentHead = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 0.8, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x0077ff })
)
opponentHead.position.y = 2.4

opponentMesh.add(opponentBody)
opponentMesh.add(opponentHead)
opponentMesh.position.set(999, 999, 999)
scene.add(opponentMesh)

const opponentTarget = new THREE.Vector3(999, 999, 999)
let opponentYaw = 0

// WebSocket
const socket = new WebSocket("wss://funny-shooter-server.onrender.com")

socket.onopen = () => {
  ui.innerHTML = "Connected! Waiting for opponent..."
}

socket.onmessage = (e) => {
  const data = JSON.parse(e.data)

  if (data.type === "init") {
    myId = data.playerId
    ui.innerHTML = `You are: ${myId}<br>Waiting for opponent...`
  }

  if (data.type === "start") {
    gameReady = true
    if (myId === "p1") {
      camera.position.set(0, 2, 20)
    } else {
      camera.position.set(0, 2, -20)
    }
    respawn()
  }

  if (data.type === "move") {
    opponentTarget.set(data.x, data.y, data.z)
    opponentYaw = data.yaw
  }

  if (data.type === "hit") {
    player.health -= 50
    flashDamage()
  }

  if (data.type === "opponent_left") {
    ui.innerHTML = "Opponent disconnected!"
    gameReady = false
    opponentMesh.position.set(999, 999, 999)
  }
}

socket.onerror = () => {
  ui.innerHTML = "❌ Server not found!<br>Open terminal and run: node server.js"
}

function flashDamage() {
  const flash = document.createElement("div")
  flash.style.position = "fixed"
  flash.style.inset = "0"
  flash.style.background = "rgba(255,0,0,0.35)"
  flash.style.pointerEvents = "none"
  flash.style.zIndex = "50"
  flash.style.transition = "opacity 0.4s"
  document.body.appendChild(flash)
  setTimeout(() => {
    flash.style.opacity = "0"
    setTimeout(() => flash.remove(), 400)
  }, 50)
}

function sendPosition() {
  if (socket.readyState !== 1 || !gameReady) return
  socket.send(JSON.stringify({
    type: "move",
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
    yaw
  }))
}

// ======================
// CONTROLS
// ======================
const keys = {}
let yaw = 0
let pitch = 0

document.addEventListener("click", () => {
  renderer.domElement.requestPointerLock()
})

document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === renderer.domElement) {
    yaw   -= e.movementX * 0.002
    pitch -= e.movementY * 0.002
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch))
  }
})

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true
  if (e.key === " " && onGround && player.alive) {
    velocityY = jumpForce
    onGround = false
  }
  if (e.key.toLowerCase() === "r") reload()
})

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false
})

// ======================
// PHYSICS
// ======================
let velocityY = 0
const gravity   = -0.012
const jumpForce =  0.22
let onGround = false

// ======================
// BULLETS
// ======================
const bullets = []

function createBulletTracer() {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.03),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  )
  bullet.position.copy(camera.position)
  const dir = new THREE.Vector3()
  camera.getWorldDirection(dir)
  bullet.userData.velocity = dir.multiplyScalar(2)
  scene.add(bullet)
  bullets.push(bullet)
}

// ======================
// SHOOTING
// ======================
const raycaster = new THREE.Raycaster()

function shoot() {
  if (!player.alive)    return
  if (!gameReady)       return
  if (player.reloading) return
  if (!player.canShoot) return
  if (player.ammo <= 0) { reload(); return }

  player.canShoot = false
  player.ammo--

  createBulletTracer()

  gun.position.z = -0.7
  setTimeout(() => { gun.position.z = -1 }, 50)

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
  const hits = raycaster.intersectObjects(opponentMesh.children, true)

  if (hits.length > 0) {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify({ type: "hit" }))
    }
    player.score++
  }

  setTimeout(() => { player.canShoot = true }, 120)
}

function reload() {
  if (player.reloading)        return
  if (player.reserveAmmo <= 0) return
  if (player.ammo === 30)      return

  player.reloading = true
  setTimeout(() => {
    const needed = 30 - player.ammo
    const taken  = Math.min(needed, player.reserveAmmo)
    player.ammo        += taken
    player.reserveAmmo -= taken
    player.reloading    = false
  }, 1500)
}

document.addEventListener("mousedown", shoot)

// ======================
// RESPAWN
// ======================
function respawn() {
  yaw   = 0
  pitch = 0
  player.health      = 100
  player.ammo        = 30
  player.reserveAmmo = 90
  player.alive       = true
}

// ======================
// RESIZE
// ======================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ======================
// GAME LOOP
// ======================
const _forward = new THREE.Vector3()
const _right   = new THREE.Vector3()
const _up      = new THREE.Vector3(0, 1, 0)

let positionTimer = 0

function animate() {
  requestAnimationFrame(animate)

  camera.rotation.order = "YXZ"
  camera.rotation.y = yaw
  camera.rotation.x = pitch

  if (player.alive && gameReady) {
    const speed = 0.1
    camera.getWorldDirection(_forward)
    _right.crossVectors(_forward, _up).normalize()

    if (keys["w"]) camera.position.addScaledVector(_forward,  speed)
    if (keys["s"]) camera.position.addScaledVector(_forward, -speed)
    if (keys["a"]) camera.position.addScaledVector(_right,   -speed)
    if (keys["d"]) camera.position.addScaledVector(_right,    speed)
  }

  velocityY += gravity
  camera.position.y += velocityY

  if (camera.position.y < 2) {
    camera.position.y = 2
    velocityY = 0
    onGround  = true
  }

  positionTimer++
  if (positionTimer >= 3) {
    sendPosition()
    positionTimer = 0
  }

  opponentMesh.position.lerp(opponentTarget, 0.2)
  opponentMesh.rotation.y = opponentYaw

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i]
    bullet.position.add(bullet.userData.velocity)
    if (bullet.position.distanceTo(camera.position) > 100) {
      scene.remove(bullet)
      bullets.splice(i, 1)
    }
  }

  if (player.health <= 0 && player.alive) {
    player.alive  = false
    player.health = 0
    ui.innerHTML  = "YOU DIED<br>Respawning in 3..."
    setTimeout(respawn, 3000)
  }

  if (gameReady && player.alive) {
    ui.innerHTML = `
      HP: ${Math.floor(player.health)}<br>
      AMMO: ${player.ammo} / ${player.reserveAmmo}<br>
      SCORE: ${player.score}<br>
      ${player.reloading ? "RELOADING..." : ""}
    `
  }

  renderer.render(scene, camera)
}

// ======================
// START
// ======================
ui.innerHTML = "Connecting to server..."
animate()