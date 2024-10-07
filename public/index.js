import * as shared from "./shared/shared.js"

//---------------------------------------------------------------------------------------
// Global Constants
//---------------------------------------------------------------------------------------

console.log(window.location.hostname)
const SERVER_URL = `ws://${window.location.hostname}:8081`;


//---------------------------------------------------------------------------------------
// Input States
//---------------------------------------------------------------------------------------

const kbd = {}; // Keyboard
let just_kbd = {};
const mse = {}; // Mouse

const refreshKeys = () => {
    mse["just_left"] = false;
    mse["just_right"] = false;
    just_kbd = {};
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
    just_kbd[event.code] = true;
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
};

const drawText = (text, x, y, size, style, align="center") => {
    ctx.fillStyle = style;
    ctx.textAlign = align;
    ctx.font = `${size}px Sans-Serif`;
    ctx.fillText(text, x, y);
};

const drawArc = (x, y, r1, r2, startangle, endangle, style) => {
    const body = world2screen(x, y, r1, r2);
    r1 = body.w;
    r2 = body.h;
    ctx.beginPath();
    ctx.fillStyle = style;
    ctx.arc(body.x, body.y, r2, startangle, endangle);
    ctx.arc(body.x, body.y, r1, endangle, startangle, true);
    ctx.fill();
};

const drawCircle = (x, y, r, style) => {
    return drawArc(x, y, 0, r, 0, 2 * Math.PI, style);
};



//---------------------------------------------------------------------------------------
// Avatar
//---------------------------------------------------------------------------------------

let avatars = null;
let playerAvatarId = null;

const isDodging = avatar => avatar.dodge_timer < shared.DODGE_DURATION;
const isAttacking = avatar => avatar.attack_timer < shared.ATTACK_DURATION;
const canDodge = avatar => avatar.dodge_timer > shared.DODGE_DURATION + shared.DODGE_COOLDOWN;
const canAttack = avatar => avatar.attack_timer > shared.ATTACK_DURATION + shared.ATTACK_COOLDOWN;

let doDodge = false;
let doAttack = false;
let helpScreenActive = false;
const updatePlayerAvatar = () => {
    const avatar = avatars[playerAvatarId];

    let dx = 0;
    let dy = 0;

    if (just_kbd["KeyH"] || just_kbd["Escape"]) helpScreenActive = !helpScreenActive;
    if (kbd["ArrowUp"] || kbd["KeyW"]) dy -= shared.AVATAR_SPEED;
    if (kbd["ArrowDown"] || kbd["KeyS"]) dy += shared.AVATAR_SPEED;
    if (kbd["ArrowRight"] || kbd["KeyD"]) dx += shared.AVATAR_SPEED;
    if (kbd["ArrowLeft"] || kbd["KeyA"]) dx -= shared.AVATAR_SPEED;
    if (just_kbd["Space"]) doDodge = true;
    if (just_kbd["KeyL"]) doAttack = true;

    if (canAttack(avatar) && (mse["just_left"] || doAttack)) {
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
        dx += shared.AVATAR_DODGE_SPEED * Math.cos(avatar.angle);
        dy += shared.AVATAR_DODGE_SPEED * Math.sin(avatar.angle);
    }

    if (dx != 0 || dy != 0) sendMove(dx, dy);
}

const drawAttack = avatar => {
    drawArc(avatar.x, avatar.y, 
        shared.AVATAR_SIZE + shared.ATTACK_MIN_RADIUS, shared.AVATAR_SIZE + shared.ATTACK_MAX_RADIUS, 
        avatar.angle - shared.ATTACK_ANGLE_WIDTH / 2, avatar.angle + shared.ATTACK_ANGLE_WIDTH / 2, "#FF0000");
}

const drawHealthbar = () => {
    let avatar = avatars[playerAvatarId];

    ctx.fillStyle = "#000000";
    ctx.fillRect(5, 5, canvas.width - 10, canvas.width / 50);
    ctx.fillStyle = "#00FF00";
    ctx.fillRect(5, 5, (avatar.health / shared.AVATAR_MAX_HEALTH) * (canvas.width - 10), canvas.width / 50);
}

const drawEnemyHealthbar = avatar => {
    ctx.fillStyle = "#000000";

    const HEALTHBAR_SIZE = 10;

    drawRect(avatar.x - HEALTHBAR_SIZE / 2, avatar.y + 6, HEALTHBAR_SIZE, 1, "#000000")
    drawRect(avatar.x - HEALTHBAR_SIZE / 2, avatar.y + 6, (avatar.health / shared.AVATAR_MAX_HEALTH) * HEALTHBAR_SIZE, 1, "#00FF00")
}

const drawAvatar = (avatar, id) => {
    if (avatar.health <= 0) return;

    let alpha = isDodging(avatar) ? 0.6 : 1.0;
    let color = `rgba(${avatar.color.r}, ${avatar.color.g}, ${avatar.color.b}, ${alpha})`;

    drawCircle(avatar.x, avatar.y, shared.AVATAR_SIZE, color);

    if (isAttacking(avatar))
    {
        drawAttack(avatar);
    }

    if (id !== playerAvatarId) {
        drawEnemyHealthbar(avatar);
    }
}

