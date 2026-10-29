import { describe,expect,it } from 'vitest';
import { parseKiwaHtml } from './kiwaParser';
import { publicAddress,validateRemoteUrl } from './publicResource';
const url='https://www.kiwaseisakujo.jp/products/example';
describe('Kiwa candidate parser',()=>{
  it('prefers JSON-LD and extracts semantic units without guessing dimensions',()=>{
    const html=`<meta property="og:title" content="fallback"><script type="application/ld+json">{"@graph":[{"@type":"Product","name":"Bead","sku":"ABC","offers":{"price":"220","priceCurrency":"JPY"},"image":["https://cdn.example.com/a.png"]}]}</script><dl><dt>入数</dt><dd>20個</dd><dt>サイズ</dt><dd>8mm</dd></dl>`;
    const value=parseKiwaHtml(html,url,'2026-10-05T00:00:00Z');expect(value).toMatchObject({name:'Bead',sku:'ABC',unitPrice:220,currency:'JPY',packageText:'20個',dimensionsText:'8mm',status:'success'});expect(value.fetchedAt).toBe('2026-10-05T00:00:00Z');
  });
  it('handles malformed JSON-LD and partial metadata with unknown price',()=>{
    const value=parseKiwaHtml('<script type="application/ld+json">bad</script><meta property="og:title" content="Manual"><meta property="product:price:amount" content="お問い合わせ">',url);expect(value.name).toBe('Manual');expect(value.unitPrice).toBeUndefined();expect(value.status).toBe('partial');
  });
  it('preserves explicit free price and rejects unsafe image candidates',()=>{
    const value=parseKiwaHtml('<script type="application/ld+json">{"@type":"Product","offers":{"price":0},"image":["http://example.com/a.png","https://127.0.0.1/x","//cdn.example.com/a.png"]}</script>',url);expect(value.unitPrice).toBe(0);expect(value.imageUrls).toEqual(['https://cdn.example.com/a.png']);
  });
});
describe('remote URL/IP boundaries',()=>{
  it.each(['http://kiwaseisakujo.jp/x','https://kiwaseisakujo.jp.evil.test/x','https://evil.test/?kiwaseisakujo.jp','https://user:pass@kiwaseisakujo.jp/x','https://kiwaseisakujo.jp:8443/x'])('rejects unsafe HTML URL %s',value=>expect(()=>validateRemoteUrl(value,'html')).toThrow());
  it('accepts only exact host or a real subdomain',()=>{expect(validateRemoteUrl(url,'html').hostname).toBe('www.kiwaseisakujo.jp');expect(()=>validateRemoteUrl('https://notkiwaseisakujo.jp/','html')).toThrow();});
  it.each(['0.0.0.0','127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','::1','fc00::1','fe80::1','::ffff:127.0.0.1','2002:7f00:1::','2001:db8::1'])('rejects nonpublic IP %s',ip=>expect(publicAddress(ip)).toBe(false));
  it('allows routable IPv4 and IPv6',()=>{expect(publicAddress('8.8.8.8')).toBe(true);expect(publicAddress('2606:4700:4700::1111')).toBe(true);});
});
