import FrameApp from "@/components/frame/FrameApp";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <FrameApp view="player" slug={slug} />;
}
