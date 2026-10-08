import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/app-shell';
import { InstallPrompt } from '@/components/install-prompt';

export const metadata: Metadata = { title: { default: 'Expense Manager — Home in sync', template: '%s · Expense Manager' }, description: 'A calmer way to manage shared home expenses and cat care.', manifest: '/manifest.webmanifest', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Expense Manager' }, icons: { icon: '/icons/icon.svg', apple: '/icons/icon.svg' } };
export const viewport: Viewport = { themeColor: '#f8f7f3', colorScheme: 'light dark' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><AppShell>{children}</AppShell><InstallPrompt/><script dangerouslySetInnerHTML={{__html:`if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));`}}/></body></html>; }
