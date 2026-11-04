import FrameApp from "@/components/frame/FrameApp";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FrameApp view="editor" draftId={id} />;
}
