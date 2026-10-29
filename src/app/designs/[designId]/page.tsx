import DesignEditor from '../../../components/editor/DesignEditor';
export default async function Page({params}:{params:Promise<{designId:string}>}){const {designId}=await params;return <DesignEditor designId={designId}/>;}
