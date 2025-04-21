# Color of <strike>Berlin</strike> Montréal

A bot that posts the color of the sky in Montréal to Twitter/X, Bluesky, and Mastodon.

## Project description
Visit my [website](https://vincent.charlebois.info/en/couleur/) to read about the project's evolution

## Montreal's specificity

- Translated colors to French (couleurs.js)
- Added a connection to Web3 to bring these [colours onchain](https://vncnt.xyz/CouleurMontreal) on Optimism
- Posts to multiple social media platforms: Twitter/X, Bluesky, and Mastodon

This bot fetches the latest image of the sky in Montréal, crops and places it on an HTML5 Canvas, picks the color and matches it against a color list, fills a new Canvas with the color that was matched, then posts the color name, image, and HEX value to multiple social media platforms.

## Project Structure

```
src/
├── main.js               # Main entry point
├── config/               # Configuration files
│   ├── colors.js         # Color definitions
│   └── social.js         # Social media configuration
├── services/             # Service integrations
│   ├── twitter.js        # Twitter/X posting service
│   ├── bluesky.js        # Bluesky posting service
│   └── mastodon.js       # Mastodon posting service
└── utils/                # Utility functions
    ├── canvas.js         # Canvas manipulation utilities
    └── color.js          # Color matching utilities
```

## Prerequisites

- [Node](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/get-npm)
- Social media accounts and API access:
  - [Twitter/X developer account](https://developer.twitter.com/en/docs/basics/developer-portal/overview)
  - [Bluesky developer account](https://bsky.app)
  - [Mastodon developer account](https://docs.joinmastodon.org/api/)

## Initial set-up and installation

- Clone the project: `git clone https://github.com/tripledoublev/color-of-montreal.git`
- Change to the project directory: `cd color-of-montreal`
- Install the project dependencies: `npm install`

## Create `.env` file

In the project root, create an `.env` file or make a copy of the `.env.example` file, containing the following environment variables with the required values:

```
# Twitter/X Configuration
TWITTER_API_CONSUMER_KEY=
TWITTER_API_CONSUMER_SECRET=
TWITTER_API_TOKEN=
TWITTER_API_TOKEN_SECRET=

# Bluesky Configuration
BLUESKY_IDENTIFIER=
BLUESKY_PASSWORD=

# Mastodon Configuration
MASTODON_INSTANCE_URL=
MASTODON_ACCESS_TOKEN=

# General Configuration
SOURCE_IMAGE=
LOCATION=
```

## Send a post

- In the project directory, run `node src/main.js` from the command line to send posts to all configured social media platforms.

- Currently posting the color of the sky in Montreal with the following accounts:
  - Twitter/X: [@vncntxyz](https://twitter.com/vncntxyz)
  - Bluesky: [@couleurs.bsky.social](https://bsky.app/profile/couleurs.bsky.social)
  - Mastodon: [@couleurs@chateau.social](https://chateau.social/@couleurs)

## Credits and Inspiration

Public access to Montreal camera was disabled in March 12, 2024. I have set my own camera to continue posting the colour of Montreal.

<strike>Currently using images from [Montreal's Traffic camera infrastructure](https://ville.montreal.qc.ca/circulation/).</strike>

Thanks to [Lauren Dorman's Color of Berlin](https://github.com/laurendorman/color-of-berlin)

Original repository used Meteorology/sky photos sourced from Berlin's official tourism and congress organization webcams at [visitBerlin](https://webcam.visitberlin.de/).

Forked color list provided by [@gekidoslair](https://gist.github.com/gekidoslair/72058193cb2fc8cbc182).
