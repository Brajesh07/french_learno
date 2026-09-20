import { ContentList } from '@/components/staff/ContentList';
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
 const { page } = await searchParams;
 return <ContentList role='admin' kind='courses' page={Math.max(1, Math.min(10000, Math.floor(Number(page) || 1)))}/>;
}
