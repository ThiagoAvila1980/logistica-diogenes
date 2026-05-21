export default function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-6 lg:max-w-4xl">
      {children}
    </div>
  );
}
