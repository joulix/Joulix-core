import Providers from "./providers";

export const metadata = {
  title: "Joulix Dashboard",
  description: "Web3 Dashboard for Carbon Credits",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
