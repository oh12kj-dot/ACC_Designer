import PartEdit from '../../../../components/parts/PartEdit';
export default async function Page({params}:{params:Promise<{partId:string}>}){const {partId}=await params;return <PartEdit partId={partId}/>;}
