import type {Metadata} from 'next';
import AdminPanel from '@/components/admin/AdminPanel';
export const metadata:Metadata={title:'Управление каталогом',robots:{index:false,follow:false},alternates:{canonical:'/admin/'}};
export default function Admin(){return <AdminPanel/>;}
