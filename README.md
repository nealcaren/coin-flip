# Classroom Coin Flip

A real-time multiplayer coin-flipping game for classrooms where students compete using virtual coins. Each student starts with 5 coins and can challenge others to coin-flip battles.

## Features

- 🎮 Player Features
  - Automatic 5-coin balance for new users
  - Real-time coin balance tracking
  - Simple login with student ID
  - Status tracking (in lobby/in game)

- 🎲 Game Features
  - Random matchmaking with other online players
  - Turn-based coin flipping
  - Player-chosen bet amounts
  - Heads wins, tails loses
  - Automatic return to lobby when out of coins

- 🏠 Room System
  - Main lobby for available players
  - Private game rooms for matched pairs
  - Real-time game state updates

## Technical Stack

- **Frontend**: Next.js with TypeScript
- **Backend**: Pusher Channels
- **Hosting**: Vercel
- **Version Control**: GitHub

## Installation

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run the development server
npm run dev
```

## Environment Setup

Create a `.env.local` file with the following:

```env
PUSHER_APP_ID=
NEXT_PUBLIC_PUSHER_KEY=
PUSHER_SECRET=
NEXT_PUBLIC_PUSHER_CLUSTER=
```

## Project Structure

```
coin-flip-game/
├── src/
│   ├── components/    # React components
│   ├── lib/          # Firebase and game logic
│   ├── pages/        # Next.js pages
│   └── types/        # TypeScript definitions
```

## Game Rules

1. Each new player starts with 5 coins
2. Players enter the gaming room for matchmaking
3. When matched, players take turns:
   - Active player chooses bet amount
   - Active player flips coin
   - Heads: Active player wins bet amount
   - Tails: Active player loses bet amount
4. Game ends when a player runs out of coins
5. Players can start new games from lobby

## Development Status

- [ ] Phase 1: Basic Setup
  - [ ] Project initialization
  - [ ] Firebase configuration
  - [ ] Student authentication

- [ ] Phase 2: Core Features
  - [ ] User management
  - [ ] Lobby system
  - [ ] Matchmaking

- [ ] Phase 3: Game Logic
  - [ ] Coin flipping
  - [ ] Betting system
  - [ ] Win/lose conditions

- [ ] Phase 4: Polish
  - [ ] UI/UX improvements
  - [ ] Error handling
  - [ ] Performance optimization

## Contributing

This is a classroom project. Contributing guidelines will be provided by the instructor.

## Deployment

The application is deployed on Vercel and can be accessed at [your-app-url].

## Support

For support, please contact [instructor contact information].

## License

This project is licensed under the MIT License - see the LICENSE file for details.
