type MeaningReviewPart={metadata?:{dimensionMeaningReview?:{recipe?:string}}};
export function dimensionMeaningNotice(part:MeaningReviewPart){return part.metadata?.dimensionMeaningReview?.recipe==='published-scalar-body-meaning-unresolved-v1'?'掲載サイズが本体外寸か紐への適合幅か確認できていません。写真は同一商品の形状参考です。表示枠は実寸ではありません。':undefined;}
