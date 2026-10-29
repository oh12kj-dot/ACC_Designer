'use client';
const button='min-h-11 rounded border border-stone-300 bg-white px-3 disabled:opacity-50';
export default function BulkSelectionActions({count,total,busy,onAll,onClear,onDelete}:{count:number;total:number;busy:boolean;onAll:()=>void;onClear:()=>void;onDelete:()=>void}){
 return <section aria-label="まとめて選択・削除" className="mt-3 rounded-lg border bg-stone-50 p-3">
  <div className="flex flex-wrap items-center gap-2"><span className="text-sm">{count}個を選択中 / 配置済み{total}個</span><button className={button} disabled={busy||!total} onClick={onAll}>配置済みを全選択</button><button className={button} disabled={busy||!count} onClick={onClear}>選択をすべて解除</button><button className={`${button} text-red-700`} disabled={busy||!count} onClick={onDelete}>選択した{count}個をまとめて削除</button></div>
  <p className="mt-1 text-xs text-stone-600">配置済み一覧のチェック欄、またはShift＋クリックで複数選択できます。固定中の素材を含む場合は削除しません。左右連動中は対応する側も削除されます。元に戻すで一括復元できます。</p>
 </section>;
}
