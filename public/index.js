//---------------------------------------------------------------------------------------
// Global Constants
//---------------------------------------------------------------------------------------

const SERVER_URL = "ws://localhost:8081";

const AVATAR_SIZE = 5;
const AVATAR_MAX_HEALTH = 100;
const AVATAR_SPEED = 2;
const AVATAR_DODGE_SPEED = 0;
const WORLD_SIZE = 150;
const ATTACK_DURATION = 0.1; // Seconds
const ATTACK_COOLDOWN = 0.2; // Seconds
const ATTACK_MIN_RADIUS = 1.0;
const ATTACK_MAX_RADIUS = 10.0;
const ATTACK_ANGLE_WIDTH = 2 * Math.PI / 3;
const DODGE_DURATION = 1.0; // Seconds
const DODGE_COOLDOWN = 0.2; // Seconds


//---------------------------------------------------------------------------------------
// Input States
//---------------------------------------------------------------------------------------

const kbd = {}; // Keyboard
const mse = {}; // Mouse

const refreshKeys = () => {
    mse["just_left"] = false;
    mse["just_right"] = false;
}

const updateMousePos = event => {
    // Conversion from client coordinates to canvas coordinates 
    // adapted from the top answer here https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const pos = screen2world(x, y);
    mse.x = pos.x;
    mse.y = pos.y;
}



//---------------------------------------------------------------------------------------
// Canvas
//---------------------------------------------------------------------------------------

const canvas = document.querySelector("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext("2d");

window.addEventListener("resize", event => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
})

canvas.addEventListener("keydown", event => {
    kbd[event.code] = true;
});

canvas.addEventListener("keyup", event => {
    kbd[event.code] = false;
});

canvas.addEventListener("mousemove", event => {
    updateMousePos(event);
});

