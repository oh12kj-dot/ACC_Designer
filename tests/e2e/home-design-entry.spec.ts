import { test,expect } from '@playwright/test';

test('home cards lead to the chosen design type without creating a design',async({page})=>{
  for(const [name,type] of [['ネックレス','necklace'],['ピアス','earrings']]){
    await page.goto('/');
    await page.getByRole('link',{name:`${name}を作る →`,exact:true}).click();
    await expect(page).toHaveURL(new RegExp(`/designs\\?type=${type}#new-design$`));
    await expect(page.getByRole('heading',{name:'新しいデザイン',exact:true})).toBeVisible();
    await expect(page.getByRole('combobox',{name:'種類',exact:true})).toHaveValue(type);
    await expect(page.getByLabel('名前',{exact:true})).toBeEmpty();
    await expect(page.getByRole('button',{name:'作成',exact:true})).toBeDisabled();
  }
  await page.goto('/designs?type=unsupported');
  await expect(page.getByRole('combobox',{name:'種類',exact:true})).toHaveValue('necklace');
});
