import PartSourceRefresh from '../../../../components/parts/PartSourceRefresh';
export default async function Page({params}:{params:Promise<{partId:string}>}){const {partId}=await params;return <PartSourceRefresh partId={partId}/>;}