canvas.addEventListener("mousedown", event => {
    updateMousePos(event);

    switch (event.button) {
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
    switch (event.button) {
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
        x: (x - camera.x + camera.size / 2) * canvas.width / camera.size,
        y: (y - camera.y + camera.size / 2) * canvas.height / camera.size,
        w: w * canvas.width / camera.size,
        h: h * canvas.height / camera.size,
    };
};

const screen2world = (x, y, w, h) => {
    return {
        x: x / (canvas.width / camera.size) + camera.x - camera.size / 2,
        y: y / (canvas.height / camera.size) + camera.y - camera.size / 2,
        w: w / (canvas.width * camera.size),
        h: h / (canvas.height * camera.size),
    };
};

const updateCamera = () => {
    const avatar = avatars[playerAvatarId];
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

let avatars = null;
let playerAvatarId = null;

const isDodging = avatar => avatar.dodge_timer < DODGE_DURATION;
const isAttacking = avatar => avatar.attack_timer < ATTACK_DURATION;
const canDodge = avatar => avatar.dodge_timer > DODGE_DURATION + DODGE_COOLDOWN;
const canAttack = avatar => avatar.attack_timer > ATTACK_DURATION + ATTACK_COOLDOWN;

let doDodge = false;
const updatePlayerAvatar = () => {
    const avatar = avatars[playerAvatarId];

    let dx = 0;
    let dy = 0;

    if (kbd["ArrowUp"] || kbd["KeyW"]) dy -= AVATAR_SPEED;
    if (kbd["ArrowDown"] || kbd["KeyS"]) dy += AVATAR_SPEED;
    if (kbd["ArrowRight"] || kbd["KeyD"]) dx += AVATAR_SPEED;
    if (kbd["ArrowLeft"] || kbd["KeyA"]) dx -= AVATAR_SPEED;
    if (kbd["Space"]) doDodge = true;

    if (canAttack(avatar) && mse["just_left"]) {
        avatar.angle = Math.atan2(mse.y - avatar.y, mse.x - avatar.x);
        sendAttack(avatar.angle);
    }

    if (canDodge(avatar) && mse["just_right"]) {
        avatar.angle = Math.atan2(mse.y - avatar.y, mse.x - avatar.x);
        sendDodge(avatar.angle);
    }

    if (canDodge(avatar) && doDodge)
    {
        avatar.angle = avatar.angle ? 0 : Math.PI;
        sendDodge(avatar.angle);
    }

    if (isDodging(avatar)) {
        dx += AVATAR_DODGE_SPEED * Math.cos(avatar.angle);
        dy += AVATAR_DODGE_SPEED * Math.sin(avatar.angle);
    }

    if (dx != 0 || dy != 0) sendMove(dx, dy);
}

const drawAttack = avatar => {
    drawArc(avatar.x, avatar.y, 
        AVATAR_SIZE + ATTACK_MIN_RADIUS, AVATAR_SIZE + ATTACK_MAX_RADIUS, 
        avatar.angle - ATTACK_ANGLE_WIDTH / 2, avatar.angle + ATTACK_ANGLE_WIDTH / 2, "#FF0000");
}

const drawHealthbar = () => {
    let avatar = avatars[playerAvatarId];

    ctx.fillStyle = "#000000";
    ctx.fillRect(5, 5, canvas.width - 10, canvas.width / 50);
    ctx.fillStyle = "#00FF00";
    ctx.fillRect(5, 5, (avatar.health / AVATAR_MAX_HEALTH) * (canvas.width - 10), canvas.width / 50);
}

const drawAvatar = avatar => {
    let alpha = isDodging(avatar) ? 0.6 : 1.0;
    let color = `rgba(${avatar.color.r}, ${avatar.color.g}, ${avatar.color.b}, ${alpha})`;

    drawCircle(avatar.x, avatar.y, AVATAR_SIZE, color);

    if (isAttacking(avatar)) // TODO - Move to separate draw layer
    {
        drawAttack(avatar);
    }
}

const drawAvatars = () => {
    for (let avatarId in avatars) {
        drawAvatar(avatars[avatarId]);
    }
}


//---------------------------------------------------------------------------------------
// Frame
//---------------------------------------------------------------------------------------

const clearFrame = () => {
    ctx.fillStyle = "#021446";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

let gridAnim = 0.0;

const drawGrid = () => {
    drawRect(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, "#12C956");

    gridAnim += 0.03;
    if (gridAnim > 2 * Math.PI) gridAnim = 0;

    let spacing = 0.2 * Math.sin(gridAnim) + 0.8;
    const gridSize = 10;

    let fullX = -WORLD_SIZE / 2;
    let fullY = -WORLD_SIZE / 2;
    let fullW = (WORLD_SIZE - spacing);
    let fullH = (WORLD_SIZE - spacing);

    for (let i = 0; i < gridSize; ++i) {
        for (let j = 0; j < gridSize; ++j) {
            drawRect(
                fullX + i * fullW / gridSize + spacing,
                fullY + j * fullH / gridSize + spacing,
                fullW / gridSize - spacing, fullH / gridSize - spacing,
                `#023906`
            );
        }
    }
}

const sparkles = [];
for (let i = 0; i < 200; ++i) sparkles.push({ x: 50, y: 50 });

const drawSparkles = () => {
    const avatar = avatars[playerAvatarId];

    for (let i = 0; i < sparkles.length; ++i) {
        if (Math.random() < 0.1) {
            sparkles[i].x = avatar.x + Math.random() * WORLD_SIZE * 2 - WORLD_SIZE / 2;
            sparkles[i].y = avatar.y + Math.random() * WORLD_SIZE * 2 - WORLD_SIZE / 2;
        }
        drawCircle(sparkles[i].x, sparkles[i].y, Math.random(), `rgba(${255 * Math.random()}, 255, ${255 * Math.random()}, 1.0)`);
    }
}

const updateFrame = () => {
    updatePlayerAvatar();
    updateCamera();
};

const drawFrame = () => {
    clearFrame();
    drawSparkles();
    drawGrid();
    drawAvatars();
    drawHealthbar();
};





//---------------------------------------------------------------------------------------
// Game Loop
//---------------------------------------------------------------------------------------

const step = () => {
    drawFrame();
    updateFrame();
    refreshKeys();

    console.log(canvas.height);

    requestAnimationFrame(step);
}





//---------------------------------------------------------------------------------------
// Server Communication
//---------------------------------------------------------------------------------------

websocket = new WebSocket(SERVER_URL);
websocket.addEventListener("open", event => {
    console.log(`Successfully connected to ${websocket.url}`);
});

const sendMove = (offX, offY) => {
    websocket.send(JSON.stringify({ type: "avatarMove", id: playerAvatarId, offset: { x: offX, y: offY } }));
};

const sendAttack = angle => {
    websocket.send(JSON.stringify({ type: "avatarAttack", id: playerAvatarId, angle: angle }));
}

const sendDodge = angle => {
    websocket.send(JSON.stringify({ type: "avatarDodge", id: playerAvatarId, angle: angle }));
}

websocket.addEventListener("message", event => {
    let data = JSON.parse(event.data);
    console.log(`Received: ${JSON.stringify(data)}`);

    switch (data.type) {
        case "myConnect":
            playerAvatarId = data.id;
            avatars = data.avatars;

            // Game Loop Entry Point
            step();
            break;
        case "ping":
            websocket.send(`{"id": "${playerAvatarId}", "type": "pong"}`);
            break;
        case "updateAvatars":
            avatars = data.avatars;
            break;
    }
});