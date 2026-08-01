# Dhamet Online

Dhamet Online provides browser-based multiplayer matches for the Mauritanian strategy game. Players use a session nickname to enter the lobby, exchange invitations, play synchronized matches, and watch available games.

## Features

- Create a session nickname for online play.
- View connected players and active matches.
- Send, receive, accept, and decline match invitations.
- Create and join synchronized multiplayer matches.
- Reconnect to an active match from the same browser session.
- Watch available matches as a spectator.
- Apply mandatory opening moves, captures, capture chains, Soufla, promotion, wins, and draws.
- Use Arabic, English, and French interfaces.
- Use responsive layouts for desktop and mobile browsers.
- Change the board orientation on supported mobile devices.

## Architecture

- Cloudflare Pages serves the website and game interface.
- Firebase Authentication provides anonymous browser identities.
- Firebase Realtime Database synchronizes players, invitations, matches, presence, and connection capacity.
- `database.rules.json` defines Realtime Database access rules.
- A scheduled GitHub Actions workflow removes expired Firebase data.

## Requirements

- Node.js 22 or a compatible release
- A Firebase project with Anonymous Authentication and Realtime Database enabled
- A Cloudflare Pages project

## Build

```bash
npm ci
npm run prepare:pages
```

The prepared Pages output is written to `_site`.

## Deployment

Deploy the Firebase Realtime Database rules and the Pages project:

```bash
npm run deploy:firebase-rules
npm run deploy:pages
```

Set `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_PAGES_PROJECT_NAME` in the deployment environment. Provide an authorized Firebase service account to the rule-deployment workflow.

## Project Structure

- `pages/`: lobby and match pages
- `js/`: game, synchronization, session, interface, and translation logic
- `css/`: shared, responsive, and game-page styles
- `assets/`: icons and visual assets
- `database.rules.json`: Firebase Realtime Database rules
- `deploy/`: Pages build and deployment scripts
- `.github/workflows/`: Pages deployment, Firebase rule deployment, and expired-data cleanup

## Security

Store Firebase administrative credentials and Cloudflare access tokens in deployment secrets, not in source files or published assets. Review `database.rules.json` before deploying changes to the Realtime Database structure.
