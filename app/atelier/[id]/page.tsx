import StoryscapeApp from "@/components/storyscape/StoryscapeApp";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StoryscapeApp view="editor" draftId={id} />;
}
