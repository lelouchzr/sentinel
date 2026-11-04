import StoryscapeApp from "@/components/storyscape/StoryscapeApp";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <StoryscapeApp view="player" slug={slug} />;
}
