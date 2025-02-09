import '@/styles/globals.css'
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { pusherClient } from '@/lib/pusher';
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Enable pusher logging in development
    if (process.env.NODE_ENV === 'development') {
      pusherClient.connection.logToConsole = true;
    }
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </>
  );
}
