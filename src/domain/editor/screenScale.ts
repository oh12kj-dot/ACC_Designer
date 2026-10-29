export function calibratedZoom(measuredMm:number,canvasCssWidth:number,internalWidth=900){
 if(![measuredMm,canvasCssWidth,internalWidth].every(Number.isFinite)||measuredMm<=0||canvasCssWidth<=0||internalWidth<=0)throw Error('定規で測った長さを正しく入力してください');
 const pxPerMm=200/measuredMm,zoom=pxPerMm*internalWidth/canvasCssWidth;
 if(zoom<.25||zoom>20)throw Error('この画面幅では実寸倍率にできません。表示領域や計測値を確認してください');
 return{pxPerMm,zoom};
}
export const screenScalePercent=(zoom:number,canvasCssWidth:number,pxPerMm:number,internalWidth=900)=>100*zoom*canvasCssWidth/internalWidth/pxPerMm;
