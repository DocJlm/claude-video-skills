#!/usr/bin/env python3
"""Validate a particle-free character film and optional particles, without song/ASR/image APIs.
Run from any directory: python3 tools/smoke_test.py [new-output-directory]
"""
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import zlib

SKILL = Path(__file__).resolve().parents[1]
root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(tempfile.mkdtemp(prefix='ascii-character-smoke-'))
if len(sys.argv) > 1:
    root.mkdir(parents=True, exist_ok=False)

def run(args, capture=False):
    return subprocess.run(args, cwd=SKILL, check=True, timeout=180, capture_output=capture, text=True)

def write(project, name, value):
    (project / name).write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')

def make_sheet(path):
    """A generated four-pose raster fixture, not production artwork."""
    width, height = 384, 576
    def near(x,y,a,b,c,d,r):
        dx,dy=c-a,d-b
        t=max(0,min(1,((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy)))
        return (x-a-t*dx)**2+(y-b-t*dy)**2 < r*r
    rows=[]
    for y in range(height):
        row=bytearray([0])
        for x in range(width):
            pose=(y//288)*2+x//192
            px,py=x%192,y%288
            head=(px-96)**2+(py-55)**2<23**2
            torso=73<px<119 and 80<py<167
            arms=near(px,py,78,94,44,136-pose*18,9) or near(px,py,114,94,148,85+pose*20,9)
            legs=near(px,py,85,165,65-pose*3,244,11) or near(px,py,108,165,130+pose*3,244,11)
            v=235 if head else 175 if torso else 210 if arms else 145 if legs else 0
            row.extend((v,v,v))
        rows.append(row)
    def chunk(kind,data):
        return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',width,height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b''))

run(['node','--input-type=module','-e','''
import assert from 'node:assert/strict';
import {S,T} from './engine/core.js';
S.BEAT=.5;
S.tempo={beat:.5,offset:0,bar0:0,bar:2,phase:0,duration:6,beats:null};
assert.equal(T('bar:1'),2); assert.equal(T('beat:3'),1.5);
S.tempo.beats=[0,.5,1.3,2.2,3.2,4.1,5.3];
assert.equal(T('beat:2'),1.3); assert.equal(T('bar:1'),3.2);
assert.ok(Math.abs(T('beat:2.5~0.2')-1.95)<1e-9);
console.log('✓ fixed and variable tempo references');
'''])

for case in ('characters','particles'):
    project=root/case
    (project/'analysis').mkdir(parents=True)
    (project/'assets').mkdir()
    write(project,'analysis/tempo.json',{'bpm':120,'beat':.5,'offset':0,'bar0':0,'bar':2,'phase':0,'duration':6,'beats':None})
    write(project,'analysis/grid.json',{'e8':[n/4 for n in range(24)],'kick':[1 if n%2==0 else 0 for n in range(24)],'snare':[0]*24})
    write(project,'analysis/lyrics.json',[])
    sb={'title':'字符人物','palette':'ember','assets':{},'shots':[]}
    if case=='characters':
        make_sheet(project/'assets/actor.png')
        sb['assets']={'hero':{'sheet':'assets/actor.png'}}
        sb['shots']=[
            {'id':'title','type':'title','t0':0,'t1':1,'subtitle':'CHARACTER MV'},
            {'id':'action','type':'figure','t0':1,'t1':3,'asset':'hero','frames':'beat','lyric':False},
            {'id':'ensemble','type':'montage','t0':3,'t1':5,'items':[['hero',0],['hero',1],['hero',2],['hero',3]],'lyric':False},
            {'id':'end','type':'code','t0':5,'t1':6,'lines':['// CHARACTER MV'],'hot':0}]
        # Both omitted and explicit-false converge settings must allow no particles.
        write(project,'storyboard.json',sb)
        assert '⚠' not in run([sys.executable,'tools/check_storyboard.py',str(project)],capture=True).stdout
        sb['converge']=False
    else:
        sb['converge']=True
        sb['assets']={'light':{'text':'光'}}
        sb['shots']=[
            {'id':'title','type':'title','t0':0,'t1':1,'subtitle':'OPTIONAL EFFECTS'},
            {'id':'tunnel','type':'tunnel','t0':1,'t1':3},
            {'id':'converge','type':'converge','t0':3,'t1':5,'target':'light','at':4.5},
            {'id':'end','type':'endCard','t0':5,'t1':6,'text':'字符人物'}]
    write(project,'storyboard.json',sb)
    result=run([sys.executable,'tools/check_storyboard.py',str(project)],capture=True)
    assert '⚠' not in result.stdout,result.stdout
    print(result.stdout,end='',flush=True)
    if case=='characters':
        sb['converge']=True
        write(project,'storyboard.json',sb)
        assert '已显式要求汇聚' in run([sys.executable,'tools/check_storyboard.py',str(project)],capture=True).stdout
        sb['converge']=False
        write(project,'storyboard.json',sb)
    for w,h in [(640,360),(360,640)]:
        run(['node','engine/render.mjs',str(project),'video','--w',str(w),'--h',str(h),'--fps','12','--name',case])
        movie=project/'out'/f'{case}_{w}x{h}.mp4'
        data=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,nb_frames,duration','-of','json',str(movie)]))['streams'][0]
        assert (data['width'],data['height'])==(w,h),data
        assert int(data['nb_frames'])==72 and abs(float(data['duration'])-6)<.1,data
        run(['node','engine/render.mjs',str(project),'stills','--times','.5,1.1,1.6,2.1,2.6,4.5,5.5','--w',str(w),'--h',str(h)])
        print(f'✓ {case}: {w}x{h}, 72 frames, six seconds',flush=True)
print('PASS. Outputs retained at:',root)
