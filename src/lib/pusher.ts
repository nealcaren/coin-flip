import Pusher from 'pusher';
import PusherClient from 'pusher-js';

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true
});

export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: '/api/pusher/auth',
    auth: {
      params: {
        // Send current timestamp to prevent caching
        timestamp: Date.now()
      }
    }
  }
);

// Enable client-side logging for debugging
pusherClient.connection.bind('state_change', (states: any) => {
  console.log('Pusher connection state:', states);
});

pusherClient.connection.bind('error', (err: any) => {
  console.error('Pusher connection error:', err);
});
