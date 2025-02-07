# Technical Design Document - Classroom Coin Flip

## 1. System Architecture

### Overview
A real-time multiplayer coin-flipping game designed for classroom use, built with:
- Frontend: Next.js with TypeScript
- Real-time Communication: Pusher Channels
- Deployment: Vercel
- State Management: Server-side in-memory

### Key Components
1. Client Application (Next.js)
   - User Interface
   - Real-time event handling
   - Game state management

2. Pusher Integration
   - Real-time communication
   - Presence channels for lobby
   - Private channels for games

## 2. Data Models

### Player State
```typescript
interface Player {
  id: string;          // Student ID
  coins: number;       // Starting with 5
  status: 'lobby' | 'playing';
}
```

### Game Room State
```typescript
interface GameRoom {
  id: string;
  players: [string, string];  // Exactly 2 players
  currentTurn: string;        // Player ID
  betAmount: number;
  status: 'betting' | 'flipping' | 'complete';
}
```

## 3. Communication Protocol

### Pusher Channels Structure

1. Presence Channel: `presence-lobby`
   Events:
   - `player-joined`: {playerId: string}
   - `player-left`: {playerId: string}
   - `game-created`: {gameId: string, players: [string, string]}

2. Private Channel: `private-game-{gameId}`
   Events:
   - `bet-placed`: {playerId: string, amount: number}
   - `flip-started`: {playerId: string}
   - `flip-result`: {result: 'heads' | 'tails', winner: string}
   - `game-ended`: {winner: string, finalCoins: number}

## 4. API Endpoints

### Player Management
- POST /api/players
  - Create new player
  - Returns: Player object

- GET /api/players/:id
  - Get player status
  - Returns: Player object

### Game Management
- POST /api/games
  - Create new game
  - Returns: GameRoom object

- PUT /api/games/:id/bet
  - Place bet
  - Body: {amount: number}

- POST /api/games/:id/flip
  - Perform coin flip
  - Returns: {result: 'heads' | 'tails'}

## 5. State Management

### Server-Side
- In-memory storage of active players and games
- Cleanup of completed games
- Validation of game actions

### Client-Side
- React state for UI
- Pusher subscription management
- Local game state caching

## 6. Security Considerations

1. Input Validation
   - Bet amounts within player's coins
   - Valid player turns
   - Game state transitions

2. Channel Authorization
   - Presence channel authentication
   - Private game channel access control

3. Rate Limiting
   - API endpoint protection
   - Event emission limits

## 7. Error Handling

1. Network Errors
   - Reconnection logic
   - State recovery

2. Game Logic Errors
   - Invalid moves
   - Out of sequence actions

3. Player Disconnection
   - Timeout handling
   - Game state recovery

## 8. Testing Strategy

1. Unit Tests
   - Game logic
   - State transitions
   - Event handling

2. Integration Tests
   - API endpoints
   - Pusher integration
   - State management

3. End-to-End Tests
   - Complete game flows
   - Error scenarios
   - Edge cases

## 9. Deployment Strategy

1. Development
   - Local environment setup
   - Development Pusher keys

2. Staging
   - Vercel preview deployments
   - Testing environment

3. Production
   - Vercel production deployment
   - Production Pusher configuration

## 10. Monitoring and Maintenance

1. Metrics
   - Active players
   - Game completion rates
   - Error rates

2. Logging
   - Game events
   - Error tracking
   - Player activity

3. Maintenance
   - Regular dependency updates
   - Performance optimization
   - Bug fixes
