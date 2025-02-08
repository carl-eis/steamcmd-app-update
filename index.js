#!/usr/bin/env node
const fs = require("fs");
const _ = require("lodash");

const STEAM_API_KEY = process.env.STEAM_API_KEY;

if (!STEAM_API_KEY) {
  console.error(
    "The STEAM_API_KEY environment variable should contain your Steam API key.",
  );
  console.error("See: https://steamcommunity.com/dev/apikey");
  process.exit(1);
}

const steam = new (require("steamapi"))(STEAM_API_KEY);

const STEAM_PROFILE_ID = process.env.STEAM_PROFILE_ID;

if (!STEAM_PROFILE_ID) {
  console.error("The STEAM_PROFILE_ID environment variable is required.");
  process.exit(1);
}

/* =================== Whitelisting =================== */

const skipGames = [];
const whitelist = [];

if (process.env.SKIP_GAMES) {
  process.env.SKIP_GAMES.split(",")
    .map((game) => game.trim())
    .forEach((game) => {
      skipGames.push(game);
    });
}

if (process.env.GAMES_WHITELIST) {
  process.env.GAMES_WHITELIST.split(",")
    .map((game) => game.trim())
    .forEach((game) => {
      whitelist.push(game);
    });
}

function shouldSkip(gameId, gameTitle) {
  const isUsingWhitelist = !!whitelist.length
  const whitelistMatches = _.intersection([gameId, gameTitle], whitelist)
  if (isUsingWhitelist && !whitelistMatches.length) {
    return true
  }
  return !!(_.intersection(skipGames, [gameId, gameTitle])).length
}

function getOutputStream() {
  return !!process.env.OUTPUT_FILE
    ? fs.createWriteStream(process.env.OUTPUT_FILE)
    : process.stdout;
}

const validateFlag = !!process.env.FORCE_VALIDATE ? " -validate" : "";

steam
  .getUserOwnedGames(STEAM_PROFILE_ID)
  .then((games) => {
    const stream = getOutputStream();
    games
      .filter((game) => !shouldSkip(game.appID, game.name))
      .sort((a, b) => a.appID - b.appID)
      .forEach((game) => {
        stream.write(
          `// ${game.name} - https://store.steampowered.com/app/${game.appID}\n`,
        );
        stream.write(`app_update ${game.appID}${validateFlag}\n`);
      });
    stream.end();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
