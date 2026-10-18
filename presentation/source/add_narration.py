"""Synthesize scene-aligned narration and an original, restrained audio mix."""
import asyncio
import json
import math
import subprocess
import wave
from pathlib import Path

import edge_tts
import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent
AUDIO = ROOT / 'audio'
AUDIO.mkdir(exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SR = 48000
VOICE = 'en-US-AriaNeural'
SHOTS = json.loads((ROOT / 'storyboard.json').read_text(encoding='utf8'))
TEXT = [
    'Welcome to I I U M KAMS. Your asset management workflow, in one place.',
    'Sign in with your permitted Google account. New staff accounts need administrator approval.',
    'Start with the dashboard. Review asset totals, pending approvals, and the colour coded status chart.',
    'Search Assets by tag, name, or serial number.',
    'Open a matching record to review its location, status, and history.',
    'Choose Register Asset. Scan the label, or enter the asset tag and serial number manually.',
    'Choose the department and room, set availability, then register the asset.',
    'Open Scan Asset. Use your camera, upload a label photo, or type the code.',
    'An existing code opens the matching asset record.',
    'A new code opens registration, with the code already captured.',
    'To borrow an available asset, enter the purpose and dates, then submit your request.',
    'Administrators review each request, then approve it or reject it with a reason.',
    'After approval, check out the asset and record its return.',
    'Report an incident by selecting an assigned asset, then adding when, where, and what happened.',
    'The report receives a reference for future tracking.',
    'Record the repair, parts replaced, cost, and downtime. Then select Complete work.',
    'Review the completed work and its resolution. Close the request after review.',
    'In Locations, administrators can add or edit Kulliyyahs, departments, and units.',
    'Set up the location hierarchy: campus, building, floor, and room.',
    'In Master Data, add a category or edit an existing one.',
    'Administrators approve staff accounts and manage roles, departments, and personal information.',
    'Staff can update their position, phone number, and staff I D in Profile.',
    'Open Reports to review the asset register. Export it as C S V or P D F for sharing.',
    'On mobile, common tasks stay within reach through the bottom navigation.',
    'Set up locations, register assets, and invite your team.'
]
assert len(TEXT) == len(SHOTS)

def run(args, **kwargs):
    return subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', *args], check=True, **kwargs)

def decode(path, filters=None):
    args = ['-i', str(path)]
    if filters:
        args += ['-af', filters]
    args += ['-f', 'f32le', '-ac', '1', '-ar', str(SR), '-']
    return np.frombuffer(run(args, stdout=subprocess.PIPE).stdout, dtype='<f4').copy()

async def synthesize():
    semaphore = asyncio.Semaphore(3)
    async def one(i, text):
        path = AUDIO / f'voice-{i+1:02}.mp3'
        if path.exists() and path.stat().st_size > 1000:
            return
        async with semaphore:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(text, VOICE, rate='+0%').save(str(path))
                    print(f'Voice {i+1}/{len(TEXT)} ready', flush=True)
                    return
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2)
    await asyncio.gather(*(one(i, text) for i, text in enumerate(TEXT)))

def write_wav(path, samples):
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2 if samples.ndim == 2 else 1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(samples, -.999, .999) * 32767).astype('<i2').tobytes())

