import type { ReactNode } from 'react';
import { Providers } from '../components/providers';
import './globals.css';

export const metadata = {
  title: 'Mundo de Aprendizado',
  description: 'Aprenda explorando um prédio 3D: andares, salas e trilhas de estudo.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
