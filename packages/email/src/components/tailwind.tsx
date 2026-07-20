import { Tailwind as TailwindBase } from 'jsx-email';

export const Tailwind = ({ children }: { children: React.ReactNode }) => {
  return <TailwindBase>{children}</TailwindBase>;
};
