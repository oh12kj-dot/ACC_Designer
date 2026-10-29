import type {Part} from '../../types/domain';
export type MinimumOffer=NonNullable<Part['selectionReference']>;
export function minimumOfferPrice(offer:MinimumOffer){return offer.price===null?'価格不明':offer.currency==='JPY'?`¥${offer.price.toLocaleString('ja-JP')}`:`${offer.price} ${offer.currency??'通貨不明'}`;}
export function partSelectionName(part:Part){return part.selectionReference?.displayName??part.name;}
export default function SaleUnitReference({offer}:{offer:MinimumOffer}){
 return <section className="mt-2 rounded bg-stone-50 p-2 text-sm"><p>{offer.scope==='same-product-subgroup'?'同一商品内の最小販売単位の参考価格':'最小販売単位の参考価格'}: {minimumOfferPrice(offer)} / {offer.purchaseText}</p>{!offer.available&&<p>取得時点では販売不可でした。</p>}{offer.approximateCount!==undefined&&<p>目安入数は約{offer.approximateCount}個です。確定入数・1個価格ではありません。</p>}<p>取得: {new Date(offer.sourceFetchedAt).toLocaleDateString('ja-JP')}</p><a href={offer.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline">販売単位・価格の出典</a></section>;
}
