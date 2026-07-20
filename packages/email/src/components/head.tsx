import { Font, Head as HeadBase } from 'jsx-email';

export type HeadProps = React.ComponentProps<typeof HeadBase>;

const styles = `
@layer base {
  :root {
      --background: 237 39% 100%;
      --foreground: 237 64% 3%;
      --muted: 207 8% 87%;
      --muted-foreground: 207 14% 38%;
      --popover: 0 0% 99%;
      --popover-foreground: 237 64% 2%;
      --card: 0 0% 99%;
      --card-foreground: 237 64% 2%;
      --border: 237 10% 94%;
      --input: 237 10% 94%;
      --primary: 237 86% 8%;
      --primary-foreground: 237 0% 100%;
      --secondary: 207 86% 8%;
      --secondary-foreground: 182.24 89.33% 70.59%;
      --accent: 220, 13%, 91%;
      --accent-foreground: 305.12 79.61% 59.61%;
      --destructive: 360 100% 57.79%;
      --destructive-foreground: 0 0% 100%;
      --error: 360 100% 57.79%;
      --error-foreground: 0 0% 100%;
      --ring: 237 86% 8%;
      --radius: 0.5rem;
  }

  .dark {
      --background: 237 34% 0%;
      --foreground: 237 28% 99%;
      --muted: 207 8% 13%;
      --muted-foreground: 207 14% 62%;
      --popover: 0 0% 1%;
      --popover-foreground: 0 0% 100%;
      --card: 0 0% 1%;
      --card-foreground: 0 0% 100%;
      --border: 237 10% 10%;
      --input: 237 10% 10%;
      --primary: 237 23.41% 12.47%;
      --primary-foreground: 237 100% 95.94%;
      --secondary: 207 86% 8%;
      --secondary-foreground: 182.24 89.33% 70.59%;
      --accent: 267 86% 8%;
      --accent-foreground: 305.12 79.61% 59.61%;
      --destructive: 356.6 100% 68.31%;
      --destructive-foreground: 0 0% 0%;
      --error: 360 100% 57.79%;
      --error-foreground: 0 0% 100%;
      --ring: 237 86% 8%;
      --radius: 0.5rem;
  }
}

* {
  border-color: var(--border);
}

h1,
h2,
h3 {
  font-family: Goldman, sans-serif;
}
`;

export const Head = ({ children, ...props }: HeadProps) => {
  return (
    <HeadBase {...props}>
      {[400, 700].map((weight) => (
        <Font
          key={weight}
          fontFamily='Goldman'
          fallbackFontFamily='sans-serif'
          fontWeight={weight}
          webFont={{
            url: `https://cdn.jsdelivr.net/fontsource/fonts/goldman@latest/latin-${weight}-normal.woff2`,
            format: 'woff2',
          }}
        />
      ))}
      {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => (
        <Font
          key={weight}
          fontFamily='Inter'
          fallbackFontFamily='sans-serif'
          fontWeight={weight}
          webFont={{
            url: 'https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2',
            format: 'woff2',
          }}
        />
      ))}
      <style>{styles}</style>
      {children}
    </HeadBase>
  );
};
