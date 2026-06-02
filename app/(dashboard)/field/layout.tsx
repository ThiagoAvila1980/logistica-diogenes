export default function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      {children}
    </div>
  );
}
