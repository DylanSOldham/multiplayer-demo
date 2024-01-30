//---------------------------------------------------------------------------------------
// Global Constants
//---------------------------------------------------------------------------------------

const AVATAR_SIZE = 5;
const AVATAR_MAX_HEALTH = 100;
const AVATAR_SPEED = 2;
const AVATAR_DODGE_SPEED = 5;
const WORLD_SIZE = 150;
const ATTACK_DURATION = 0.1; // Seconds
const DODGE_DURATION = 0.3; // Seconds
const ATTACK_COOLDOWN = 0.5; // Seconds
const DODGE_COOLDOWN = 0.5; // Seconds





//---------------------------------------------------------------------------------------
// Input States
//---------------------------------------------------------------------------------------

const kbd = {}; // Keyboard
const mse = {}; // Mouse

const refreshKeys = () => {
  mse["just_left"] = false;
  mse["just_right"] = false;
}





//---------------------------------------------------------------------------------------
// Canvas
//---------------------------------------------------------------------------------------

const canvas = document.querySelector("canvas");
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const ctx = canvas.getContext("2d");

canvas.addEventListener("keydown", event => {
  kbd[event.code] = true;
});

canvas.addEventListener("keyup", event => {
  kbd[event.code] = false;
});

canvas.addEventListener("mousemove", event => {
  // Conversion from client coordinates to canvas coordinates 
  // adapted from the top answer here https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const pos = screen2world(x, y);
  mse.x = pos.x;
  mse.y = pos.y;
});

canvas.addEventListener("mousedown", event => {
  switch (event.button)
  {
    case 0:
      mse["left"] = true;
      mse["just_left"] = true;
      break;
    case 2:
      mse["right"] = true;
      mse["just_right"] = true;
      break;
    default:
      break;
  }
});

canvas.addEventListener("mouseup", event => {
  switch (event.button)
  {
    case 0:
      mse["left"] = true;
      break;
    case 2:
      mse["right"] = true;
      break;
    default:
      break;
  }
});

canvas.addEventListener("contextmenu", e => {
  e.stopPropagation(); 
  e.preventDefault();
});





//---------------------------------------------------------------------------------------
// Camera
//---------------------------------------------------------------------------------------
const camera = {
  x: 0,
  y: 0,
  size: 100,
};

const world2screen = (x, y, w, h) => {
  return {
    x: (x - camera.x + camera.size / 2) * canvas.height * (4/3) / camera.size,
    y: (y - camera.y + camera.size / 2) * canvas.height / camera.size,
    w: w * canvas.height * (4/3) / camera.size,
    h: h * canvas.height / camera.size,
  };
};

const screen2world = (x, y, w, h) => {
  return {
    x: x / (canvas.height * (4/3) / camera.size) + camera.x - camera.size / 2,
    y: y / (canvas.height / camera.size) + camera.y - camera.size / 2 ,
    w: w / (canvas.height * camera.size),
    h: h / (canvas.height * camera.size),
  };
};

const updateCamera = avatar => {
  camera.x = avatar.x;
  camera.y = avatar.y;
};





//---------------------------------------------------------------------------------------
// Primitives
//---------------------------------------------------------------------------------------

const drawRect = (x, y, w, h, style) => {
  const body = world2screen(x, y, w, h);
  ctx.fillStyle = style;
  ctx.fillRect(body.x, body.y, body.w, body.h);
}

const drawArc = (x, y, r1, r2, startangle, endangle, style) => {
  const body = world2screen(x, y, r1, r2);
  r1 = body.w;
  r2 = body.h;
  ctx.beginPath();
  ctx.fillStyle = style;
  ctx.arc(body.x, body.y, r2, startangle, endangle);
  ctx.arc(body.x, body.y, r1, endangle, startangle, true);
  ctx.fill();
}

const drawCircle = (x, y, r, style) => {
  return drawArc(x, y, 0, r, 0, 2 * Math.PI, style);
}



//---------------------------------------------------------------------------------------
// Avatar
//---------------------------------------------------------------------------------------

const avatar = {
  health: 90.0,
  x: 0,
  y: 0,
  angle: 0.0,
  attack_timer: 100.0,
  dodge_timer: 100.0,
  style: "rgba(255, 195, 195, 1.0)",
};

const isDodging = avatar => avatar.dodge_timer < DODGE_DURATION;
const isAttacking = avatar => avatar.attack_timer < ATTACK_DURATION;
const canDodge = avatar => avatar.dodge_timer > DODGE_DURATION + DODGE_COOLDOWN;
const canAttack = avatar => avatar.attack_timer > ATTACK_DURATION + ATTACK_COOLDOWN;

