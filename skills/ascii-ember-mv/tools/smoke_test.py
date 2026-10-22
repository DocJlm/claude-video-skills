#!/usr/bin/env python3
"""Render a synthetic six-second project without songs, image APIs, or ASR models.
Run from any directory: python3 tools/smoke_test.py [new-output-directory]
"""
import json
from pathlib import Path
import subprocess
import sys
import tempfile

SKILL = Path(__file__).resolve().parents[1]
if len(sys.argv) > 1:
    project = Path(sys.argv[1]).resolve()
    project.mkdir(parents=True, exist_ok=False)
else:
    project = Path(tempfile.mkdtemp(prefix='ascii-ember-smoke-'))
(project / 'analysis').mkdir()
def write(name, value):
    (project / name).write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')
def run(args):
    subprocess.run(args, cwd=SKILL, check=True, timeout=180)

write('analysis/tempo.json', {'bpm':120, 'beat':0.5, 'offset':0, 'bar0':0, 'bar':2, 'phase':0, 'duration':6, 'beats':None})
times = [n / 4 for n in range(24)]
write('analysis/grid.json', {'e8':times, 'kick':[1 if n % 2 == 0 else 0 for n in range(24)], 'snare':[0]*24})
write('analysis/lyrics.json', [])
write('storyboard.json', {
    'title':'字符星火', 'palette':'ember', 'hud':{'prompt':'~/demo $','bl':'SMOKE TEST'},
    'assets':{'light':{'text':'光'}},
    'shots':[
        {'id':'title','type':'title','t0':0,'t1':'beat:2','subtitle':'ASCII EMBER'},
        {'id':'tunnel','type':'tunnel','t0':'beat:2','t1':'beat:6'},
        {'id':'converge','type':'converge','t0':'beat:6','t1':'beat:10','target':'light','at':'beat:9'},
        {'id':'end','type':'endCard','t0':'beat:10','t1':'end','target':'light','text':'字符星火','taglineText':'CREATE WITH CODE'}
    ]
})
# Variable-tempo references must resolve to actual beat times, not a fixed BPM grid.
run(['node','--input-type=module','-e', '''
import assert from 'node:assert/strict';
import {S,T} from './engine/core.js';
S.BEAT=.5;
S.tempo={beat:.5,offset:0,bar0:0,bar:2,phase:0,duration:6,beats:null};
assert.equal(T('bar:1'),2);
assert.equal(T('beat:3'),1.5);
S.tempo.beats=[0,.5,1.3,2.2,3.2,4.1,5.3];
assert.equal(T('beat:2'),1.3);
assert.equal(T('bar:1'),3.2);
assert.ok(Math.abs(T('beat:2.5~0.2')-1.95)<1e-9);
console.log('✓ fixed and variable tempo references');
'''])
run([sys.executable, 'tools/check_storyboard.py', str(project)])
for w,h in [(640,360),(360,640)]:
    run(['node','engine/render.mjs',str(project),'video','--w',str(w),'--h',str(h),'--fps','12','--name','smoke'])
    movie = project/'out'/f'smoke_{w}x{h}.mp4'
    data = json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,nb_frames,duration','-of','json',str(movie)]))['streams'][0]
    assert (data['width'],data['height']) == (w,h), data
    assert int(data['nb_frames']) == 72, data
    assert abs(float(data['duration'])-6)<.1, data
    run(['node','engine/render.mjs',str(project),'stills','--times','0.5,2,4.5,5.5','--w',str(w),'--h',str(h)])
    print(f'✓ {w}x{h}, 72 frames, six seconds', flush=True)
print('PASS. Synthetic outputs retained at:', project)
