import numpy as np
from collections import deque
def label(mask):
    H,W=mask.shape; lab=np.zeros((H,W),int); k=0; sizes=[]
    for y in range(H):
        for x in range(W):
            if mask[y,x] and not lab[y,x]:
                k+=1; q=deque([(y,x)]); lab[y,x]=k; n=0
                while q:
                    cy,cx=q.popleft(); n+=1
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            ny,nx=cy+dy,cx+dx
                            if 0<=ny<H and 0<=nx<W and mask[ny,nx] and not lab[ny,nx]:
                                lab[ny,nx]=k; q.append((ny,nx))
                sizes.append(n)
    return lab,sizes
