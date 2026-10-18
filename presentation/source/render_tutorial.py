"""Render the client tutorial from screenshots of an isolated demo workspace."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json, math, subprocess, sys, textwrap
import numpy as np
import imageio_ffmpeg

ROOT=Path(__file__).resolve().parent
OUT=ROOT.parent
SCREENS=ROOT/'screens'
W,H,FPS=1920,1080,24
TEAL='#19d0bd'; GOLD='#e8b842'; WHITE='#f4f9fa'; MUTED='#a4bcc4'
FONTS=Path('C:/Windows/Fonts')
def font(size,bold=False): return ImageFont.truetype(str(FONTS/('segoeuib.ttf' if bold else 'segoeui.ttf')),size)
FONT={s:font(s) for s in [18,20,22,24,26,28,30,32,36,40,44,48,52,64,72]}
BOLD={s:font(s,True) for s in [18,20,22,24,26,28,30,32,36,40,44,48,52,64,72]}

# Each shot has one clear instruction; all screenshots come from the current app.
SHOTS=[
 dict(image='dashboard',dur=7,chapter='WELCOME',title='Your asset workflow, in one place',caption='A quick walkthrough of IIUM KAMS, using a sample workspace.',steps=['Register and locate','Request and resolve','Manage and report'],intro=True),
 dict(image='login',dur=7,chapter='01  GET STARTED',title='Sign in to your workspace',caption='Use your permitted Google account. New staff accounts require administrator approval.',steps=['Open the system','Continue with Google','Use your approved account'],role='ALL USERS',full=True),
 dict(image='dashboard',dur=9,chapter='01  GET STARTED',title='Start with the dashboard',caption='Check asset totals, pending approvals, and the colour-coded asset status chart.',steps=['Review key totals','Read the status chart','Check recent requests'],role='ADMINISTRATOR'),
 dict(image='assets',dur=4,chapter='02  REGISTER & FIND',title='Find the asset you need',caption='Open Assets and search by asset tag, name, or serial number.',steps=['Open Assets','Enter an identifier','Apply the filter'],role='ADMINISTRATOR'),
 dict(image='asset-search',dur=5,chapter='02  REGISTER & FIND',title='Open a matching record',caption='Select the result to review its location, status, assignment, and history.',steps=['Review the result','Open the asset','Inspect its details'],role='ADMINISTRATOR'),
 dict(image='registration',dur=7,chapter='02  REGISTER & FIND',title='Register a new asset',caption='Choose Register Asset. Scan its label or enter the tag and serial number manually.',steps=['Capture the identifier','Enter asset details','Choose its category'],role='ADMINISTRATOR'),
 dict(image='registration-save',dur=6,chapter='02  REGISTER & FIND',title='Save a complete asset record',caption='Choose the department and room, set availability, then select Register asset.',steps=['Set ownership','Choose the location','Register the asset'],role='ADMINISTRATOR'),
 dict(image='scanner',dur=7,chapter='02  REGISTER & FIND',title='Look up assets by barcode or QR',caption='Open Scan Asset. Use the camera, upload a label photo, or type the code.',steps=['Open Scan Asset','Capture or enter a code','Look up the asset'],role='ADMINISTRATOR'),
 dict(image='scan-found',dur=5,chapter='02  REGISTER & FIND',title='Existing code? View the details',caption='A recognised asset code opens the matching asset record.',steps=['Match the identifier','Open the record','Review its details'],role='ADMINISTRATOR'),
 dict(image='scan-new',dur=5,chapter='02  REGISTER & FIND',title='New code? Start registration',caption='If the code is not recorded, the system opens registration with the code captured.',steps=['Identify a new asset','Review the captured code','Complete registration'],role='ADMINISTRATOR'),
 dict(image='borrow-request',dur=7,chapter='03  REQUEST & RESOLVE',title='Staff can request available assets',caption='Open Borrowing, explain the purpose, and choose the start and return dates.',steps=['Choose an available asset','Set purpose and dates','Request to borrow'],role='REGULAR USER'),
 dict(image='borrow-review',dur=6,chapter='03  REQUEST & RESOLVE',title='Review the borrowing request',caption='Administrators review the request and approve it, or reject it with a reason.',steps=['Review the request','Check purpose and dates','Approve or reject'],role='ADMINISTRATOR'),
 dict(image='borrow-approved',dur=5,chapter='03  REQUEST & RESOLVE',title='Track checkout and return',caption='After approval, check out the asset. Mark it returned when the borrowing ends.',steps=['Approve the request','Check out the asset','Record its return'],role='ADMINISTRATOR'),
 dict(image='incident-form',dur=7,chapter='03  REQUEST & RESOLVE',title='Report an asset incident',caption='Staff select an assigned asset, the incident type, discovery time, and location.',steps=['Choose the assigned asset','Describe what happened','Submit the incident'],role='REGULAR USER'),
 dict(image='incident-submitted',dur=4,chapter='03  REQUEST & RESOLVE',title='Keep a record of the incident',caption='The report receives a reference number and appears in the user’s incident history.',steps=['Receive a reference','Track the report','Keep the details together'],role='REGULAR USER'),
 dict(image='maintenance-work',dur=7,chapter='03  REQUEST & RESOLVE',title='Record completed maintenance',caption='Enter the resolution, parts replaced, actual cost, and downtime. Select Complete work.',steps=['Record the repair','Add cost and downtime','Complete the work'],role='ADMINISTRATOR'),
 dict(image='maintenance-completed',dur=6,chapter='03  REQUEST & RESOLVE',title='Review the completed work',caption='The request shows its resolution and completed status. Close the request after review.',steps=['Review the resolution','Confirm completion','Close the request'],role='ADMINISTRATOR'),
 dict(image='locations',dur=6,chapter='04  ADMINISTER & REPORT',title='Set up your organisation',caption='In Locations, add or edit Kulliyyahs, departments, and units.',steps=['Open Locations','Add an organisation record','Edit its name and code'],role='ADMINISTRATOR'),
 dict(image='rooms',dur=5,chapter='04  ADMINISTER & REPORT',title='Define where assets belong',caption='Build the location hierarchy: campus, building, floor, and room.',steps=['Choose the parent location','Add a room or building','Use it in asset records'],role='ADMINISTRATOR'),
 dict(image='categories',dur=6,chapter='04  ADMINISTER & REPORT',title='Maintain your asset categories',caption='Open Master Data, add a category, or select Edit beside an existing category.',steps=['Open Master Data','Add a category','Edit an existing record'],role='ADMINISTRATOR'),
 dict(image='users',dur=7,chapter='04  ADMINISTER & REPORT',title='Manage staff access and details',caption='Administrators approve accounts and manage roles, departments, and personal information.',steps=['Review new accounts','Manage role and department','Edit personal information'],role='ADMINISTRATOR'),
 dict(image='profile',dur=6,chapter='04  ADMINISTER & REPORT',title='Let staff maintain their profile',caption='Regular users can update their Position, Phone number, and Staff ID from Profile.',steps=['Open Profile','Update the permitted fields','Save personal details'],role='REGULAR USER'),
 dict(image='reports',dur=8,chapter='04  ADMINISTER & REPORT',title='Take your asset register with you',caption='Open Reports and export the asset register as CSV or PDF for review and sharing.',steps=['Open Reports','Review the register','Export CSV or PDF'],role='ADMINISTRATOR'),
 dict(image='mobile',dur=7,chapter='04  ADMINISTER & REPORT',title='Use the system on mobile',caption='The mobile view keeps common tasks in the bottom menu for quick access.',steps=['Open on your phone','Use the bottom navigation','Review assets and requests'],role='REGULAR USER',mobile=True),
 dict(image='dashboard',dur=5,chapter='READY TO BEGIN',title='Bring your assets into one workspace',caption='Set up your locations, register your assets, and invite your team.',steps=['Set up locations','Register your assets','Invite your team'],outro=True),
]
TOTAL=sum(s['dur'] for s in SHOTS)
assert TOTAL < 180,TOTAL
META=json.loads((SCREENS/'metadata.json').read_text())
IMAGES={s['image']:Image.open(SCREENS/(s['image']+'.png')).convert('RGB') for s in SHOTS}

def wrap(draw,text,f,max_width):
    lines=[];line=''
    for word in text.split():
        test=(line+' '+word).strip()
        if draw.textlength(test,font=f)>max_width and line: lines.append(line);line=word
        else: line=test
    if line:lines.append(line)
    return lines

def textblock(draw,text,xy,f,color,width,gap=8):
    x,y=xy
    for line in wrap(draw,text,f,width):
        draw.text((x,y),line,font=f,fill=color);y+=f.size+gap
    return y

yy,xx=np.mgrid[0:H,0:W]
bgarr=np.zeros((H,W,3),dtype=np.uint8)
glow=np.maximum(0,1-np.sqrt(((xx-1500)/1800)**2+((yy-100)/1300)**2))
for i,(base,amp) in enumerate([(6,7),(23,19),(31,19)]):bgarr[:,:,i]=(base+glow*amp).astype(np.uint8)
BG=Image.fromarray(bgarr)
draw=ImageDraw.Draw(BG)
for offset in range(-1000,2600,110):draw.line([(offset,0),(offset+700,H)],fill='#12303a',width=1)
draw.rectangle((0,0,12,H),fill=TEAL)

def rounded_image(frame,img,box,radius=18):
    x,y,w,h=box
    mask=Image.new('L',(w,h),0);ImageDraw.Draw(mask).rounded_rectangle((0,0,w-1,h-1),radius=radius,fill=255)
    frame.paste(img,(x,y),mask)

def cursor(draw,x,y,t):
    points=[(x,y),(x+3,y+35),(x+12,y+26),(x+20,y+42),(x+28,y+38),(x+20,y+22),(x+34,y+20)]
    draw.polygon(points,fill='white',outline='#053c3b',width=2)
    if 2.6<t<3.5:
        r=12+(t-2.6)*55
        draw.ellipse((x-r,y-r,x+r,y+r),outline=GOLD,width=3)

def render_shot(s,t,elapsed):
    frame=BG.copy();d=ImageDraw.Draw(frame)
    d.rounded_rectangle((70,38,202,75),radius=10,fill='#164a50')
    d.text((89,44),'IIUM KAMS',font=BOLD[18],fill=WHITE)
    d.text((226,44),s['chapter'],font=BOLD[20],fill=TEAL)
    d.text((1485,44),'CAPTIONED DEMO  /  SAMPLE DATA',font=FONT[18],fill=MUTED)
    titlefont=BOLD[48] if len(s['title'])<43 else BOLD[44]
    d.text((70,102),s['title'],font=titlefont,fill=WHITE)
    if s.get('intro') or s.get('outro'):
        return render_bookend(s,t,elapsed,frame)
    role=s.get('role','')
    d.rounded_rectangle((70,208,365,248),radius=10,fill='#19414a')
    d.text((87,216),role,font=BOLD[18],fill=GOLD)
    d.text((70,283),'FOLLOW THE STEPS',font=BOLD[18],fill=MUTED)
    current=min(2,int(t/s['dur']*3))
    for idx,step in enumerate(s['steps']):
        y=336+idx*149
        d.ellipse((70,y,113,y+43),fill=TEAL if idx==current else '#1d444d')
        d.text((84,y+7),str(idx+1),font=BOLD[20],fill='#092e35' if idx==current else MUTED)
        textblock(d,step,(132,y+3),BOLD[24],WHITE if idx<=current else MUTED,240,7)
        if idx<2:d.line((91,y+54,91,y+133),fill='#2a5058',width=2)
    img=IMAGES[s['image']]
    if s.get('mobile'):
        screenbox=(945,202,324,702)
        d.rounded_rectangle((930,188,1284,921),radius=45,fill='#020e15',outline='#3d6671',width=3)
        rounded_image(frame,img.resize((324,702),Image.Resampling.LANCZOS),screenbox,30)
        d=ImageDraw.Draw(frame)
        d.rounded_rectangle((964,830,1246,893),radius=12,outline=GOLD,width=4)
        textblock(d,'Common tasks,\nwithin reach'.replace('\n',' '),(1360,490),BOLD[32],WHITE,410,10)
    else:
        box=(420,207,1440,720)
        # Most scenes focus on the actual app content. Full views establish navigation.
        crop=(0,0,1600,800) if s.get('full') else (280,90,1320,660)
        if s['image'] in ['registration-save','maintenance-work','maintenance-completed','rooms','scanner','scan-new','profile','users']:crop=(280,140,1320,660)
        zoom=1+0.022*(t/s['dur'])
        cx,cy,cw,ch=crop
        dw,dh=cw/zoom,ch/zoom
        ox=cx+(cw-dw)*0.52;oy=cy+(ch-dh)*0.5
        scene=img.crop((ox,oy,ox+dw,oy+dh)).resize((box[2],box[3]),Image.Resampling.BICUBIC)
        d.rounded_rectangle((415,202,1865,932),radius=23,fill='#45616a')
        rounded_image(frame,scene,box,18)
        d=ImageDraw.Draw(frame)
        bbox=META.get(s['image'],{}).get('box')
        if bbox and t>1:
            bx=box[0]+(bbox['x']-ox)*box[2]/dw;by=box[1]+(bbox['y']-oy)*box[3]/dh
            bw=bbox['width']*box[2]/dw;bh=bbox['height']*box[3]/dh
            if bx>=box[0] and by>=box[1] and bx+bw<=box[0]+box[2] and by+bh<=box[1]+box[3]:
                pulse=int(3+math.sin(t*3)**2*2)
                d.rounded_rectangle((bx-6,by-6,bx+bw+6,by+bh+6),radius=9,outline=GOLD,width=pulse)
                targetx=bx+bw*.72;targety=by+bh*.62
                progress=min(1,max(0,(t-1)/1.5));ease=1-(1-progress)**3
                cursor(d,targetx+80*(1-ease),targety+50*(1-ease),t)
    # Fixed caption area stays readable while the screenshot moves.
    d.rounded_rectangle((60,955,1860,1041),radius=14,fill='#163640')
    lines=wrap(d,s['caption'],FONT[28],1720)
    y=965 if len(lines)>1 else 978
    for line in lines:d.text((90,y),line,font=FONT[28],fill=WHITE);y+=35
    d.rectangle((0,H-5,int(W*(elapsed+t)/TOTAL),H),fill=TEAL)
    return frame

def render_bookend(s,t,elapsed,frame):
    d=ImageDraw.Draw(frame)
    headline='From registration\nto resolution.' if not s.get('outro') else 'Ready for\nyour team.'
    y=255
    for line in headline.split('\n'):
        d.text((80,y),line,font=BOLD[72],fill=WHITE);y+=89
    desc='Asset records, staff requests,\nmaintenance, and reporting.' if not s.get('outro') else 'Set up locations. Register assets.\nInvite staff. Start working.'
    for i,line in enumerate(desc.split('\n')):d.text((84,490+i*44),line,font=FONT[30],fill=MUTED)
    for idx,label in enumerate(s['steps']):
        y=635+idx*67
        d.ellipse((85,y+2,111,y+28),fill=TEAL)
        d.text((128,y-2),label,font=BOLD[26],fill=WHITE)
    img=IMAGES['dashboard'];z=1+0.025*t/s['dur'];cw=1600/z;ch=800/z
    view=img.crop((1600-cw,0,1600,ch)).resize((1000,500),Image.Resampling.LANCZOS)
    rounded_image(frame,view,(840,300,1000,500),20)
    d=ImageDraw.Draw(frame)
    d.text((846,824),'ACTUAL SYSTEM SCREENS  •  DEMONSTRATION DATA',font=FONT[18],fill=MUTED)
    d.rounded_rectangle((70,940,1850,1030),radius=16,fill='#163640')
    footer=f'{TOTAL//60}:{TOTAL%60:02} tutorial  •  English captions  •  Administrator + user workflows' if not s.get('outro') else 'asset.kictapp.workers.dev'
    d.text((100,962),footer,font=BOLD[30],fill=TEAL if s.get('outro') else WHITE)
    d.rectangle((0,H-5,int(W*(elapsed+t)/TOTAL),H),fill=TEAL)
    return frame

def timestamp(sec):
    ms=int(round(sec*1000));return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

def main():
    OUT.mkdir(exist_ok=True)
    (ROOT/'storyboard.json').write_text(json.dumps(SHOTS,indent=2,ensure_ascii=False),encoding='utf8')
    elapsed=0;srt=[];previews=[]
    for i,s in enumerate(SHOTS):
        preview=render_shot(s,min(3,s['dur']/2),elapsed)
        preview.save(ROOT/f'preview-{i+1:02}.jpg',quality=86)
        previews.append(preview.resize((480,270)))
        srt.append(f'{i+1}\n{timestamp(elapsed)} --> {timestamp(elapsed+s["dur"])}\n{s["caption"]}\n')
        elapsed+=s['dur']
    (OUT/'IIUM-KAMS-Tutorial-English.srt').write_text('\n'.join(srt),encoding='utf8')
    sheet=Image.new('RGB',(1920,math.ceil(len(previews)/4)*300),'#e5e7eb')
    sd=ImageDraw.Draw(sheet)
    for i,p in enumerate(previews):
        x=(i%4)*480;y=(i//4)*300;sheet.paste(p,(x,y));sd.text((x+10,y+273),f'{i+1:02}  {SHOTS[i]["image"]}',font=FONT[18],fill='#0f172a')
    sheet.save(OUT/'Tutorial-Storyboard.jpg',quality=90)
    if '--preview' in sys.argv:print('Preview ready:',TOTAL,'seconds');return
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    target=OUT/'IIUM-KAMS-Tutorial-English.mp4'
    proc=subprocess.Popen([ffmpeg,'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(target)],stdin=subprocess.PIPE,stderr=(ROOT/'render.log').open('w'))
    elapsed=0
    for i,s in enumerate(SHOTS):
        print(f'Rendering {i+1}/{len(SHOTS)}: {s["image"]}',flush=True)
        for f in range(round(s['dur']*FPS)):
            t=f/FPS;frame=render_shot(s,t,elapsed)
            fade=min(1,t/.3,(s['dur']-t)/.3)
            if fade<1:frame=Image.blend(BG,frame,max(0,fade))
            proc.stdin.write(frame.tobytes())
        elapsed+=s['dur']
    proc.stdin.close();code=proc.wait()
    if code:raise RuntimeError(f'ffmpeg failed: {code}')
    print(f'Created {target} ({TOTAL}s, {target.stat().st_size/1048576:.1f} MB)',flush=True)

if __name__=='__main__':main()