const drawAvatars = () => {
    for (let avatarId in avatars) {
        drawAvatar(avatars[avatarId], avatarId);
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
    drawRect(-shared.WORLD_SIZE / 2, -shared.WORLD_SIZE / 2, shared.WORLD_SIZE, shared.WORLD_SIZE, "#12C956");

    gridAnim += 0.03;
    if (gridAnim > 2 * Math.PI) gridAnim = 0;

    let spacing = 0.2 * Math.sin(gridAnim) + 0.8;
    const gridSize = 10;

    let fullX = -shared.WORLD_SIZE / 2;
    let fullY = -shared.WORLD_SIZE / 2;
    let fullW = (shared.WORLD_SIZE - spacing);
    let fullH = (shared.WORLD_SIZE - spacing);

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
            sparkles[i].x = avatar.x + Math.random() * shared.WORLD_SIZE * 2 - shared.WORLD_SIZE / 2;
            sparkles[i].y = avatar.y + Math.random() * shared.WORLD_SIZE * 2 - shared.WORLD_SIZE / 2;
        }
        drawCircle(sparkles[i].x, sparkles[i].y, Math.random(), `rgba(${255 * Math.random()}, 255, ${255 * Math.random()}, 1.0)`);
    }
}

let respawnAnimState = 3;
const updateRespawnAnimState = () => {
    respawnAnimState = respawnAnimState % 3 + 1;
    setTimeout(updateRespawnAnimState, 1000);
}
updateRespawnAnimState();

const drawEndScreen = () => {
    ctx.fillStyle = "#00000088";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawText("Game Over", canvas.width/2, canvas.height/2, 48, "#FFFFFF");
    drawText("Respawning", canvas.width/2, 28 * canvas.height/48, 32, "#FFFFFF");
    drawText(".".repeat(respawnAnimState), canvas.width/2, 29 * canvas.height/48, 32, "#FFFFFF");
};

const drawHelpScreen = () => {
    const GAP = 10;
    ctx.fillStyle = "#00000088";
    ctx.fillRect(GAP, GAP, canvas.width - 2 * GAP, canvas.height - 2 * GAP);
    drawText("Help Menu", canvas.width/2, canvas.height/12, 48, "#FFFFFF");

    const TITLE_SIZE = 36 * canvas.width / 1024;
    const TEXT_SIZE = 18 * canvas.width / 1024;

    drawText("Controls", canvas.width/24, 4 * canvas.height/24, TITLE_SIZE, "#FFFFFF", "left");
    drawText("W - Move Up", canvas.width/12, 5 * canvas.height/24, TEXT_SIZE, "#FFFFFF", "left");
    drawText("A - Move Left", canvas.width/12, 6 * canvas.height/24, TEXT_SIZE, "#FFFFFF", "left");
    drawText("S - Move Down", canvas.width/12, 7 * canvas.height/24, TEXT_SIZE, "#FFFFFF", "left");
    drawText("D - Move Right", canvas.width/12, 8 * canvas.height/24, TEXT_SIZE, "#FFFFFF", "left");
    drawText("Left Click - Attack", canvas.width/12, 9 * canvas.height/24, TEXT_SIZE, "#FFFFFF", "left");
    drawText("Right Click - Dash", canvas.width/12, 10 * canvas.height/24, TEXT_SIZE, "#FFFFFF", "left");
    drawText("Esc or H - Open or Close The Help Menu", canvas.width/12, 11 * canvas.height/24, TEXT_SIZE, "#FFFFFF", "left");

    drawText("Game Info", canvas.width/24, 14 * canvas.height/24, TITLE_SIZE, "#FFFFFF", "left");
    drawText("Move around and attack any circles you see. Those circles are controlled by other players!", canvas.width/12, 15 * canvas.height/24, TEXT_SIZE, "#FFFFFF", "left");
    drawText("If you attack another player until their health reaches 0, they will disappear.", canvas.width/12, 16 * canvas.height/24, TEXT_SIZE, "#FFFFFF", "left");
    drawText("If your health runs out, you lose.", canvas.width/12, 17 * canvas.height/24, TEXT_SIZE, "#FFFFFF", "left");
    drawText("When you lose, you will disappear from the game and rejoin after a few seconds.", canvas.width/12, 18 * canvas.height/24, TEXT_SIZE, "#FFFFFF", "left");
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
    if (avatars[playerAvatarId].health < 0)
    {
        drawEndScreen();
    }
    else
    {
        drawHealthbar();
        if ( helpScreenActive ) {
            drawHelpScreen();
        }
    }
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





//---------------------------------------------------------------------------------------
// Server Communication
//---------------------------------------------------------------------------------------

let websocket = new WebSocket(SERVER_URL);
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