const clampAvatarToWorld = avatar => {
  avatar.x = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, avatar.x));
  avatar.y = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, avatar.y));
}

const updateAvatar = avatar => { // WIll be replaced by multiplayer state updates

  if (kbd["ArrowUp"] || kbd["KeyW"]) avatar.y -= AVATAR_SPEED;
  if (kbd["ArrowDown"] || kbd["KeyS"]) avatar.y += AVATAR_SPEED;
  if (kbd["ArrowRight"] || kbd["KeyD"]) avatar.x += AVATAR_SPEED;
  if (kbd["ArrowLeft"] || kbd["KeyA"]) avatar.x -= AVATAR_SPEED;

  if (canAttack(avatar) && mse["just_left"]) {
    avatar.attack_timer = 0.0;
    avatar.angle = Math.atan2(mse.y - avatar.y, mse.x - avatar.x);
  }

  if (canDodge(avatar) && mse["just_right"]) {
    avatar.dodge_timer = 0.0;
    avatar.angle = Math.atan2(mse.y - avatar.y, mse.x - avatar.x);
  }

  if (!canAttack(avatar)) avatar.attack_timer += 0.016;
  if (!canDodge(avatar)) avatar.dodge_timer += 0.016;

  if (isDodging(avatar))
  {
    avatar.x += AVATAR_DODGE_SPEED * Math.cos(avatar.angle);
    avatar.y += AVATAR_DODGE_SPEED * Math.sin(avatar.angle);
  }

  clampAvatarToWorld(avatar);
}

const drawAttack = avatar => {
  drawArc(avatar.x, avatar.y, AVATAR_SIZE + 1, AVATAR_SIZE + 10, avatar.angle - Math.PI / 3, avatar.angle + Math.PI / 3, "#FF0000");
}

const drawHealthbar = avatar => {
  ctx.fillStyle = "#000000";
  ctx.fillRect(5, 5, canvas.width - 10, canvas.width/50);
  ctx.fillStyle = "#00FF00";
  ctx.fillRect(5, 5, (avatar.health / AVATAR_MAX_HEALTH) * (canvas.width - 10), canvas.width/50);
}

const drawAvatar = avatar => {
  let color = avatar.style;
  if (isDodging(avatar))
  {
    color = "rgba(255, 195, 195, 0.6)";
  }

  drawCircle(avatar.x, avatar.y, AVATAR_SIZE, color);

  if (isAttacking(avatar))
  {
    drawAttack(avatar);
  }
}




//---------------------------------------------------------------------------------------
// Frame
//---------------------------------------------------------------------------------------

const clearFrame = () => {
  ctx.fillStyle = "#021446";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

const drawGrass = () => {
  drawRect(-WORLD_SIZE/2, -WORLD_SIZE/2, WORLD_SIZE, WORLD_SIZE, "#12C956");
  for (let i = 0; i < 10; ++i) {
    for (let j = 0; j < 10; ++j) {
      drawRect(
        -WORLD_SIZE/2.02 + i * WORLD_SIZE/10, 
        -WORLD_SIZE/2.02 + j * WORLD_SIZE/10, 
        WORLD_SIZE/11, WORLD_SIZE/11, 
        "#023906"
      );
    }
  }
}

const sparkles = [];
for (let i = 0; i < 200; ++i) sparkles.push({x: 50, y: 50});

const drawSparkles = () => {
  for (let i = 0; i < sparkles.length; ++i)
  {
    if (Math.random() < 0.1) {
      sparkles[i].x = avatar.x + Math.random() * WORLD_SIZE * 2 - WORLD_SIZE / 2;
      sparkles[i].y = avatar.y + Math.random() * WORLD_SIZE * 2 - WORLD_SIZE / 2;
    }
    drawCircle(sparkles[i].x, sparkles[i].y, Math.random(), `rgba(${255 * Math.random()}, 255, ${255 * Math.random()}, 1.0)`);
  }
}

const updateFrame = () => {
  updateAvatar(avatar);
  updateCamera(avatar);
};

const drawFrame = () => {
  clearFrame();
  drawSparkles();
  drawGrass();
  drawAvatar(avatar);
  drawHealthbar(avatar);
};





//---------------------------------------------------------------------------------------
// Game Loop
//---------------------------------------------------------------------------------------

const step = () => {
  drawFrame();
  updateFrame();
  refreshKeys();
  requestAnimationFrame(step);
}

// Game Loop Entry Point
step();