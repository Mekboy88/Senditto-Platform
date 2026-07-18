export const metadata = {
  title: "Senditto — Email infrastructure for every message",
  description:
    "Transactional email, marketing campaigns and inbound email through one clean platform.",
};

export default function Home() {
  return (
    <main className="preview-shell">
      <iframe
        className="site-preview"
        src="/senditto-preview.html"
        title="Senditto website"
        allow="clipboard-write"
      />
    </main>
  );
}
