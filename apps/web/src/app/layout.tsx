import type { ReactNode } from 'react';

export const metadata = {
  title: 'Mundo de Aprendizado',
  description: 'Aprenda explorando um prédio 3D: andares, salas e trilhas de estudo.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
