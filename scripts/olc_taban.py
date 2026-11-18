# Simge yapı görsellerinin tabanını ölç: kırıntıları sil, alt kenar çizgisine RANSAC ile iki doğru oturt.
# Kullanım: python3 scripts/olc_taban.py <kontrol-görselleri-klasörü> [--yaz]
#   --yaz olmadan yalnızca kontrol sayfaları (tabanY*.png) üretir; --yaz ile görselleri temizler ve manifest’e yazar.
import json, sys, os, random
from PIL import Image, ImageDraw
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from complib import label
S = sys.argv[1]; WRITE = '--yaz' in sys.argv
M = json.load(open('assets/manifest.json')); Y = M['landmarks_iso']['yapilar']
def fitline(xs, ys, tol, it=600):
    best=None; n=len(xs); random.seed(1)
    for _ in range(it):
        i,j=random.sample(range(n),2)
        if xs[i]==xs[j]: continue
        s=(ys[j]-ys[i])/(xs[j]-xs[i])
        if not (0.25<abs(s)<1.0): continue
        c=ys[i]-s*xs[i]; inl=np.abs(ys-(s*xs+c))<tol
        # alt kenar: doğrunun altında kalan nokta az olsun (çıkıntılar üstte kalır)
        sc=inl.sum()
        if best is None or sc>best[0]: best=(sc,s,c,inl)
    _,s,c,inl=best
    A=np.vstack([xs[inl],np.ones(inl.sum())]).T; s,c=np.linalg.lstsq(A,ys[inl],rcond=None)[0]
    inl=np.abs(ys-(s*xs+c))<tol
    return s,c,inl
tiles=[]
# elle doğrulanmış eski ölçümler (uçurum, L biçimli meydan, çatı çıkıntısı: otomatik ölçüm yanılıyor)
SKIP={'Atatürk Olimpiyat Stadı','Taksim Meydanı','Rumeli Hisarı','Topkapı Sarayı'}
for n,L in Y.items():
    if WRITE and n in SKIP: continue
    im=Image.open(L['file']).convert('RGBA'); A=np.array(im)
    s4=A[::4,::4,3]>40; lab,sizes=label(s4); big=max(sizes)
    keep=np.zeros_like(s4)
    for i,sz in enumerate(sizes,1):
        if sz>=0.01*big: keep|=(lab==i)
    k2=keep.copy()
    for dy in (-1,0,1):
        for dx in (-1,0,1): k2|=np.roll(np.roll(keep,dy,0),dx,1)
    full=np.kron(k2,np.ones((4,4),bool))[:A.shape[0],:A.shape[1]]
    A[~full,3]=0
    a=A[:,:,3]>40; ys_,xs_=np.where(a); A=A[ys_.min():ys_.max()+1, xs_.min():xs_.max()+1]; a=A[:,:,3]>40
    h,w=a.shape
    cols=np.where(a.any(0))[0]
    P=np.array([np.where(a[:,x])[0].max() for x in cols],float)
    xb0=cols[int(np.argmax(P))]
    tol=max(3,h*0.012)
    # tepe noktasını bul: iki doğru, sol yarıda eğim +, sağ yarıda −
    best=None
    for frac in np.linspace(0.3,0.7,9):
        xm=xs_m=cols.min()+(cols.max()-cols.min())*frac
        Lm=cols<xm; Rm=~Lm
        if Lm.sum()<10 or Rm.sum()<10: continue
        sl,cl,il=fitline(cols[Lm].astype(float),P[Lm],tol); sr,cr,ir=fitline(cols[Rm].astype(float),P[Rm],tol)
        if sl<=0 or sr>=0: continue
        sc=il.sum()+ir.sum()
        if best is None or sc>best[0]: best=(sc,sl,cl,il,Lm,sr,cr,ir,Rm)
    sc,sl,cl,il,Lm,sr,cr,ir,Rm=best
    xbx=(cr-cl)/(sl-sr); ybx=sl*xbx+cl
    xl=cols[Lm][il].min(); xr=cols[Rm][ir].max()
    tb=[int(xl),int(round(sl*xl+cl)),int(round(xbx)),int(round(ybx)),int(xr),int(round(sr*xr+cr))]
    print(f"{n:34s} eski {L['taban']}  yeni {tb}  ({w}x{h}, iç {sc}/{len(cols)})")
    if WRITE:
        Image.fromarray(A).save(L['file'],quality=90); L['w'],L['h']=int(w),int(h); L['taban']=tb
    bg=Image.new('RGBA',(w,h),(255,0,255,255)); bg.alpha_composite(Image.fromarray(A))
    d=ImageDraw.Draw(bg); xl,yl,xb,yb,xr,yr=tb
    d.line([(xl,yl),(xb,yb),(xr,yr),(xl+xr-xb,yl+yr-yb),(xl,yl)],fill='lime',width=4)
    bg=bg.convert('RGB'); bg.thumbnail((300,300))
    t=Image.new('RGB',(300,315),'white'); t.paste(bg,(0,15)); ImageDraw.Draw(t).text((2,1),n,fill='black'); tiles.append(t)
for k in range(0,len(tiles),8):
    sh=Image.new('RGB',(1200,630),'white')
    for i,t in enumerate(tiles[k:k+8]): sh.paste(t,((i%4)*300,(i//4)*315))
    sh.save(f'{S}/tabanY{k//8}.png')
if WRITE: open('assets/manifest.json','w').write(json.dumps(M,ensure_ascii=False,indent=1)+'\n')
