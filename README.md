# Real-Time Online Multiplayer Fighting Game Prototype

## Scope and Motivation

The goal of this project was just to explore synchronizing the state of a game over the internet in real time. 

The game iself is mechanically very simple:
- WASD - Move around
- Left Click - Execute an attack
- Right Click - Dash

You execute attacks on other connected players to destroy them. If you yourself are destroyed you will see a brief
death screen before being respawned at a random location after a few seconds.

## Build Instructions

Clone this repository, and execute `npm i` inside the repository folder.

To start the server, run `npm start`. You may then connect to it through a web browser by visiting `http://localhost:8080`
(the port may be changed by setting the PORT environment variable.
