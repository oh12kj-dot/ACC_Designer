import PartRegistration from '../../../../components/parts/PartRegistration';
export default async function Page({params}:{params:Promise<{partId:string}>}){const {partId}=await params;return <PartRegistration editPartId={partId}/>;}
