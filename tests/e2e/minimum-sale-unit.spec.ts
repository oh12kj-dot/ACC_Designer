import {test,expect} from '@playwright/test';
for(const message of ['終息・旧品・切替待ちの商品は登録しません。','入数違いのため登録しません。最小販売単位を選択してください。'])test('blocks source import before fetching an image: '+message,async({page})=>{
 let imageRequests=0;
 await page.route('**/api/catalog/image?*',async route=>{imageRequests++;await route.abort();});
 await page.route('**/api/catalog?id=*',route=>route.fulfill({json:{id:'1',name:'丸カン',handle:'fixture',sourceUrl:'https://kiwaseisakujo.jp/products/fixture',tags:[],imageUrls:['https://example.com/image.jpg'],variants:[{id:'2',title:'50g(中袋)',options:['3mm','50g(中袋)'],registrationEligibility:{allowed:false,message}}]}}));
 await page.goto('/parts/new?catalogId=1&variantId=2');await expect(page.getByText(message,{exact:true})).toBeVisible();expect(imageRequests).toBe(0);
});