def main():
    asyncio.run(synthesize())
    total = sum(s['dur'] for s in SHOTS)
    narration = np.zeros(int(total * SR), dtype=np.float32)
    records = []
    elapsed = 0
    for i, (shot, text) in enumerate(zip(SHOTS, TEXT)):
        path = AUDIO / f'voice-{i+1:02}.mp3'
        # Strip the service's padding; retain brief natural breathing space.
        signal = decode(path)
        active = np.flatnonzero(np.abs(signal) > .003)
        signal = signal[max(0, active[0]-int(.05*SR)):min(len(signal), active[-1]+int(.12*SR))]
        raw_duration = len(signal) / SR
        budget = shot['dur'] - .65
        tempo = max(1., raw_duration / budget)
        if tempo > 1.2:
            raise ValueError(f'Scene {i+1} needs shorter narration: {raw_duration:.2f}s for {budget:.2f}s')
        intermediate = AUDIO / f'trim-{i+1:02}.wav'
        write_wav(intermediate, signal)
        signal = decode(intermediate, f'atempo={tempo:.6f},loudnorm=I=-18:TP=-3:LRA=7')
        start = elapsed + .40
        offset = round(start * SR)
        assert offset + len(signal) <= round((elapsed+shot['dur']-.15)*SR), f'Voice overlap scene {i+1}'
        narration[offset:offset+len(signal)] += signal
        records.append(dict(scene=i+1, image=shot['image'], start=start, end=start+len(signal)/SR, text=text, tempo=round(tempo,3)))
        elapsed += shot['dur']
    write_wav(AUDIO / 'narration.wav', narration)
    # Quiet original harmonic bed. No third-party music or sound recordings.
    n = len(narration)
    bed = np.zeros((n,2),dtype=np.float32)
    chords = [(130.813,164.814,195.998,246.942), (110.,130.813,164.814,195.998),
              (87.307,130.813,164.814,220.), (97.999,146.832,195.998,246.942)]
    for index, start in enumerate(range(0, total, 8)):
        length = min(10, total-start)
        t = np.arange(round(length*SR),dtype=np.float32)/SR
        env = np.minimum(1,t/1.8)*np.minimum(1,(length-t)/2.8)
        for j, freq in enumerate(chords[index%4]):
            tone = (np.sin(2*np.pi*freq*t) + .15*np.sin(2*np.pi*freq*2*t)) * env * .0017
            pan = .3 + .4*j/3
            a = start*SR; b = a+len(tone)
            bed[a:b,0] += tone * math.sqrt(1-pan)
            bed[a:b,1] += tone * math.sqrt(pan)
    # Duck the bed during speech and soften the opening and ending.
    duck = np.ones(n,dtype=np.float32)
    for rec in records:
        a=max(0,round((rec['start']-.10)*SR)); b=min(n,round((rec['end']+.15)*SR))
        duck[a:b]=.45
    # Smooth ducking at 100 Hz to avoid level discontinuities.
    coarse=duck[::480]
    coarse=np.convolve(np.pad(coarse,(15,15),mode='edge'),np.ones(31)/31,mode='valid')
    duck=np.interp(np.arange(n),np.arange(len(coarse))*480,coarse).astype(np.float32)
    bed *= duck[:,None]
    effects=np.zeros_like(bed)
    def place(signal, start, level=1):
        a=round(start*SR); b=min(n,a+len(signal))
        effects[a:b,0] += signal[:b-a]*level
        effects[a:b,1] += signal[:b-a]*level
    # Chapter chimes: short, rounded tones placed before narration starts.
    for start in [0,7,23,62,104,149]:
        t=np.arange(int(.65*SR),dtype=np.float32)/SR
        env=(1-np.exp(-t*80))*np.exp(-t*8)
        chime=(np.sin(2*np.pi*659.25*t)+.45*np.sin(2*np.pi*987.77*t))*env
        place(chime,start+.07,.018)
    # Subtle interface ticks at demonstrated save, lookup, and completion actions.
    for index in [6,7,11,13,15,19,21,22]:
        shotstart=sum(s['dur'] for s in SHOTS[:index])
        t=np.arange(int(.11*SR),dtype=np.float32)/SR
        tick=np.sin(2*np.pi*(1000*t-1900*t*t))*(1-np.exp(-t*600))*np.exp(-t*55)
        place(tick,shotstart+SHOTS[index]['dur']*.78,.010)
    mix=bed+effects+narration[:,None]
    fadein=np.minimum(1,np.arange(n)/(SR*.08))
    fadeout=np.minimum(1,(n-np.arange(n))/(SR*.65))
    mix *= (fadein*fadeout)[:,None]
    write_wav(AUDIO / 'mix.wav', mix)
    target = OUT / 'IIUM-KAMS-Tutorial-English-Voiced.mp4'
    run(['-y','-i',str(OUT/'IIUM-KAMS-Tutorial-English.mp4'),'-i',str(AUDIO/'mix.wav'),
         '-map','0:v:0','-map','1:a:0','-c:v','copy','-af','loudnorm=I=-16:TP=-1.5:LRA=7',
         '-c:a','aac','-b:a','192k','-ar','48000','-t',str(total),'-movflags','+faststart',str(target)])
    (AUDIO/'voice-timing.json').write_text(json.dumps(records,indent=2),encoding='utf8')
    def stamp(s):
        return f'{int(s)//60}:{int(s)%60:02}'
    transcript=['# English voiceover script','',f'Voice: {VOICE} (synthetic English voice).',
                '','Original quiet background tones and chapter/interface sound effects.','']
    for rec in records:
        transcript += [f"## {stamp(rec['start'])} — {SHOTS[rec['scene']-1]['title']}",'',rec['text'],'']
    (OUT/'Voiceover-Script.md').write_text('\n'.join(transcript),encoding='utf8')
    print(f'Created {target} — {total}s',flush=True)

if __name__=='__main__':
    main()
