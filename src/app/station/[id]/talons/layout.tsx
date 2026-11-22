import { TalonSubTabs } from "./sub-tabs";

export default async function TalonsLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <TalonSubTabs id={id} />
      {children}
    </>
  );
}
