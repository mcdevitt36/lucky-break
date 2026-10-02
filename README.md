# Lucky Break

Lucky Break is a fast, streak-based NBA knowledge game. Each round presents four players and one stat question. Pick the leader, keep the streak alive, and chase the daily leaderboard.

## MVP
- 4-player questions
- mixed current, career, achievement, and draft categories
- streak-based scoring
- difficulty scaling
- instant answer reveal
- mobile-first dark UI
- local personal best + daily leaderboard demo
- no NBA player photos or official team logos

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Scripts
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm test`

## Data

The current player dataset is demo seed data used to demonstrate the game engine and UI. It is intentionally separated from the game logic. Before a public production launch, replace it with a verified, licensed/current NBA statistics provider.

## Database / production leaderboard

The repo includes a Supabase schema in `supabase/schema.sql` and an `.env.example`. The playable MVP works without credentials, while production persistence can be connected through the supplied data model.

## IP note

Lucky Break intentionally does not include real NBA player photos or official NBA/team logos in the MVP.

Lucky Break is an independent basketball trivia game and is not affiliated with or endorsed by the NBA.
