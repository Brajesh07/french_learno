import { ContentReadOnly } from '@/components/staff/ContentReadOnly';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ContentReadOnly kind='quizzes' id={(await params).id}/>; }
