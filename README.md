# Real-Time Online Multiplayer Fighting Game Prototype

![An image of the game with two players, one attacking the other.]("./screenshot.png")

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

To start the server, run `npm start`. This will host the game over port 8080 by default (this can be changed by setting
the `PORT` environment variable). You may connect to the game through a web browser. 
