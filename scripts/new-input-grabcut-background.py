"""Local non-generative alpha proposals. No source RGB is returned or changed."""
import base64, hashlib, json, pathlib, sys
import cv2
import numpy as np

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def runtime():
    root=pathlib.Path(cv2.__file__).parent
    nr=pathlib.Path(np.__file__).parent
    paths=[pathlib.Path(sys.executable),pathlib.Path(__file__),*root.rglob('*.pyd'),*root.rglob('*.dll'),*nr.rglob('*.pyd')]
    libs=nr.parent/'numpy.libs'
    if libs.exists(): paths.extend(libs.rglob('*.dll'))
    paths.extend(p for p in [root/'LICENSE.txt',root/'LICENSE-3RD-PARTY.txt'] if p.exists())
    return {'python':sys.version,'executable':sys.executable,'opencv':cv2.__version__,'numpy':np.__version__,'files':{str(p.resolve()):sha(p) for p in sorted(set(paths))}}

if '--describe' in sys.argv:
    print(json.dumps(runtime(),sort_keys=True));sys.exit(0)

request=json.load(sys.stdin)
actual=runtime()
if request.get('runtime')!=actual: raise ValueError('GRABCUT_RUNTIME_CHANGED')
if request.get('iterations')!=5 or request.get('seed')!=0 or request.get('threads')!=1: raise ValueError('GRABCUT_PARAMETERS')
width,height=request['width'],request['height']
if not isinstance(width,int) or not isinstance(height,int) or not 8<=width<=4096 or not 8<=height<=4096 or width*height>16777216: raise ValueError('GRABCUT_SIZE')
raw=base64.b64decode(request['rgba'],validate=True)
if len(raw)!=width*height*4: raise ValueError('GRABCUT_BYTES')
rgba=np.frombuffer(raw,dtype=np.uint8).reshape(height,width,4)
if np.any(rgba[:,:,3]!=255): raise ValueError('GRABCUT_ALPHA_INPUT')

def polygon(value):
    if not isinstance(value,list) or len(value)<3 or any(not isinstance(p,list) or len(p)!=2 or any(type(v)!=int for v in p) or not 1<p[0]<width-2 or not 1<p[1]<height-2 for p in value): raise ValueError('GRABCUT_POLYGON')
    arr=np.zeros((height,width),np.uint8)
    cv2.fillPoly(arr,[np.asarray(value,np.int32)],1)
    return arr.astype(bool)

outer,core=polygon(request['outer']),polygon(request['core'])
background=request.get('background')
if not isinstance(background,list) or not 1<=len(background)<=16: raise ValueError('GRABCUT_BACKGROUND_REVIEW')
background_mask=np.zeros((height,width),bool)
for region in background: background_mask |= polygon(region)
if np.any(background_mask&core): raise ValueError('GRABCUT_BACKGROUND_CORE_CONFLICT')
if np.count_nonzero(background_mask)<9: raise ValueError('GRABCUT_BACKGROUND_REVIEW')
if np.any(core&~outer) or np.count_nonzero(core)<9: raise ValueError('GRABCUT_CORE')
mask=np.full((height,width),cv2.GC_BGD,np.uint8)
mask[outer]=cv2.GC_PR_FGD
mask[core]=cv2.GC_FGD
mask[background_mask]=cv2.GC_BGD
bg_count=int(np.count_nonzero((~outer)|background_mask))
if bg_count<24: raise ValueError('GRABCUT_BACKGROUND')
cv2.setNumThreads(1)
cv2.setRNGSeed(0)
model_bg=np.zeros((1,65),np.float64);model_fg=np.zeros((1,65),np.float64)
cv2.grabCut(np.ascontiguousarray(rgba[:,:,:3][:,:,::-1]),mask,None,model_bg,model_fg,5,cv2.GC_INIT_WITH_MASK)
fg=(mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD)
if np.any(fg&background_mask): raise ValueError('GRABCUT_BACKGROUND_CHANGED')
if np.any(fg&~outer) or not np.all(fg[core]): raise ValueError('GRABCUT_SEED_CHANGED')
if np.any(fg[0,:]) or np.any(fg[-1,:]) or np.any(fg[:,0]) or np.any(fg[:,-1]): raise ValueError('GRABCUT_BORDER')
area=int(np.count_nonzero(fg))
if area<width*height*.01 or area>width*height*.8: raise ValueError('GRABCUT_AREA')
interior=cv2.erode(outer.astype(np.uint8),np.ones((3,3),np.uint8)).astype(bool)
if np.any(fg&~interior): raise ValueError('GRABCUT_ROI_BOUNDARY')
components,labels=cv2.connectedComponents(fg.astype(np.uint8),connectivity=8)
if components!=2: raise ValueError('GRABCUT_MULTIPLE_COMPONENTS')
contours,_=cv2.findContours(fg.astype(np.uint8),cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
if len(contours)!=1: raise ValueError('GRABCUT_HOLES_OR_TOPOLOGY')
# Do not silently return a core polygon standing in for a missing body.
if np.count_nonzero(fg)<np.count_nonzero(core)*1.05: raise ValueError('GRABCUT_CORE_ONLY')
alpha=(fg.astype(np.uint8)*255).tobytes()
print(json.dumps({'alpha':base64.b64encode(alpha).decode('ascii'),'alphaSha256':hashlib.sha256(alpha).hexdigest(),'inputRgbaSha256':hashlib.sha256(raw).hexdigest(),'foregroundPixels':int(np.count_nonzero(fg)),'components':components-1,'holes':0,'runtimeSha256':hashlib.sha256(json.dumps(actual,sort_keys=True,separators=(',',':')).encode()).hexdigest()}))
