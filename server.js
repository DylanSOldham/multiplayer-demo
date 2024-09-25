import * as shared from "./public/shared/shared.js"

// Express setup adapted from https://expressjs.com/en/starter/hello-world.html
import express from "express";
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static("./public")); //Line adapted from https://expressjs.com/en/starter/static-files.html

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});



//---------------------------------------------------------------------------------------
// Game State
//---------------------------------------------------------------------------------------

const avatars = {};

const randomColor = () => { return {r: Math.random() * 255, g: Math.random() * 255, b: Math.random() * 255, a: 1.0} }

const clampAvatarToWorld = avatar => {
  avatar.x = Math.max(-shared.WORLD_SIZE/2, Math.min(shared.WORLD_SIZE/2, avatar.x));
  avatar.y = Math.max(-shared.WORLD_SIZE/2, Math.min(shared.WORLD_SIZE/2, avatar.y));
}



//---------------------------------------------------------------------------------------
// Client Communication
//---------------------------------------------------------------------------------------

import WebSocket, { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ port: 8081 });

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
    respawn_timer: 0.0,
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
  
    for (let s of openSockets)
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

  const isDodging = avatar => avatar.dodge_timer < shared.DODGE_DURATION;

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
            other.health -= 30;
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
    const canDodge = () => avatar.dodge_timer > shared.DODGE_DURATION + shared.DODGE_COOLDOWN;
    const canAttack = () => avatar.attack_timer > shared.ATTACK_DURATION + shared.ATTACK_COOLDOWN;
    const isDead = () => avatar.health <= 0;

    if (!canAttack(avatar)) avatar.attack_timer += 0.016;
    if (!canDodge(avatar)) avatar.dodge_timer += 0.016;

    if (isDead(avatar)) 
    {
        avatar.respawn_timer += 0.016;
        if (avatar.respawn_timer > 5.0)
        {
            avatar.respawn_timer = 0.0;
            avatar.health = AVATAR_MAX_HEALTH;
            avatar.x = Math.random() * shared.WORLD_SIZE / 2.0;
            avatar.y = Math.random() * shared.WORLD_SIZE / 2.0;
        }
    }
    
}

const updateAvatars = () => {

    for (let id in avatars)
    {
        updateAvatar(avatars[id]);
    }

    sendAvatarsUpdate();

    setTimeout(updateAvatars, 1.6);
}

const cleanInactive = () => {
  for (let id in avatars)
  {
    for (let s of openSockets)
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
setTimeout(updateAvatars, 1);