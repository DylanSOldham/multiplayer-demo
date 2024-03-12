// Express setup adapted from https://expressjs.com/en/starter/hello-world.html
const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static("./public")); //Line adapted from https://expressjs.com/en/starter/static-files.html

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});






//---------------------------------------------------------------------------------------
// Global Constants
//---------------------------------------------------------------------------------------

const AVATAR_SIZE = 5;
const AVATAR_MAX_HEALTH = 100;
const AVATAR_SPEED = 2;
const AVATAR_DODGE_SPEED = 5;
const WORLD_SIZE = 150;
const ATTACK_DURATION = 0.1; // Seconds
const ATTACK_COOLDOWN = 0.2; // Seconds
const ATTACK_MIN_RADIUS = 1.0;
const ATTACK_MAX_RADIUS = 10.0;
const ATTACK_ANGLE_WIDTH = 2 * Math.PI / 3;
const DODGE_DURATION = 1.0; // Seconds
const DODGE_COOLDOWN = 0.2; // Seconds






//---------------------------------------------------------------------------------------
// Game State
//---------------------------------------------------------------------------------------

const avatars = {};

const randomColor = () => { return {r: Math.random() * 255, g: Math.random() * 255, b: Math.random() * 255, a: 1.0} }

const clampAvatarToWorld = avatar => {
  avatar.x = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, avatar.x));
  avatar.y = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, avatar.y));
}



//---------------------------------------------------------------------------------------
// Client Communication
//---------------------------------------------------------------------------------------

// Websocket setup adapted from the "Simple server" example at https://www.npmjs.com/package/ws#usage-examples
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });

let openSockets = [];

const initAvatar = (ws, id) => 
{
  avatars[id] = {
    lastActive: Date.now(),
    health: 100.0,
    x: 0,
    y: 0,
    angle: 0.0,
    attack_timer: 100.0,
    dodge_timer: 100.0,
    color: randomColor(),
  };

  const initData = {
    type: "myConnect",
    id: id,
    avatars: avatars
  };

  ws.send(JSON.stringify(initData));
}

const sendAvatarsUpdate = () => {
    const data = {
      type: "updateAvatars",
      avatars: avatars
    };
  
    for (s of openSockets)
    {
      s.send(JSON.stringify(data));
    }
}

const disconnectAvatar = (id) => {
  delete avatars[id];
  console.log(`Disconnected player: ${id}`);
}

const handleMove = data =>
{
  let avatar = avatars[data.id];
  avatar.x += data.offset.x;
  avatar.y += data.offset.y;
  clampAvatarToWorld(avatar);

  console.log(`Moving ${data.id} by ${data.offset.x}, ${data.offset.y}`);
}

const handleAttack = data =>
{
  let avatar = avatars[data.id];
  avatar.angle = data.angle;
  avatar.attack_timer = 0.0;

  const isDodging = avatar => avatar.dodge_timer < DODGE_DURATION;

  for (let id in avatars)
  {
    if (id === data.id) continue;

    let other = avatars[id];

    if (isDodging(other)) continue;

    const otherDx = avatar.x - other.x;
    const otherDy = avatar.y - other.y;
    const otherDist2 = otherDx * otherDx + otherDy * otherDy;

    maxDist2 = Math.pow(ATTACK_MAX_RADIUS + AVATAR_SIZE, 2);

    if (otherDist2 < maxDist2 + AVATAR_SIZE * AVATAR_SIZE)
    {
        const otherAngle = Math.atan2(other.y - avatar.y, other.x - avatar.x);
        if (Math.abs(otherAngle - avatar.angle) < ATTACK_ANGLE_WIDTH / 2) {
            other.health -= 5;
        }
    }
  }

  console.log(`Attack by ${data.id}.`)
}

const handleDodge = data =>
{
    let avatar = avatars[data.id];
    avatar.angle = data.angle;
    avatar.dodge_timer = 0.0;
}

wss.on("connection", (ws, req) => {
  openSockets.push(ws);

  let avatarId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
  initAvatar(ws, avatarId);

  ws.on("message", rawdata => {
    let data = JSON.parse(rawdata.toString("ascii"));

    if (!avatars[data.id]) return;

    switch (data.type)
    {
      case "avatarMove":
        handleMove(data);
        break;
      case "avatarAttack":
        handleAttack(data);
        break;
      case "avatarDodge":
        handleDodge(data);
      case "pong":
        avatars[data.id].lastActive = Date.now();
      break;
    }
  });

  ws.on("close", () => {
    disconnectAvatar(avatarId);
  });
});

const CLEANUP_PERIOD = 1 * 1000;

const updateAvatar = avatar => {
    const canDodge = () => avatar.dodge_timer > DODGE_DURATION + DODGE_COOLDOWN;
    const canAttack = () => avatar.attack_timer > ATTACK_DURATION + ATTACK_COOLDOWN;

    if (!canAttack(avatar)) avatar.attack_timer += 0.016;
    if (!canDodge(avatar)) avatar.dodge_timer += 0.016;
}

const updateAvatars = () => {

    for (id in avatars)
    {
        updateAvatar(avatars[id]);
    }

    sendAvatarsUpdate();

    setTimeout(updateAvatars, 1.6);
}

const cleanInactive = () => {
  for (let id in avatars)
  {
    for (s of openSockets)
    {
      s.send(`{"type": "ping"}`);
    }

    if (Date.now() - avatars[id].lastActive > 5 * 1000)
    {
      disconnectAvatar(id);
    }
  }

  setTimeout(cleanInactive, CLEANUP_PERIOD);
}

setTimeout(cleanInactive, CLEANUP_PERIOD);
setTimeout(updateAvatars, 10);