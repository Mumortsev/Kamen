from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlparse,unquote,urljoin
import json,collections
project=Path(__file__).resolve().parent.parent
root=project/'out';bad=[];counts=collections.Counter();seen=set();metadata=[]
for f in root.rglob('*.html'):
 if any(x.startswith('_') for x in f.relative_to(root).parts[:-1]):continue
 route='/Kamen/'+str(f.relative_to(root)).removesuffix('index.html');s=BeautifulSoup(f.read_text(),'html.parser');counts['pages']+=1
 ids=collections.Counter(n.get('id') for n in s.select('[id]'));dups=[i for i,n in ids.items() if n>1]
 if dups:bad.append({'page':route,'duplicateIds':dups})
 for n in s.select('[href],[src]'):
  
  if n.name=='link' and set(n.get('rel',[]))&{'preconnect','dns-prefetch'}:continue
  key='href' if n.has_attr('href') else 'src';u=n.get(key,'');parsed=urlparse(urljoin('https://example.test'+route,u))
  if parsed.netloc!='example.test' or parsed.scheme not in ['http','https']:continue
  p=unquote(parsed.path)
  if not p.startswith('/Kamen/'):bad.append({'page':route,'badBasePath':u});continue
  target=root/p[len('/Kamen/'):];target=target/'index.html' if target.is_dir() else target
  if not target.exists():bad.append({'page':route,'missing':u});continue
  if parsed.fragment and target.suffix=='.html':
   tag=(str(target),parsed.fragment)
   if tag not in seen:
    seen.add(tag);doc=s if target==f else BeautifulSoup(target.read_text(),'html.parser')
    if not doc.find(id=unquote(parsed.fragment)):bad.append({'page':route,'missingAnchor':u})
  counts['internalReferences']+=1
 metadata.append({'path':route,'title':s.title.get_text() if s.title else None,'h1':len(s.select('h1')),'canonical':s.select_one('link[rel=canonical]').get('href') if s.select_one('link[rel=canonical]') else None,'robots':s.select_one('meta[name=robots]').get('content') if s.select_one('meta[name=robots]') else None})
(project/'audit/static-crawl.json').write_text(json.dumps({'counts':dict(counts),'problems':bad,'pages':metadata},ensure_ascii=False,indent=2));print(dict(counts),'problems',len(bad));print(json.dumps(bad[:20],ensure_ascii=False))
