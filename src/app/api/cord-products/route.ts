import {assertLocalCatalog} from '../../../server/localCatalogAccess';
import {cordProducts,cordQuotes} from '../../../server/cordProducts';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{assertLocalCatalog(request);const products=await cordProducts();return Response.json({products,quotes:await cordQuotes(products)},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'紐の商品を読み込めませんでした。'},{status:503});}}
