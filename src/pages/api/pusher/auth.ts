import { NextApiRequest, NextApiResponse } from 'next';
import { pusherServer } from '@/lib/pusher';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { socket_id, channel_name, username } = req.body;

  try {
    // For presence channels
    if (channel_name.startsWith('presence-')) {
      const presenceData = {
        user_id: username,
        user_info: {
          username
        }
      };
      
      const auth = pusherServer.authorizeChannel(
        socket_id,
        channel_name,
        presenceData
      );
      return res.json(auth);
    }

    // For private channels
    if (channel_name.startsWith('private-')) {
      const auth = pusherServer.authorizeChannel(socket_id, channel_name);
      return res.json(auth);
    }

    res.status(403).json({ error: 'Unauthorized' });
  } catch (error) {
    console.error('Pusher auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
