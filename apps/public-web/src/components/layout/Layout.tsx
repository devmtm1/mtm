import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { WhatsAppButton } from './WhatsAppButton';

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-mtm-bg text-mtm-text">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
